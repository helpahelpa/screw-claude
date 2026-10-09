/* Sharing: summary text, social links, clipboard, PNG generation and delivery. */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RULES } from '../src/core/rules.ts';
import { runScan } from '../src/scan/controller.ts';
import { LOCALES, dictionary } from '../src/content/locales.ts';
import { SOCIAL_TARGETS, buildSocialLink, buildSocialLinks } from '../src/sharing/links.ts';
import { buildNativeSharePayload, buildPlatformText, buildSummary, matchedNames } from '../src/sharing/text.ts';
import { canUseNativeShare, copyText } from '../src/sharing/clipboard.ts';
import {
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
  ResultImageError,
  buildImageContent,
  createImageCache,
  createResultPng,
  deliverResultImage,
} from '../src/sharing/image.ts';
import { createDownloader } from '../src/browser/download.ts';
import { CHINA_ENVIRONMENT, fakeSource } from './fixtures.ts';

const URL_EN = 'https://screw-claude.example/';

async function chinaResult() {
  const result = await runScan({ source: fakeSource(CHINA_ENVIRONMENT) });
  assert.ok(result);
  return result;
}

class FakeBlob {
  readonly size: number;
  readonly type: string;
  constructor(parts: unknown[], type = 'image/png') {
    this.size = String(parts.join('')).length;
    this.type = type;
  }
}

describe('share summary', () => {
  it('carries the score, the band and the matched names', async () => {
    const result = await chinaResult();
    const summary = buildSummary({ result, locale: 'en', url: URL_EN });
    assert.equal(summary.score, 76);
    assert.equal(summary.band, 'high');
    assert.equal(summary.bandLabel, LOCALES.en.bandHigh);
    assert.deepEqual(summary.matched, matchedNames(result, LOCALES.en));
    assert.ok(summary.body.includes('76'));
    assert.equal(summary.text, `${summary.body}\n${URL_EN}`);
    assert.ok(summary.body.includes(LOCALES.en.signalNames[0]));
  });

  it('handles a result with no matches', () => {
    const summary = buildSummary({
      result: {
        rulesVersion: RULES.version,
        completedAt: '2026-02-03T04:05:06.000Z',
        total: 0,
        band: 'low',
        partial: false,
        signals: [],
        hits: [],
        matchedRegions: [],
      },
      locale: 'en',
      url: URL_EN,
    });
    assert.deepEqual(summary.matched, []);
    assert.equal(summary.body.includes('{'), false);
  });

  it('omits every raw observation and platform string', async () => {
    const result = await chinaResult();
    const summary = buildSummary({ result, locale: 'en', url: URL_EN });
    const forbidden = ['Mozilla', 'Win32', 'Asia/Shanghai', 'Microsoft YaHei', 'zh-CN', 'ru-ru'];
    for (const value of forbidden) {
      assert.equal(summary.text.includes(value), false, `summary leaked ${value}`);
    }
  });

  it('adds platform hashtags for copy destinations', async () => {
    const result = await chinaResult();
    for (const locale of ['en', 'zh', 'ru'] as const) {
      const summary = buildSummary({ result, locale, url: URL_EN });
      for (const platform of ['red', 'douyin', 'jike'] as const) {
        const text = buildPlatformText(summary, platform, { locale });
        const hashtags = dictionary(locale).hashtags[platform];
        for (const tag of hashtags) {
          assert.ok(text.includes(tag), `${locale}/${platform} missing ${tag}`);
        }
        assert.ok(text.includes(summary.url));
      }
    }
  });

  it('builds a native share payload with the localized title', async () => {
    const result = await chinaResult();
    for (const locale of ['en', 'zh', 'ru'] as const) {
      const summary = buildSummary({ result, locale, url: URL_EN });
      const payload = buildNativeSharePayload(summary, { locale });
      assert.equal(payload.title, dictionary(locale).title);
      assert.equal(payload.text, summary.body);
      assert.equal(payload.url, URL_EN);
    }
  });
});

