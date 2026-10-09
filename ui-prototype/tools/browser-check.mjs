#!/usr/bin/env node
/**
 * Browser smoke check over the DevTools protocol, without any dependency.
 *
 * Loads every locale route, runs a real scan, opens the share dialog, copies a
 * terminal command, renders a review preview, and verifies that no third-party
 * request is made. Exits non-zero on the first failed expectation.
 *
 * Usage: node tools/browser-check.mjs [--port 4173] [--chrome google-chrome]
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const PORT = Number(argValue('--port', '4173'));
/** Target any deployment: `--url https://user.github.io/repo/`. */
const BASE = (argValue('--url', `http://127.0.0.1:${PORT}`)).replace(/\/$/, '');
const MOUNT_PORT = Number(argValue('--mount-port', '4199'));
const MOUNT_BASE = '/screw-claude/';
const SKIP_MOUNTED = args.includes('--no-mounted-pass');
const CHROME = argValue('--chrome', 'google-chrome');

const failures = [];
const notes = [];

function check(condition, message) {
  if (condition) {
    notes.push(`ok   ${message}`);
    return true;
  }
  failures.push(message);
  notes.push(`FAIL ${message}`);
  return false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
        else resolve(message.result);
        return;
      }
      if (message.method) this.events.push(message);
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 30_000);
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`evaluate failed: ${result.exceptionDetails.text} ${JSON.stringify(result.exceptionDetails.exception?.description ?? '')}`);
    }
    return result.result.value;
  }

  takeErrors() {
    const errors = this.events
      .filter(event => event.method === 'Runtime.exceptionThrown')
      .map(event => event.params.exceptionDetails?.exception?.description ?? event.params.exceptionDetails?.text);
    const consoleErrors = this.events
      .filter(
        event =>
          event.method === 'Runtime.consoleAPICalled' &&
          event.params.type === 'error',
      )
      .map(event => event.params.args.map(arg => arg.value ?? arg.description).join(' '));
    const logErrors = this.events
      .filter(event => event.method === 'Log.entryAdded' && event.params.entry.level === 'error')
      .map(event => event.params.entry.text);
    this.events.length = 0;
    return [...errors, ...consoleErrors, ...logErrors].filter(Boolean);
  }

  requests() {
    return this.events
      .filter(event => event.method === 'Network.requestWillBeSent')
      .map(event => event.params.request.url);
  }

  failedRequests() {
    return this.events
      .filter(
        event =>
          event.method === 'Network.loadingFailed' ||
          (event.method === 'Network.responseReceived' && event.params.response.status >= 400),
      )
      .map(event =>
        event.method === 'Network.loadingFailed'
          ? `${event.params.errorText ?? 'failed'} ${event.params.requestId}`
          : `${event.params.response.status} ${event.params.response.url}`,
      );
  }

  clearEvents() {
    this.events.length = 0;
  }
}

async function launchChrome() {
  const profile = await mkdtemp(path.join(tmpdir(), 'screw-claude-chrome-'));
  const child = spawn(
    CHROME,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--mute-audio',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const contents = await readFile(portFile, 'utf8');
      const [port] = contents.split('\n');
      if (port) return { child, profile, port: Number(port) };
    } catch {
      /* Chrome has not written the file yet. */
    }
    await sleep(100);
  }
  child.kill('SIGKILL');
  throw new Error('Chrome did not expose a debugging port');
}

async function connect(port) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find(target => target.type === 'page');
      if (page?.webSocketDebuggerUrl) {
        const socket = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          socket.addEventListener('open', resolve, { once: true });
          socket.addEventListener('error', reject, { once: true });
        });
        return new Cdp(socket);
      }
    } catch {
      /* Not ready yet. */
    }
    await sleep(100);
  }
  throw new Error('Could not connect to the DevTools target');
}

async function waitFor(cdp, expression, message, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await cdp.evaluate(expression);
    if (value) return value;
    await sleep(120);
  }
  check(false, `${message} (timed out after ${timeoutMs}ms)`);
  return null;
}

async function navigate(cdp, url, name) {
  cdp.clearEvents();
  await cdp.send('Page.navigate', { url });
  await waitFor(cdp, `document.readyState === 'complete'`, `${name}: page load`);
  await sleep(250);
  const errors = cdp.takeErrors();
  check(errors.length === 0, `${name}: no runtime or console errors${errors.length ? ` -> ${errors.join(' | ')}` : ''}`);
}

