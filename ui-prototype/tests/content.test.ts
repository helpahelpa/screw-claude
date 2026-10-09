/* Content and localization: complete dictionaries, route language, and copy
 * that stays independent of whatever the browser reports. */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { COMMANDS } from '../src/content/commands.ts';
import {
  DEFAULT_LOCALE,
  HTML_LANG,
  LANGUAGE_LINKS,
  LOCALES,
  LOCALE_ROUTES,
  LOCALES as DICTIONARIES,
  dictionary,
  formatMessage,
  labelText,
  localeFromPath,
  localePath,
} from '../src/content/locales.ts';
import type { LocaleId } from '../src/content/locales.ts';
import { RULES } from '../src/core/rules.ts';
import { SITE, localeUrl, shareUrl } from '../src/content/site.ts';
import { runScan } from '../src/scan/controller.ts';
import { buildSummary, buildPlatformText } from '../src/sharing/text.ts';
import { fakeSource } from './fixtures.ts';

const LOCALE_IDS: LocaleId[] = ['en', 'zh', 'ru'];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

function shapeOf(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [`${prefix}[]:${value.length}`];
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .flatMap(([key, entry]) => shapeOf(entry, prefix ? `${prefix}.${key}` : key))
      .sort();
  }
  return [`${prefix}:${typeof value}`];
}