describe('social links', () => {
  it('offers four destinations in a stable order', async () => {
    const result = await chinaResult();
    const summary = buildSummary({ result, locale: 'en', url: URL_EN });
    const links = buildSocialLinks(summary);
    assert.deepEqual(links.map(link => link.target), SOCIAL_TARGETS);
    assert.deepEqual(links.map(link => link.target), ['x', 'facebook', 'telegram', 'weibo']);
  });

  it('uses each destination base and encodes the payload', async () => {
    const result = await chinaResult();
    const summary = buildSummary({ result, locale: 'zh', url: URL_EN });
    const links = new Map(buildSocialLinks(summary).map(link => [link.target, link.url]));

    assert.ok(links.get('x')?.startsWith('https://twitter.com/intent/tweet?'));
    assert.ok(links.get('facebook')?.startsWith('https://www.facebook.com/sharer/sharer.php?'));
    assert.ok(links.get('telegram')?.startsWith('https://t.me/share/url?'));
    assert.ok(links.get('weibo')?.startsWith('https://service.weibo.com/share/share.php?'));

    for (const url of links.values()) {
      const params = new URL(url).searchParams;
      const text = params.get('text') ?? params.get('title') ?? params.get('quote');
      assert.equal(text, summary.body, `payload mismatch in ${url}`);
      assert.equal(params.get('url') ?? params.get('u'), URL_EN);
    }
  });

  it('round-trips Chinese copy through percent encoding', async () => {
    const result = await chinaResult();
    const summary = buildSummary({ result, locale: 'zh', url: 'https://screw-claude.example/zh/' });
    const url = buildSocialLink('x', summary);
    const decoded = new URL(url).searchParams.get('text');
    assert.equal(decoded, summary.body);
    assert.match(url, /%E[0-9A-F]/i);
    assert.ok(summary.body.includes('76'));
  });

  it('rejects an unknown destination instead of guessing', async () => {
    const result = await chinaResult();
    const summary = buildSummary({ result, locale: 'en', url: URL_EN });
    assert.throws(() => buildSocialLink('mastodon' as 'x', summary), /Unknown share target/);
  });
});

describe('clipboard', () => {
  it('uses the asynchronous clipboard API first', async () => {
    let written = '';
    const outcome = await copyText('dig', {
      clipboard: {
        writeText: async text => {
          written = text;
        },
      },
    });
    assert.equal(outcome, 'success');
    assert.equal(written, 'dig');
  });

  it('falls back to a temporary textarea when the API is denied', async () => {
    const calls: string[] = [];
    const outcome = await copyText('dig +short api.anthropic.com', {
      clipboard: {
        writeText: async () => {
          throw new Error('NotAllowedError');
        },
      },
      createTextArea: () => {
        calls.push('create');
        return {
          value: '',
          setAttribute() {},
          select() {
            calls.push('select');
          },
          remove() {
            calls.push('remove');
          },
        };
      },
      execCommand: () => true,
    });
    assert.equal(outcome, 'success');
    assert.deepEqual(calls, ['create', 'select', 'remove']);
  });

  it('reports a failure when both paths are refused', async () => {
    const outcome = await copyText('dig', {
      clipboard: { writeText: async () => Promise.reject(new Error('denied')) },
      createTextArea: () => ({ value: '', select() {}, remove() {} }),
      execCommand: () => false,
    });
    assert.equal(outcome, 'failure');
  });

  it('reports unsupported browsers without throwing', async () => {
    assert.equal(await copyText('dig', {}), 'unsupported');
    assert.equal(await copyText('dig', { execCommand: () => false }), 'unsupported');
  });

  it('reports a failure when the textarea cannot be created', async () => {
    const outcome = await copyText('dig', { createTextArea: () => null, execCommand: () => true });
    assert.equal(outcome, 'failure');
  });

  it('removes the temporary element even when the copy throws', async () => {
    let removed = false;
    const outcome = await copyText('dig', {
      createTextArea: () => ({
        set value(_value: string) {
          throw new Error('boom');
        },
        get value(): string {
          return '';
        },
        select() {},
        remove() {
          removed = true;
        },
      }),
      execCommand: () => true,
    });
    assert.equal(outcome, 'failure');
    assert.equal(removed, true);
  });

  it('offers native sharing only when the device has a share sheet', () => {
    assert.equal(canUseNativeShare({ share: () => Promise.resolve() }), true);
    assert.equal(canUseNativeShare({ share: 'yes' }), false);
    assert.equal(canUseNativeShare({}), false);
    assert.equal(canUseNativeShare(undefined), false);
  });
});