async function checkRoute(cdp, locale, pathname) {
  const name = `route ${pathname}`;
  await navigate(cdp, `${BASE}${pathname}`, name);

  const shell = await cdp.evaluate(`JSON.stringify({
    title: document.title,
    lang: document.documentElement.lang,
    signals: document.querySelectorAll('.focus-signal').length,
    start: !!document.querySelector('[data-action="start"]'),
    variant: document.body.dataset.variant,
    brand: document.querySelector('.brand') ? document.querySelector('.brand').textContent.trim() : '',
  })`);
  const info = JSON.parse(shell);
  check(info.variant === 'C', `${name}: the Focus presentation is mounted`);
  check(info.signals === 9, `${name}: nine observations rendered (got ${info.signals})`);
  check(info.start, `${name}: a start action is present`);
  check(info.lang === (locale === 'zh' ? 'zh-CN' : locale), `${name}: document language is ${info.lang}`);
  check(info.title.length > 0, `${name}: localized title is set`);

  // The scan starts only on request.
  const beforeStart = await cdp.evaluate(`!!document.querySelector('.focus-result')`);
  check(beforeStart === false, `${name}: no result before the visitor asks`);

  await cdp.evaluate(`document.querySelector('[data-action="start"]').click()`);
  const running = await waitFor(cdp, `!!document.querySelector('.focus-running')`, `${name}: progress appears`, 3000);
  check(!!running, `${name}: progress is shown while checks run`);

  const done = await waitFor(cdp, `!!document.querySelector('.focus-result')`, `${name}: result appears`);
  if (!done) return;

  const result = JSON.parse(
    await cdp.evaluate(`JSON.stringify({
      score: Number(document.querySelector('.focus-result-score strong').textContent),
      band: document.querySelector('.focus-band-label').textContent.trim(),
      contributions: [...document.querySelectorAll('.focus-signal-points strong')].map(node => Number(node.textContent.replace('+', ''))),
      matched: document.querySelectorAll('.focus-signal.is-matched').length,
      matchSummary: document.querySelector('.focus-match-summary')?.textContent?.trim() ?? '',
      duplicateSection: document.querySelectorAll('#findings').length,
      matchedPoints: [...document.querySelectorAll('.focus-signal.is-matched .focus-signal-points strong')].map(node => Number(node.textContent.replace(/[^0-9]/g, ''))),
      observations: [...document.querySelectorAll('.focus-signal-value')].map(node => node.textContent.trim()),
      reviewControls: !!document.querySelector('.focus-state-controls'),
    })`),
  );
  check(Number.isInteger(result.score) && result.score >= 0 && result.score <= 100, `${name}: score is an integer in 0..100 (${result.score})`);
  check(result.contributions.length === 9, `${name}: every check reports its contribution`);
  const sum = result.contributions.reduce((total, value) => total + value, 0);
  check(sum === result.score, `${name}: score equals the sum of contributions (${sum} vs ${result.score})`);
  // One list only: matched rows are marked inside the full breakdown.
  check(result.duplicateSection === 0, `${name}: no separate matched-findings section`);
  check(result.matched >= 1, `${name}: at least one matched row is marked`);
  check(result.matched === result.matchedPoints.length, `${name}: every matched row shows its points`);
  check(
    result.matchedPoints.every(points => points > 0),
    `${name}: matched rows contributed points (${result.matchedPoints.join(', ')})`,
  );
  check(/\(\d+\)|\d+/.test(result.matchSummary), `${name}: the score panel counts matched checks`);
  check(result.observations.every(Boolean), `${name}: every observation has a value`);
  check(result.reviewControls === false, `${name}: no review controls outside review mode`);
  check(/^\d+$/.test(String(result.score)), `${name}: numeric score rendered`);

  // Sharing stays on the device until the visitor copies or opens a destination.
  await cdp.evaluate(`document.querySelector('[data-action="share"]').click()`);
  await waitFor(cdp, `document.getElementById('share-dialog')?.open === true`, `${name}: share dialog opens`, 3000);
  const links = JSON.parse(
    await cdp.evaluate(`JSON.stringify([...document.querySelectorAll('[data-share-target]')].map(node => node.href))`),
  );
  check(links.length === 4, `${name}: four social destinations are offered`);
  check(
    links.every(url => url.startsWith('https://')),
    `${name}: social links use HTTPS`,
  );
  check(
    links[0].includes('twitter.com/intent/tweet') &&
      links[1].includes('facebook.com/sharer/sharer.php') &&
      links[2].includes('t.me/share/url') &&
      links[3].includes('service.weibo.com/share/share.php'),
    `${name}: share link bases are correct`,
  );
  // Works against localhost and against a deployed origin: the share payload
  // must carry the page's own root URL.
  const pageRoot = await cdp.evaluate(`document.querySelector('.brand').href`);
  check(
    links.every(url => url.includes(encodeURIComponent(pageRoot)) || decodeURIComponent(url).includes(pageRoot)),
    `${name}: share links carry the page URL (${pageRoot})`,
  );

  const copied = await cdp.evaluate(`(async () => {
    const button = document.querySelector('.focus-save');
    return { disabled: button.disabled, copyButtons: document.querySelectorAll('[data-copy-platform]').length };
  })()`);
  check(copied.copyButtons === 3, `${name}: three copy platforms are offered`);
  check(copied.disabled === false, `${name}: the image action is enabled for a result`);

  // The card is rendered locally as a 1200x630 PNG; its text needs the same
  // bundled subset the page uses.
  await waitFor(cdp, `!!document.querySelector('.focus-share-image')`, `${name}: card preview appears`, 4000);
  const card = await cdp.evaluate(`(async () => {
    const image = document.querySelector('.focus-share-image');
    if (!image) return { present: false };
    if (!image.complete) {
      await new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }
    await document.fonts.ready;
    const missing = new Set();
    for (const character of (document.querySelector('.focus-share-preview')?.textContent ?? '')) {
      if (/[\u2e80-\u9fff\u3000-\u303f\uff00-\uffef\u2014\u2026]/.test(character)
        && !document.fonts.check('30px "Taste CJK"', character)) {
        missing.add(character);
      }
    }
    return { present: true, width: image.naturalWidth, height: image.naturalHeight, missing: [...missing].join('') };
  })()`);
  check(card.present, `${name}: the generated card image is shown`);
  check(card.width === 1200, `${name}: the card is 1200px wide (got ${card.width})`);
  check(card.height === 630, `${name}: the card is 630px tall (got ${card.height})`);
  check(
    !card.missing,
    `${name}: card text is covered by the bundled CJK subset${card.missing ? ` (missing: ${card.missing})` : ''}`,
  );

  await cdp.evaluate(`document.querySelector('[data-action="close"]').click()`);
  await waitFor(cdp, `document.getElementById('share-dialog')?.open === false`, `${name}: share dialog closes`, 3000);

  // Terminal copy path (clipboard may be denied in a headless browser).
  const copyFeedback = await cdp.evaluate(`(async () => {
    const button = document.querySelector('[data-copy-command]');
    button.click();
    await new Promise(resolve => setTimeout(resolve, 400));
    return { feedback: button.dataset.copyFeedback ?? '', status: document.getElementById('copy-status')?.textContent ?? '' };
  })()`);
  check(
    ['success', 'failure'].includes(copyFeedback.feedback),
    `${name}: the command copy path reports an outcome (${copyFeedback.feedback || 'none'})`,
  );

  // A browser can report one voice entry per installed voice, so the row must
  // keep only the tags that scored and collapse the rest.
  const collapse = JSON.parse(
    await cdp.evaluate(`JSON.stringify((() => {
      const row = document.querySelector('[data-signal="speechVoices"]');
      const spoiler = row?.querySelector('.focus-spoiler');
      const list = spoiler?.querySelector('.focus-spoiler-list')?.textContent ?? '';
      const inline = row?.querySelector('.focus-signal-value > code')?.textContent ?? '';
      return {
        present: !!row,
        hasSpoiler: !!spoiler,
        open: spoiler?.hasAttribute('open') ?? false,
        label: spoiler?.querySelector('summary')?.textContent ?? '',
        hidden: list ? list.split(', ').length : 0,
        inlineTags: inline ? inline.split(', ').length : 0,
      };
    })())`),
  );
  check(collapse.present, `${name}: the voice observation is rendered`);
  check(!collapse.hasSpoiler || !collapse.open, `${name}: the voice spoiler starts closed`);
  check(
    !collapse.hasSpoiler || collapse.inlineTags <= 8,
    `${name}: the voice row stays short (${collapse.inlineTags} inline tags)`,
  );
  check(
    !collapse.hasSpoiler || collapse.label === `and ${collapse.hidden} others`,
    `${name}: the spoiler label counts the hidden tags (${collapse.label})`,
  );

  const errors = cdp.takeErrors();
  check(errors.length === 0, `${name}: no errors during the scan${errors.length ? ` -> ${errors.join(' | ')}` : ''}`);

  // The app ships its own CJK subset, so every CJK glyph it renders must be
  // inside that subset: a missing glyph is an unreadable box on machines
  // without system CJK fonts.
  const missingGlyphs = await cdp.evaluate(`(async () => {
    await document.fonts.ready;
    await document.fonts.load('16px "Taste CJK"', '汉').catch(() => undefined);
    const missing = new Set();
    for (const character of document.body.innerText) {
      if (/[\u2e80-\u9fff\u3000-\u303f\uff00-\uffef\u00b1\u00d7\u2248\u2192\u2014\u00b7\u2026]/.test(character)
        && !document.fonts.check('16px "Taste CJK"', character)) {
        missing.add(character);
      }
    }
    return [...missing].join('');
  })()`);
  check(
    missingGlyphs.length === 0,
    `${name}: the bundled CJK subset covers every rendered character${missingGlyphs ? ` (missing: ${missingGlyphs})` : ''}`,
  );

  const requests = cdp.requests();
  const external = requests.filter(url => !url.startsWith(BASE) && !url.startsWith('data:'));
  check(external.length === 0, `${name}: no third-party requests${external.length ? ` -> ${external.join(', ')}` : ''}`);
  const scanPayloads = requests.filter(url => /score|result|observed|font|\?/.test(url) && url.includes('?'));
  check(
    scanPayloads.every(url => !url.includes('score=') && !url.includes('result=')),
    `${name}: no result data appears in requests`,
  );
}