function stringsOf(value: unknown, prefix = ''): [string, string][] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => stringsOf(entry, `${prefix}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      stringsOf(entry, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [[prefix, String(value)]];
}

describe('dictionaries', () => {
  it('ships exactly the three advertised locales', () => {
    assert.deepEqual(Object.keys(LOCALES).sort(), ['en', 'ru', 'zh']);
    assert.equal(DEFAULT_LOCALE, 'en');
    for (const locale of LOCALE_IDS) {
      assert.ok(LOCALES[locale], `missing dictionary for ${locale}`);
    }
  });

  it('has identical key shapes in every locale', () => {
    const reference = shapeOf(LOCALES.en);
    for (const locale of LOCALE_IDS.slice(1)) {
      assert.deepEqual(shapeOf(LOCALES[locale]), reference, `shape mismatch in ${locale}`);
    }
  });

  it('never ships an empty string', () => {
    for (const locale of LOCALE_IDS) {
      for (const [key, value] of stringsOf(LOCALES[locale])) {
        assert.equal(value.trim().length > 0, true, `${locale}.${key} is empty`);
      }
    }
  });

  it('names all nine signals and their explanations in order', () => {
    for (const locale of LOCALE_IDS) {
      const messages = LOCALES[locale];
      assert.equal(messages.signalNames.length, RULES.signalOrder.length, locale);
      assert.equal(new Set(messages.signalNames).size, 9, `${locale} repeats a signal name`);
      assert.equal(messages.signalDetails.length, RULES.signalOrder.length, locale);
      for (const detail of messages.signalDetails) {
        assert.equal(detail.trim().length > 0, true);
      }
    }
  });

  it('keeps parallel lists the same length across locales', () => {
    const lists: (keyof typeof LOCALES.en)[] = ['signalNames', 'signalDetails'];
    for (const key of lists) {
      const lengths = LOCALE_IDS.map(locale => (LOCALES[locale][key] as string[]).length);
      assert.equal(new Set(lengths).size, 1, `${key} differs: ${lengths.join(', ')}`);
    }
  });

  it('provides the FAQ, share, review and platform copy in every locale', () => {
    for (const locale of LOCALE_IDS) {
      const messages = LOCALES[locale];
      assert.ok(messages.faqs.length >= 7, `${locale} faqs`);
      assert.equal(messages.faqs.every(pair => pair.length === 2 && pair[0].trim() && pair[1].trim()), true);
      assert.equal(messages.reviewStates.length, 7, `${locale} review states`);
      assert.equal(messages.hashtags.red.length > 0, true);
      assert.equal(messages.hashtags.douyin.length > 0, true);
      assert.equal(messages.hashtags.jike.length > 0, true);
    }
  });

  it('keeps localized band and signal body copy distinct', () => {
    for (const locale of LOCALE_IDS) {
      const messages = LOCALES[locale];
      assert.notEqual(messages.bandLow, messages.bandHigh);
      assert.notEqual(messages.bodyLow, messages.bodyHigh);
      assert.notEqual(messages.bodyMedium, messages.bodyHigh);
    }
  });
});

describe('route language', () => {
  it('derives the locale from the pathname only', () => {
    assert.equal(localeFromPath('/'), 'en');
    assert.equal(localeFromPath('/index.html'), 'en');
    assert.equal(localeFromPath('/zh'), 'zh');
    assert.equal(localeFromPath('/zh/'), 'zh');
    assert.equal(localeFromPath('/zh/index.html'), 'zh');
    assert.equal(localeFromPath('/ru/'), 'ru');
    assert.equal(localeFromPath('/ru/anything'), 'ru');
    assert.equal(localeFromPath('/de/'), 'en');
    assert.equal(localeFromPath('/ruins'), 'en');
  });

  it('round-trips locale to path to locale', () => {
    for (const locale of LOCALE_IDS) {
      assert.equal(localeFromPath(localePath(locale)), locale);
      assert.equal(localePath(locale), LOCALE_ROUTES[locale]);
    }
  });

  it('falls back to English for unknown dictionaries', () => {
    assert.equal(dictionary('de'), LOCALES.en);
    assert.equal(dictionary('zh'), LOCALES.zh);
  });

  it('exposes language links with matching routes and names', () => {
    assert.equal(LANGUAGE_LINKS.length, 3);
    assert.deepEqual(LANGUAGE_LINKS.map(link => link.id), LOCALE_IDS);
    for (const link of LANGUAGE_LINKS) {
      assert.ok(link.label.trim().length > 0);
      assert.ok(link.name.trim().length > 0);
      assert.equal(localePath(link.id), LOCALE_ROUTES[link.id]);
      assert.equal(localePath(link.id).length > 1, link.id !== 'en');
    }
  });

  it('uses an HTML language tag for every locale', () => {
    assert.deepEqual(HTML_LANG, { en: 'en', zh: 'zh-CN', ru: 'ru' });
  });
});

describe('formatting helpers', () => {
  it('replaces named placeholders', () => {
    assert.equal(formatMessage('Score {score} in {band}', { score: 76, band: 'High' }), 'Score 76 in High');
  });

  it('keeps unknown placeholders visible instead of printing undefined', () => {
    assert.equal(formatMessage('{missing} here', {}), '{missing} here');
  });

  it('resolves label keys per locale and tolerates unknown keys', () => {
    for (const locale of LOCALE_IDS) {
      const messages = DICTIONARIES[locale];
      assert.ok(labelText(messages, 'profileCn').length > 0);
      assert.equal(labelText(messages, 'notAKey'), 'notAKey');
      assert.ok(labelText(messages, null).length > 0);
    }
  });
});

describe('terminal commands', () => {
  it('ships the three documented commands', () => {
    assert.deepEqual(
      COMMANDS.map(command => command.id),
      ['endpointProxy', 'timeLocale', 'dns'],
    );
    assert.equal(
      COMMANDS[0].command,
      "env | grep -E '^(ANTHROPIC_BASE_URL|HTTPS?_PROXY|ALL_PROXY|NO_PROXY)='",
    );
    assert.match(COMMANDS[1].command, /Intl\.DateTimeFormat/);
    assert.match(COMMANDS[2].command, /dig \+short api\.anthropic\.com/);
    assert.match(COMMANDS[2].command, /nslookup/);
  });

  it('describes every command in every locale', () => {
    for (const locale of LOCALE_IDS) {
      const messages = DICTIONARIES[locale];
      for (const command of COMMANDS) {
        assert.ok(messages[command.titleKey].trim().length > 0, `${locale}.${command.titleKey}`);
        assert.ok(messages[command.descriptionKey].trim().length > 0, `${locale}.${command.descriptionKey}`);
      }
    }
  });
});

describe('site metadata', () => {
  it('builds localized canonical URLs', () => {
    assert.equal(localeUrl('en', 'https://example.test'), 'https://example.test/');
    assert.equal(localeUrl('zh', 'https://example.test'), 'https://example.test/zh/');
    assert.equal(localeUrl('ru', 'https://example.test'), 'https://example.test/ru/');
  });

  it('prefers the live origin over the configured one', () => {
    assert.equal(shareUrl('zh', { origin: 'http://127.0.0.1:4173', protocol: 'http:' }), 'http://127.0.0.1:4173/zh/');
    assert.equal(shareUrl('en', { origin: 'file://', protocol: 'file:' }), localeUrl('en'));
  });

  it('keeps analytics off by default', () => {
    assert.equal(SITE.analytics.enabled, false);
    assert.equal(SITE.analytics.provider, 'none');
    assert.match(SITE.origin, /^https:\/\//);
  });
});

describe('copy follows the route, not the browser', () => {
  it('keeps Chinese observations while presenting English copy', async () => {
    const result = await runScan({
      source: fakeSource({
        timeZone: 'Asia/Shanghai',
        languages: ['zh-CN', 'zh'],
        intlLocale: 'zh-CN',
        offset: -480,
        voices: [{ lang: 'zh-CN', local: true }],
        matchedFonts: ['Microsoft YaHei', 'SimSun'],
      }),
    });
    assert.ok(result);
    // The observations stay exactly as the browser reported them.
    assert.equal(result.signals.find(signal => signal.id === 'timezone')?.observed, 'Asia/Shanghai');
    assert.match(String(result.signals.find(signal => signal.id === 'fonts')?.observed), /Microsoft YaHei/);

    const english = buildSummary({ result, locale: 'en', url: 'https://example.test/' });
    assert.equal(english.body.includes('时区'), false);
    assert.ok(english.matched.includes('Timezone'));
    assert.equal(english.matched.some(name => /[\u4e00-\u9fff]/u.test(name)), false);
    // The default share payload never carries raw observations.
    assert.equal(english.text.includes('Asia/Shanghai'), false);
    assert.equal(english.text.includes('Microsoft YaHei'), false);
    assert.equal(/zh-CN/i.test(english.text), false);

    const chinese = buildSummary({ result, locale: 'zh', url: 'https://example.test/zh/' });
    assert.ok(chinese.matched.some(name => /[\u4e00-\u9fff]/u.test(name)));
    assert.notEqual(chinese.body, english.body);
  });

  it('localizes platform copy without mixing scripts', () => {
    const result = { ...buildMinimalResult(), total: 42, band: 'medium' as const };
    const zh = buildPlatformText(
      buildSummary({ result, locale: 'zh', url: 'https://example.test/zh/' }),
      'red',
      { locale: 'zh' },
    );
    const en = buildPlatformText(
      buildSummary({ result, locale: 'en', url: 'https://example.test/' }),
      'red',
      { locale: 'en' },
    );
    assert.match(zh, /https:\/\/example\.test\/zh\//);
    assert.match(en, /https:\/\/example\.test\//);
    assert.notEqual(zh, en);
  });
});

function buildMinimalResult() {
  return {
    rulesVersion: RULES.version,
    completedAt: '2026-02-03T04:05:06.000Z',
    total: 0,
    band: 'low' as const,
    partial: false,
    signals: [],
    hits: [],
    matchedRegions: [],
  };
}

describe('source hygiene', () => {
  const root = path.join(import.meta.dirname, '..', 'src');
  const files: string[] = [];
  (function walk(directory: string) {
    for (const entry of readdirSync(directory)) {
      const full = path.join(directory, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.ts')) files.push(full);
    }
  })(root);

  it('only touches the network inside the analytics module', () => {
    const pattern = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new WebSocket|navigator\.sendBeacon/;
    const offenders = files.filter(file => {
      if (file.endsWith(path.join('src', 'analytics.ts'))) return false;
      return pattern.test(readFileSync(file, 'utf8'));
    });
    assert.deepEqual(offenders, []);
  });

  it('never reads or writes browser storage', () => {
    const pattern = /localStorage|sessionStorage|indexedDB|document\.cookie/;
    const offenders = files.filter(file => pattern.test(readFileSync(file, 'utf8')));
    assert.deepEqual(offenders, []);
  });

  it('never reads the clipboard', () => {
    const offenders = files.filter(file => /readText|navigator\.clipboard\.read/.test(readFileSync(file, 'utf8')));
    assert.deepEqual(offenders, []);
  });

  it('sends no observations to analytics', () => {
    const source = stripComments(readFileSync(path.join(root, 'analytics.ts'), 'utf8'));
    assert.equal(/score|observ|font|voice|userAgent|timeZone|language/i.test(source), false);
  });
});