describe('result image content', () => {
  it('localizes every string and caps the matched names', async () => {
    const result = await chinaResult();
    const content = buildImageContent(result, 'zh', 'https://screw-claude.example/zh/');
    assert.equal(content.score, '76');
    assert.equal(content.width, IMAGE_WIDTH);
    assert.equal(content.height, IMAGE_HEIGHT);
    assert.equal(content.band, LOCALES.zh.bandHigh);
    assert.equal(content.url, 'https://screw-claude.example/zh/');
    const expectedNames = matchedNames(result, LOCALES.zh).slice(0, RULES.imageHitLimit);
    assert.deepEqual(content.matchedNames, expectedNames);
    for (const [index, id] of content.matchedIds.entries()) {
      assert.equal(content.matchedNames[index], LOCALES.zh.signalNames[RULES.signalOrder.indexOf(id)]);
    }
    assert.ok(content.matchedNames.length <= RULES.imageHitLimit);
    assert.equal(content.noneMatched, LOCALES.zh.noneMatched);
    assert.ok(content.matchedLabel.trim().length > 0);
    assert.equal(content.matchedLabel.includes('{'), false);
    assert.equal(content.note.trim().length > 0, true);
  });

  it('caps at six names for a result with many matches', async () => {
    const result = await chinaResult();
    const burst = {
      ...result,
      hits: [...RULES.signalOrder],
      signals: RULES.signalOrder.map(id => ({
        id,
        status: 'available' as const,
        observed: 'x',
        strength: 1,
        weight: RULES.weights[id],
        contribution: RULES.weights[id],
        severity: 'high' as const,
        region: null,
      })),
      total: 100,
      band: 'high' as const,
    };
    const content = buildImageContent(burst, 'en', URL_EN);
    assert.equal(content.matchedNames.length, RULES.imageHitLimit);
    assert.equal(content.matchedIds.length, RULES.imageHitLimit);
  });

  it('uses the no-match copy when nothing matched', () => {
    const content = buildImageContent(
      {
        rulesVersion: RULES.version,
        completedAt: '2026-02-03T04:05:06.000Z',
        total: 0,
        band: 'low',
        partial: false,
        signals: [],
        hits: [],
        matchedRegions: [],
      },
      'en',
      URL_EN,
    );
    assert.deepEqual(content.matchedNames, []);
    assert.equal(content.score, '0');
    assert.ok(content.noneMatched.length > 0);
  });
});

describe('PNG generation', () => {
  it('hands localized content to the renderer and returns the blob', async () => {
    const result = await chinaResult();
    let seen: unknown = null;
    const blob = (await createResultPng(
      result,
      'ru',
      {
        render: content => {
          seen = content;
          return new FakeBlob(['png']) as unknown as Blob;
        },
      },
      { url: URL_EN },
    )) as unknown as FakeBlob;
    assert.equal(blob.size > 0, true);
    assert.equal((seen as { score: string }).score, '76');
    assert.equal((seen as { band: string }).band, LOCALES.ru.bandHigh);
  });

  it('wraps a renderer failure in a recoverable error', async () => {
    const result = await chinaResult();
    await assert.rejects(
      () =>
        createResultPng(
          result,
          'en',
          {
            render: () => {
              throw new Error('canvas exploded');
            },
          },
          { url: URL_EN },
        ),
      (error: unknown) => {
        assert.ok(error instanceof ResultImageError);
        assert.equal(error.recoverable, true);
        assert.match(error.message, /rendering failed/i);
        return true;
      },
    );
  });

  it('rejects a renderer that returns nothing usable', async () => {
    const result = await chinaResult();
    await assert.rejects(
      () =>
        createResultPng(result, 'en', { render: () => undefined as unknown as Blob }, { url: URL_EN }),
      /did not return a Blob/,
    );
  });

  it('keeps the scan result untouched when rendering fails', async () => {
    const result = await chinaResult();
    const snapshot = JSON.stringify(result);
    await assert.rejects(() =>
      createResultPng(result, 'en', { render: () => Promise.reject(new Error('nope')) }, { url: URL_EN }),
    );
    assert.equal(JSON.stringify(result), snapshot);
  });
});