async function checkReviewPreview(cdp, pathname) {
  const name = `review ${pathname}`;
  await navigate(cdp, `${BASE}${pathname}`, name);
  const preview = JSON.parse(
    await cdp.evaluate(`JSON.stringify({
      notice: !!document.querySelector('.focus-sample-notice'),
      controls: !!document.querySelector('.focus-state-controls'),
      score: document.querySelector('.focus-result-score strong')?.textContent ?? '',
      matched: document.querySelectorAll('.focus-signal.is-matched').length,
    })`),
  );
  check(preview.notice, `${name}: the sample notice is shown`);
  check(preview.controls, `${name}: review controls are available`);
  check(/^\d+$/.test(preview.score), `${name}: a preview score is rendered (${preview.score})`);
  check(preview.matched >= 1, `${name}: preview matched rows are marked`);

  const cycles = await cdp.evaluate(`(async () => {
    const seen = [];
    for (let step = 0; step < 7; step += 1) {
      document.querySelector('[data-review="next"]').click();
      await new Promise(resolve => setTimeout(resolve, 120));
      seen.push(document.querySelector('.focus-state-label')?.textContent ?? '');
    }
    return seen;
  })()`);
  check(new Set(cycles).size >= 6, `${name}: the state control cycles through preview states`);

  const errors = cdp.takeErrors();
  check(errors.length === 0, `${name}: no errors while previewing${errors.length ? ` -> ${errors.join(' | ')}` : ''}`);
}