describe('image delivery', () => {
  const blob = new FakeBlob(['png']) as unknown as Blob;
  const base = { locale: 'en' as const, score: 76, title: 'title', text: 'text' };
  const file = { name: 'screw-claude-en-76.png' } as unknown as File;

  it('prefers native file sharing', async () => {
    const used: string[] = [];
    const outcome = await deliverResultImage(blob, {
      ...base,
      environment: {
        createFile: () => file,
        canShareFiles: () => true,
        shareFiles: async data => {
          used.push(`share:${data.files[0].name}`);
        },
        writeClipboard: async () => {
          used.push('clipboard');
        },
        download: () => {
          used.push('download');
        },
      },
    });
    assert.deepEqual(outcome, { ok: true, method: 'native-share' });
    assert.deepEqual(used, ['share:screw-claude-en-76.png']);
  });

  it('skips file sharing when the platform cannot share files', async () => {
    const outcome = await deliverResultImage(blob, {
      ...base,
      environment: {
        createFile: () => file,
        canShareFiles: () => false,
        shareFiles: async () => {
          throw new Error('must not be called');
        },
        writeClipboard: async () => {},
        createClipboardItem: data => data,
      },
    });
    assert.deepEqual(outcome, { ok: true, method: 'clipboard' });
  });

  it('falls through to the clipboard when native sharing fails', async () => {
    const outcome = await deliverResultImage(blob, {
      ...base,
      environment: {
        createFile: () => file,
        shareFiles: async () => {
          throw new Error('share exploded');
        },
        createClipboardItem: data => data,
        writeClipboard: async () => {},
      },
    });
    assert.deepEqual(outcome, { ok: true, method: 'clipboard' });
  });

  it('falls through to a download when the clipboard is unavailable', async () => {
    let downloaded = '';
    const outcome = await deliverResultImage(blob, {
      ...base,
      environment: {
        download: (_blob, fileName) => {
          downloaded = fileName;
        },
      },
    });
    assert.deepEqual(outcome, { ok: true, method: 'download' });
    assert.equal(downloaded, 'screw-claude-en-76.png');
  });

  it('treats a canceled share as canceled and stops', async () => {
    const used: string[] = [];
    const abort = new Error('canceled');
    abort.name = 'AbortError';
    const outcome = await deliverResultImage(blob, {
      ...base,
      environment: {
        createFile: () => file,
        shareFiles: async () => {
          throw abort;
        },
        writeClipboard: async () => {
          used.push('clipboard');
        },
        createClipboardItem: data => data,
        download: () => {
          used.push('download');
        },
      },
    });
    assert.deepEqual(outcome, { ok: false, canceled: true, reason: 'canceled' });
    assert.deepEqual(used, []);
  });

  it('reports a download failure without throwing', async () => {
    const outcome = await deliverResultImage(blob, {
      ...base,
      environment: {
        download: () => {
          throw new Error('blocked by the browser');
        },
      },
    });
    assert.equal(outcome.ok, false);
    assert.match(outcome.reason ?? '', /blocked/);
  });

  it('reports when no method is available at all', async () => {
    const outcome = await deliverResultImage(blob, base);
    assert.equal(outcome.ok, false);
    assert.match(outcome.reason ?? '', /no delivery method/);
  });

  it('names the file with the locale and score', async () => {
    const names: string[] = [];
    await deliverResultImage(blob, {
      ...base,
      locale: 'zh',
      score: 3,
      environment: { download: (_blob, name) => names.push(name) },
    });
    assert.deepEqual(names, ['screw-claude-zh-3.png']);
  });
});

describe('image cache', () => {
  it('prepares a blob once and reuses it', async () => {
    const result = await chinaResult();
    let renders = 0;
    const cache = createImageCache();
    const renderer = {
      render: () => {
        renders += 1;
        return new FakeBlob(['png']) as unknown as Blob;
      },
    };
    assert.equal(cache.get(), null);
    const [first, second] = await Promise.all([
      cache.prepare(result, 'en', renderer, URL_EN),
      cache.prepare(result, 'en', renderer, URL_EN),
    ]);
    assert.equal(first, second);
    assert.equal(renders, 1);
    assert.equal(cache.get(), first);
    cache.clear();
    assert.equal(cache.get(), null);
  });

  it('recovers after a failed preparation', async () => {
    const result = await chinaResult();
    const cache = createImageCache();
    await assert.rejects(() =>
      cache.prepare(result, 'en', { render: () => Promise.reject(new Error('boom')) }, URL_EN),
    );
    const blob = await cache.prepare(result, 'en', { render: () => new FakeBlob(['png']) as unknown as Blob }, URL_EN);
    assert.ok(blob);
  });
});

describe('download adapter', () => {
  function fakeDocument() {
    const created: { href: string; download: string; rel: string; clicked: boolean; removed: boolean }[] = [];
    const doc = {
      body: { appendChild: () => {} },
      createElement: () => {
        const link = {
          href: '',
          download: '',
          rel: '',
          clicked: false,
          removed: false,
          click() {
            link.clicked = true;
          },
          remove() {
            link.removed = true;
          },
        };
        created.push(link);
        return link;
      },
    };
    return { doc: doc as unknown as Document, created };
  }

  it('creates an anchor with the file name and clicks it', () => {
    const { doc, created } = fakeDocument();
    const revoked: string[] = [];
    const download = createDownloader({
      document: doc,
      createObjectUrl: () => 'blob:one',
      revokeObjectUrl: url => revoked.push(url),
    });
    download(new FakeBlob(['png']) as unknown as Blob, 'screw-claude-en-76.png');
    assert.equal(created.length, 1);
    assert.equal(created[0].href, 'blob:one');
    assert.equal(created[0].download, 'screw-claude-en-76.png');
    assert.equal(created[0].clicked, true);
    assert.equal(created[0].removed, true);
    assert.equal(created[0].rel, 'noopener');
    assert.deepEqual(revoked, []);
  });

  it('releases the previous object URL on a second download', () => {
    const { doc } = fakeDocument();
    const revoked: string[] = [];
    let counter = 0;
    const download = createDownloader({
      document: doc,
      createObjectUrl: () => `blob:${++counter}`,
      revokeObjectUrl: url => revoked.push(url),
    });
    download(new FakeBlob(['png']) as unknown as Blob, 'a.png');
    download(new FakeBlob(['png']) as unknown as Blob, 'b.png');
    assert.deepEqual(revoked, ['blob:1']);
  });

  it('releases the object URL once the browser has the file', () => {
    const { doc } = fakeDocument();
    const revoked: string[] = [];
    const download = createDownloader({
      document: doc,
      createObjectUrl: () => 'blob:one',
      revokeObjectUrl: url => revoked.push(url),
    });
    download(new FakeBlob(['png']) as unknown as Blob, 'a.png');
    // The release is scheduled, so it cannot cancel an in-flight download.
    assert.deepEqual(revoked, []);
  });

  it('requires a document', () => {
    const download = createDownloader({ document: undefined });
    assert.throws(() => download(new FakeBlob(['png']) as unknown as Blob, 'a.png'), /needs a document/);
  });
});