/**
 * The app reads the user agent, so a UA override exercises the real detectors,
 * weights and profile selection for every family the plan lists. One engine
 * still renders for all of them; engine-specific differences are out of scope.
 */
const USER_AGENT_MATRIX = [
  {
    name: 'Chrome on Linux',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    platform: 'Linux x86_64',
    browser: null,
    device: null,
  },
  {
    name: 'Chrome on Windows',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    platform: 'Win32',
    browser: null,
    device: null,
  },
  {
    name: 'Edge on Windows',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
    platform: 'Win32',
    browser: { label: 'edge', region: null, contribution: 0 },
    device: null,
  },
  {
    name: 'Firefox on Windows',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0',
    platform: 'Win32',
    browser: { label: 'firefox', region: null, contribution: 0 },
    device: null,
  },
  {
    name: 'Safari on macOS',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    platform: 'MacIntel',
    browser: { label: 'safari', region: null, contribution: 0 },
    device: null,
  },
  {
    name: 'Safari on iPhone',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
    browser: { label: 'safari', region: null, contribution: 0 },
    device: { label: 'iPhone', region: null, contribution: 0 },
  },
  {
    name: 'Chrome on Android',
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
    browser: { label: 'chrome', region: null, contribution: 0 },
    device: null,
  },
  {
    name: 'WeChat on iPhone',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49 NetType/WIFI Language/zh_CN',
    platform: 'iPhone',
    browser: { label: 'wechat', region: 'cn', contribution: 7 },
    device: { label: 'iPhone', region: null, contribution: 0 },
  },
  {
    name: 'Yandex on Huawei',
    userAgent:
      'Mozilla/5.0 (Linux; Android 10; HUAWEI VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 YaBrowser/25.8.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
    browser: { label: 'yandex', region: 'ru', contribution: 7 },
    device: { label: 'huaweiHonor', region: 'cn', contribution: 7 },
  },
  {
    name: 'Mi Browser on Xiaomi',
    userAgent:
      'Mozilla/5.0 (Linux; Android 12; MI 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 MiuiBrowser/17.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
    browser: { label: 'miBrowser', region: 'cn', contribution: 6 },
    device: { label: 'xiaomi', region: 'cn', contribution: 6 },
  },
];

async function checkUserAgents(cdp) {
  for (const entry of USER_AGENT_MATRIX) {
    const name = `user agent ${entry.name}`;
    await cdp.send('Emulation.setUserAgentOverride', {
      userAgent: entry.userAgent,
      platform: entry.platform,
      // The app reads `navigator.userAgentData.platform` first, so the override
      // must reach the client hints as well as `navigator.platform`.
      userAgentMetadata: {
        platform: entry.platform,
        platformVersion: '',
        architecture: '',
        model: '',
        mobile: /Mobile|iPhone|Android/.test(entry.userAgent),
        brands: [{ brand: 'Chromium', version: '141' }],
      },
    });
    await navigate(cdp, `${BASE}/?review=0`, name);
    await cdp.evaluate(`document.querySelector('[data-action="start"]').click()`);
    const ready = await waitFor(cdp, `!!window.ScrewClaude?.getState()?.result`, `${name}: scan completes`);
    if (!ready) continue;

    const result = JSON.parse(
      await cdp.evaluate(`JSON.stringify(window.ScrewClaude.getState().result)`),
    );
    const signalOf = id => result.signals.find(signal => signal.id === id);
    const sum = result.signals.reduce((total, signal) => total + signal.contribution, 0);
    check(sum === result.total, `${name}: contributions still sum to the score`);

    const browser = signalOf('browserVendor');
    const expectedBrowser = entry.browser ?? { label: 'chrome', region: null, contribution: 0 };
    check(
      browser.details?.browserLabel === expectedBrowser.label,
      `${name}: browser family is ${expectedBrowser.label} (got ${browser.details?.browserLabel})`,
    );
    check(
      browser.contribution === expectedBrowser.contribution,
      `${name}: browser family contributes ${expectedBrowser.contribution} (got ${browser.contribution})`,
    );
    check(
      browser.region === expectedBrowser.region,
      `${name}: browser profile is ${expectedBrowser.region ?? 'none'} (got ${browser.region ?? 'none'})`,
    );

    const device = signalOf('deviceBrand');
    const expectedDevice = entry.device ?? { label: entry.platform, region: null, contribution: 0 };
    check(
      device.details?.deviceLabel === expectedDevice.label,
      `${name}: device family is ${expectedDevice.label} (got ${device.details?.deviceLabel})`,
    );
    check(
      device.contribution === expectedDevice.contribution,
      `${name}: device family contributes ${expectedDevice.contribution} (got ${device.contribution})`,
    );
    check(
      device.region === expectedDevice.region,
      `${name}: device profile is ${expectedDevice.region ?? 'none'} (got ${device.region ?? 'none'})`,
    );

    const errors = cdp.takeErrors();
    check(errors.length === 0, `${name}: no errors${errors.length ? ` -> ${errors.join(' | ')}` : ''}`);
  }
  // Reset to the browser's own values; metadata overrides do not survive here.
  await cdp.send('Emulation.setUserAgentOverride', { userAgent: '', platform: '' });
}

/** Static hosting artifacts must be served next to the pages. */
async function checkHostingArtifacts() {
  const expectations = [
    ['/sitemap.xml', 'xml', 'application/xml'],
    ['/robots.txt', 'text/plain', 'text/plain'],
    ['/site.webmanifest', 'json', 'application/manifest+json'],
    ['/assets/social-preview.svg', 'svg', 'image/svg+xml'],
    ['/assets/icon.svg', 'svg', 'image/svg+xml'],
  ];
  for (const [pathname, kind, expectedType] of expectations) {
    const response = await fetch(`${BASE}${pathname}`);
    const body = await response.text();
    check(response.status === 200, `${pathname}: served with HTTP 200`);
    const contentType = response.headers.get('content-type') ?? '';
    check(
      contentType.includes(expectedType.split('/')[1].split('+')[0]) || contentType.includes(expectedType),
      `${pathname}: content type is ${contentType || 'missing'}`,
    );
    if (kind === 'json') {
      const manifest = JSON.parse(body);
      // Relative values keep the manifest valid at any mount point.
      check(manifest.start_url === './', `${pathname}: declares a mount-relative start URL`);
      check(!/^https?:/.test(manifest.start_url), `${pathname}: the start URL is not absolute`);
      check(
        manifest.icons?.some(icon => icon.purpose === 'maskable'),
        `${pathname}: declares a maskable icon`,
      );
    }
    if (kind === 'xml') {
      check(body.includes('<urlset'), `${pathname}: is a sitemap`);
      check(body.includes('/zh/') && body.includes('/ru/'), `${pathname}: lists both locale routes`);
    }
    if (kind === 'svg') {
      check(body.trimStart().startsWith('<svg'), `${pathname}: is an SVG document`);
    }
  }

  const notFound = await fetch(`${BASE}/does-not-exist`);
  check(notFound.status === 404 || notFound.status === 200, 'unknown paths answer without a hang');
}

async function checkNarrowLayout(cdp) {
  const name = 'narrow layout';
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await navigate(cdp, `${BASE}/`, name);
  await cdp.evaluate(`document.querySelector('[data-action="start"]').click()`);
  await waitFor(cdp, `!!document.querySelector('.focus-result')`, `${name}: result on a narrow screen`);
  const overflow = await cdp.evaluate(
    `document.documentElement.scrollWidth - window.innerWidth`,
  );
  check(overflow <= 1, `${name}: no horizontal overflow (${overflow}px)`);
  const tapTargets = await cdp.evaluate(
    `[...document.querySelectorAll('.focus-start, .focus-copy-button, .focus-share-platforms .button')].every(node => {
      const height = node.getBoundingClientRect().height;
      // Controls inside a closed dialog are not laid out at all.
      return height === 0 || height >= 32;
    })`,
  );
  check(tapTargets, `${name}: interactive controls keep a usable height`);
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  const errors = cdp.takeErrors();
  check(errors.length === 0, `${name}: no errors on a narrow screen${errors.length ? ` -> ${errors.join(' | ')}` : ''}`);
}

/**
 * Serve the built site under a project subdirectory, exactly like GitHub Pages
 * does for a project page, so the mount-relative URLs are verified for real.
 */
const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.png': 'image/png',
};

async function startMountedServer() {
  const siteRoot = path.join(import.meta.dirname, '..');
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
    if (!pathname.startsWith(MOUNT_BASE)) {
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('outside the mount point');
      return;
    }
    const relative = pathname.slice(MOUNT_BASE.length);
    const candidates =
      relative === '' || relative.endsWith('/')
        ? [`${relative}index.html`]
        : [relative, `${relative}/index.html`];
    for (const candidate of candidates) {
      const file = path.join(siteRoot, candidate);
      try {
        const info = await stat(file);
        if (!info.isFile()) continue;
        response.writeHead(200, {
          'content-type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream',
        });
        response.end(await readFile(file));
        return;
      } catch {
        /* Try the next candidate. */
      }
    }
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('not found');
  });
  await new Promise(resolve => server.listen(MOUNT_PORT, '127.0.0.1', resolve));
  return { server, origin: `http://127.0.0.1:${MOUNT_PORT}${MOUNT_BASE}` };
}

/** Verify the site under a project subdirectory, the GitHub Pages layout. */
async function checkMountedSite(cdp) {
  const { server, origin } = await startMountedServer();
  try {
    for (const [locale, route] of [['en', ''], ['zh', 'zh/'], ['ru', 'ru/']]) {
      const name = `mounted ${MOUNT_BASE}${route || ''}`;
      await navigate(cdp, `${origin}${route}`, name);

      const shell = JSON.parse(
        await cdp.evaluate(`JSON.stringify({
          signals: document.querySelectorAll('.focus-signal').length,
          variant: document.body.dataset.variant,
          root: window.ScrewClaude?.getState ? document.querySelector('.brand')?.getAttribute('href') : '',
          languages: [...document.querySelectorAll('.languages a')].map(a => a.getAttribute('href')),
          sprite: document.querySelector('svg use')?.getAttribute('href') ?? '',
          font: document.fonts.check('16px "Taste CJK"'),
        })`),
      );
      check(shell.variant === 'C', `${name}: the live presentation mounts under a subdirectory`);
      check(shell.signals === 9, `${name}: nine observations render (got ${shell.signals})`);
      check(
        shell.languages.every(href => href.startsWith(MOUNT_BASE)),
        `${name}: language links keep the mount point (${shell.languages.join(' ')})`,
      );
      check(shell.sprite.startsWith(MOUNT_BASE), `${name}: sprite references keep the mount point (${shell.sprite})`);
      check(shell.font, `${name}: the bundled CJK subset still loads`);

      await cdp.evaluate(`document.querySelector('[data-action="start"]').click()`);
      const done = await waitFor(cdp, `!!window.ScrewClaude?.getState()?.result`, `${name}: scan completes`);
      if (!done) continue;

      const result = JSON.parse(await cdp.evaluate(`JSON.stringify(window.ScrewClaude.getState().result)`));
      const sum = result.signals.reduce((total, signal) => total + signal.contribution, 0);
      check(sum === result.total, `${name}: the score is the sum of contributions (${result.total})`);
      check(result.signals.length === 9, `${name}: all nine checks reported`);

      const summary = await cdp.evaluate(`window.ScrewClaude.getState().result ? document.querySelector('[data-action="share"]') !== null : false`);
      check(summary, `${name}: sharing is offered after a scan`);

      const link = JSON.parse(
        await cdp.evaluate(`JSON.stringify([...document.querySelectorAll('.languages a')].map(a => a.href))`),
      );
      check(
        link.every(href => href.includes(MOUNT_BASE)),
        `${name}: resolved language links include the mount point`,
      );

      const metadata = JSON.parse(
        await cdp.evaluate(`JSON.stringify({
          canonical: document.querySelector('link[rel="canonical"]')?.href ?? '',
          manifest: document.querySelector('link[rel="manifest"]')?.href ?? '',
          ogImage: document.querySelector('meta[property="og:image"]')?.content ?? '',
        })`),
      );
      check(
        metadata.canonical.includes('/screw-claude/') && metadata.ogImage.includes('/screw-claude/assets/'),
        `${name}: metadata uses the configured mount point`,
      );
      check(metadata.manifest.includes(MOUNT_BASE), `${name}: the manifest resolves under the mount point`);

      const failed = cdp.failedRequests();
      check(failed.length === 0, `${name}: every asset loads${failed.length ? ` -> ${failed.join(', ')}` : ''}`);
      const errors = cdp.takeErrors();
      check(errors.length === 0, `${name}: no errors${errors.length ? ` -> ${errors.join(' | ')}` : ''}`);
      void locale;
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function main() {
  const { child, profile, port } = await launchChrome();
  let cdp;
  try {
    cdp = await connect(port);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Network.enable');

    for (const [locale, pathname] of [['en', '/'], ['zh', '/zh/'], ['ru', '/ru/']]) {
      await checkRoute(cdp, locale, pathname);
    }
    await checkReviewPreview(cdp, '/?review=1&state=high');
    await checkReviewPreview(cdp, '/zh/?review=1&state=partial');
    await checkUserAgents(cdp);
    await checkHostingArtifacts();
    await checkNarrowLayout(cdp);
    if (!SKIP_MOUNTED) await checkMountedSite(cdp);
  } finally {
    try {
      cdp?.socket.close();
    } catch {
      /* ignore */
    }
    child.kill('SIGKILL');
    await new Promise(resolve => child.once('exit', resolve));
    try {
      await rm(profile, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      /* A leftover temporary profile is harmless. */
    }
  }

  console.log(notes.join('\n'));
  if (failures.length > 0) {
    console.error(`\n${failures.length} browser check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${notes.length} browser checks passed`);
}

await main();
