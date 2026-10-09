/* Rule fixtures: timezones, language trees, locales, offsets and merged tables.
 *
 * These assert the documented strengths directly, so a mistake in a set, a
 * pattern order or a scoring rule fails loudly.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RULES } from '../src/core/rules.ts';
import {
  evaluateBrowser,
  evaluateDevice,
  evaluateEmoji,
  evaluateIntlLocale,
  evaluateLanguages,
  evaluateOffset,
  evaluateTimezone,
  formatOffset,
} from '../src/core/scoring.ts';
import {
  CHROME_ANDROID,
  CHROME_LINUX,
  HARMONY_UA,
  SAFARI_IPHONE,
  WECHAT_UA,
  YANDEX_ON_HUAWEI,
} from './fixtures.ts';

const strength = (value: number) => Number(value.toFixed(4));

describe('timezone matching', () => {
  const cases: [string | null, number, string | null][] = [
    ['Asia/Shanghai', 1, 'cn'],
    ['Asia/Urumqi', 1, 'cn'],
    ['Asia/Chongqing', 1, 'cn'],
    ['Asia/Chungking', 1, 'cn'],
    ['Asia/Harbin', 1, 'cn'],
    ['Asia/Kashgar', 1, 'cn'],
    ['asia/shanghai', 1, 'cn'],
    ['Asia/Hong_Kong', 0.6, 'cn'],
    ['Asia/Macau', 0.6, 'cn'],
    ['Asia/Taipei', 0.6, 'cn'],
    ['Europe/Moscow', 1, 'ru'],
    ['Asia/Kamchatka', 1, 'ru'],
    ['W-SU', 1, 'ru'],
    ['Europe/Simferopol', 1, 'ru'],
    ['Europe/Minsk', 0, 'ru'],
    ['Asia/Almaty', 0, 'ru'],
    ['Europe/London', 0, null],
    ['Asia/Tokyo', 0, null],
    ['America/Sao_Paulo', 0, null],
    ['', 0, null],
    [null, 0, null],
  ];

  for (const [zone, expected, region] of cases) {
    it(`${zone ?? 'missing'} scores ${expected} (${region ?? 'no profile'})`, () => {
      const match = evaluateTimezone(zone, RULES);
      assert.equal(strength(match.strength), expected);
      assert.equal(match.region, region);
    });
  }
});

describe('language trees', () => {
  const cases: [string[], number, string | null][] = [
    [['zh-CN'], 1, 'cn'],
    [['zh'], 1, 'cn'],
    [['zh-Hans-CN'], 1, 'cn'],
    [['zh-Hans'], 1, 'cn'],
    [['zh-TW'], 0.5, 'cn'],
    [['zh-HK', 'en'], 0.5, 'cn'],
    [['zh-Hant-TW'], 0.5, 'cn'],
    [['en', 'zh-CN'], 0.7, 'cn'],
    [['en', 'zh-TW'], 0.4, 'cn'],
    [['en', 'de', 'zh'], 0.7, 'cn'],
    [['en', 'de', 'zh-TW'], 0.4, 'cn'],
    [['ru-RU'], 1, 'ru'],
    [['uk-UA'], 0.7, 'ru'],
    [['en', 'ru'], 0.6, 'ru'],
    [['en', 'uk'], 0.4, 'ru'],
    [['be-BY'], 0, null],
    [['kk-KZ'], 0, null],
    [['az-Latn'], 0, null],
    [['en-US', 'en'], 0, null],
    [[], 0, null],
  ];

  for (const [languages, expected, region] of cases) {
    it(`${JSON.stringify(languages)} scores ${expected} (${region ?? 'no profile'})`, () => {
      const match = evaluateLanguages(languages, RULES);
      assert.equal(strength(match.strength), expected);
      assert.equal(match.region, region);
    });
  }

  it('ignores empty and untrimmed entries', () => {
    const match = evaluateLanguages(['', '  ', 'ZH-cn'], RULES);
    assert.equal(match.strength, 1);
    assert.equal(match.region, 'cn');
  });
});

describe('internationalization locale', () => {
  const cases: [string | null, number, string | null][] = [
    ['zh-CN', 1, 'cn'],
    ['zh-Hans', 1, 'cn'],
    ['zh', 1, 'cn'],
    ['zh-TW', 0.5, 'cn'],
    ['ru', 1, 'ru'],
    ['ru-RU', 1, 'ru'],
    ['uk-UA', 0.5, 'ru'],
    ['en-GB', 0, null],
    ['', 0, null],
    [null, 0, null],
  ];

  for (const [locale, expected, region] of cases) {
    it(`${locale ?? 'missing'} scores ${expected}`, () => {
      const match = evaluateIntlLocale(locale, RULES);
      assert.equal(strength(match.strength), expected);
      assert.equal(match.region, region);
    });
  }
});

describe('UTC offset table', () => {
  it('uses the documented per-offset strengths', () => {
    const expected: [number, number][] = [
      [-120, 0.1],
      [-180, 0.3],
      [-210, 1],
      [-240, 0.25],
      [-270, 1],
      [-300, 0.15],
      [-360, 0.2],
      [-390, 0.9],
      [-420, 0.15],
      [-480, 0.15],
      [-540, 0.1],
      [-600, 0.2],
      [-660, 0.8],
      [-720, 0.5],
      [240, 0.15],
      [300, 0.1],
      [0, 0],
      [-60, 0],
      [60, 0],
    ];
    for (const [minutes, expectedStrength] of expected) {
      const match = evaluateOffset(minutes, RULES);
      assert.equal(strength(match.strength), expectedStrength, `offset ${minutes}`);
    }
  });

  it('attributes an offset to a profile only when that profile uses it', () => {
    assert.equal(evaluateOffset(-480, RULES).region, 'cn');
    assert.equal(evaluateOffset(-180, RULES).region, 'ru');
    assert.equal(evaluateOffset(-210, RULES).region, null);
    assert.equal(evaluateOffset(-270, RULES).region, null);
    assert.equal(evaluateOffset(240, RULES).region, null);
    assert.equal(evaluateOffset(-60, RULES).region, null);
  });

  it('formats offsets with the right sign', () => {
    assert.equal(formatOffset(-480), 'UTC+08:00');
    assert.equal(formatOffset(300), 'UTC-05:00');
    assert.equal(formatOffset(0), 'UTC+00:00');
    assert.equal(formatOffset(-330), 'UTC+05:30');
    assert.equal(formatOffset(-210), 'UTC+03:30');
  });

  it('treats a missing offset as no observation', () => {
    assert.equal(evaluateOffset(null, RULES).strength, 0);
    assert.equal(evaluateOffset(Number.NaN, RULES).strength, 0);
  });
});

describe('browser detection', () => {
  const cases: [string, number, string | null, string][] = [
    [WECHAT_UA, 1, 'cn', 'wechat'],
    ['Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 QQBrowser/13.1', 1, 'cn', 'qq'],
    ['Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 MQQBrowser/12.0', 1, 'cn', 'qq'],
    ['Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Quark/6.0', 1, 'cn', 'quark'],
    ['Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 UCBrowser/15.0', 1, 'cn', 'uc'],
    ['Mozilla/5.0 (Linux; Android 10; BaiduBrowser) AppleWebKit/537.36', 1, 'cn', 'baidu'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 SogouMobileBrowser/6.0', 0.9, 'cn', 'sogou'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 360SE/14.0', 0.9, 'cn', 'threeSixty'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 2345Explorer/12.0', 0.9, 'cn', 'twoThreeFourFive'],
    ['Mozilla/5.0 (Linux; Android 12; MIUI 14) AppleWebKit/537.36 MiuiBrowser/17.0', 0.9, 'cn', 'miBrowser'],
    ['Mozilla/5.0 (Linux; Android 10; HUAWEI) AppleWebKit/537.36 HuaweiBrowser/14.0', 0.9, 'cn', 'huawei'],
    ['Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 HeyTapBrowser/45.0', 0.9, 'cn', 'oppo'],
    ['Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 vivoBrowser/12.0', 0.9, 'cn', 'vivo'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 YaBrowser/25.8.0', 1, 'ru', 'yandex'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Yowser/2.5', 1, 'ru', 'yandex'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Chromium GOST/120', 1, 'ru', 'chromiumGost'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 SberBrowser/12.0', 0.95, 'ru', 'sber'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 MRCHROME/120.0', 0.9, 'ru', 'atom'],
    ['Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 VKAndroidApp/8.0', 0.9, 'ru', 'vkWebview'],
    [CHROME_LINUX, 0, null, 'chrome'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Edg/141.0.0.0', 0, null, 'edge'],
    ['Mozilla/5.0 (Windows NT 10.0; rv:141.0) Gecko/20100101 Firefox/141.0', 0, null, 'firefox'],
    [SAFARI_IPHONE, 0, null, 'safari'],
    ['', 0, null, 'unknown'],
  ];

  for (const [userAgent, expected, region, label] of cases) {
    it(`${label}: ${expected} (${region ?? 'no profile'})`, () => {
      const match = evaluateBrowser(userAgent, RULES);
      assert.equal(strength(match.strength), expected);
      assert.equal(match.region, region);
      assert.equal(match.label, label);
    });
  }

  it('prefers the strongest region match when a user agent matches twice', () => {
    // Huawei is a broad China marker, Yandex is a full-strength Russia marker.
    const match = evaluateBrowser(YANDEX_ON_HUAWEI, RULES);
    assert.equal(match.strength, 1);
    assert.equal(match.region, 'ru');
    assert.equal(match.label, 'yandex');
  });
});

describe('device detection', () => {
  const cases: [string, string, number, string | null, string][] = [
    [HARMONY_UA, 'Linux armv8l', 0.9, 'cn', 'harmonyos'],
    ['Mozilla/5.0 (Linux; Android 10; HUAWEI VOG-L29)', 'Linux armv8l', 0.85, 'cn', 'huaweiHonor'],
    ['Mozilla/5.0 (Linux; Android 10; HONOR BVL-N49)', 'Linux armv8l', 0.85, 'cn', 'huaweiHonor'],
    ['Mozilla/5.0 (Linux; Android 13; Xiaomi 13)', 'Linux armv8l', 0.8, 'cn', 'xiaomi'],
    ['Mozilla/5.0 (Linux; Android 12; Redmi Note 12)', 'Linux armv8l', 0.8, 'cn', 'xiaomi'],
    ['Mozilla/5.0 (Linux; Android 12; MI 9)', 'Linux armv8l', 0.8, 'cn', 'xiaomi'],
    ['Mozilla/5.0 (Linux; Android 12; m2101k6g)', 'Linux armv8l', 0.8, 'cn', 'xiaomi'],
    ['Mozilla/5.0 (Linux; Android 12; CPH2381) OPPO', 'Linux armv8l', 0.8, 'cn', 'oppoFamily'],
    ['Mozilla/5.0 (Linux; Android 12; OnePlus 10)', 'Linux armv8l', 0.8, 'cn', 'oppoFamily'],
    ['Mozilla/5.0 (Linux; Android 12; realme GT)', 'Linux armv8l', 0.8, 'cn', 'oppoFamily'],
    ['Mozilla/5.0 (Linux; Android 12; vivo 1906)', 'Linux armv8l', 0.8, 'cn', 'vivoIqoo'],
    ['Mozilla/5.0 (Linux; Android 12; iQOO Neo)', 'Linux armv8l', 0.8, 'cn', 'vivoIqoo'],
    ['Mozilla/5.0 (Linux; Android 12; Meizu 18)', 'Linux armv8l', 0.75, 'cn', 'meizu'],
    ['Mozilla/5.0 (Linux; Android 11; BQ-6645L)', 'Linux armv8l', 0.75, 'ru', 'russianBrands'],
    ['Mozilla/5.0 (Linux; Android 11; DEXP Ursus)', 'Linux armv8l', 0.75, 'ru', 'russianBrands'],
    ['Mozilla/5.0 (Linux; Android 11; Tecno Spark 9)', 'Linux armv8l', 0.4, 'ru', 'transsion'],
    ['Mozilla/5.0 (Linux; Android 11; Infinix X6819)', 'Linux armv8l', 0.4, 'ru', 'transsion'],
    ['Mozilla/5.0 (Linux; Android 11; itel A60)', 'Linux armv8l', 0.4, 'ru', 'transsion'],
    [SAFARI_IPHONE, 'iPhone', 0, null, 'iPhone'],
    [CHROME_ANDROID, 'Linux armv8l', 0, null, 'Linux armv8l'],
    [CHROME_LINUX, 'Linux x86_64', 0, null, 'Linux x86_64'],
    ['Mozilla/5.0 (Unknown) SomeOS', 'SomeOS', 0, null, 'SomeOS'],
  ];

  for (const [userAgent, platform, expected, region, label] of cases) {
    it(`${label}: ${expected} (${region ?? 'no profile'})`, () => {
      const match = evaluateDevice(userAgent, platform, RULES);
      assert.equal(strength(match.strength), expected);
      assert.equal(match.region, region);
      assert.equal(match.details?.deviceLabel, label);
    });
  }

  it('reports an unavailable label when nothing is exposed', () => {
    const match = evaluateDevice('', '', RULES);
    assert.equal(match.strength, 0);
    assert.equal(match.details?.deviceLabel, 'unavailable');
  });

  it('keeps HarmonyOS ahead of the broad Huawei marker', () => {
    const match = evaluateDevice(HARMONY_UA, 'Linux armv8l', RULES);
    assert.equal(match.label, 'harmonyos');
  });
});

describe('emoji style', () => {
  const cases: [string, string, number, string][] = [
    [SAFARI_IPHONE, 'iPhone', 0.25, 'apple'],
    ['Mozilla/5.0 (Linux; Android 13)', 'Linux armv8l', 0.35, 'google'],
    ['Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0.4, 'microsoft'],
    ['Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)', 'Linux x86_64', 0.35, 'google'],
    [CHROME_LINUX, 'Linux x86_64', 0.5, 'linux'],
    ['', '', 0.4, 'unknown'],
  ];

  for (const [userAgent, platform, expected, os] of cases) {
    it(`${os} scores ${expected}`, () => {
      const match = evaluateEmoji(userAgent, platform, RULES);
      assert.equal(match.strength, expected);
      assert.equal(match.details?.osFamily, os);
      assert.equal(match.region, null);
    });
  }

  it('checks Apple before Windows in a mixed user agent', () => {
    const match = evaluateEmoji('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', RULES);
    assert.equal(match.details?.osFamily, 'apple');
  });
});

describe('rule configuration', () => {
  it('keeps the nine weights at 100 in detector order', () => {
    assert.deepEqual(RULES.signalOrder, [
      'timezone',
      'language',
      'fonts',
      'speechVoices',
      'intlLocale',
      'timezoneOffset',
      'browserVendor',
      'deviceBrand',
      'emoji',
    ]);
    const total = RULES.signalOrder.reduce((sum, id) => sum + RULES.weights[id], 0);
    assert.equal(total, 100);
    assert.deepEqual(
      RULES.signalOrder.map(id => RULES.weights[id]),
      [26, 20, 5, 13, 9, 7, 7, 8, 5],
    );
  });

  it('ships both region profiles with documented sets', () => {
    assert.deepEqual(RULES.profiles.map(profile => profile.id), ['cn', 'ru']);
    const cn = RULES.profiles[0];
    const ru = RULES.profiles[1];
    assert.equal(cn.fonts.families.length, 39);
    assert.equal(cn.fonts.traditionalFamilies?.length, 8);
    assert.equal(cn.timezones[0].ids.length, 6);
    assert.equal(ru.fonts.families.length, 8);
    assert.ok(ru.timezones[0].ids.length >= 27);
  });

  it('orders the merged tables with China before Russia', () => {
    const browserOrder = RULES.browserRules.map(rule => rule.region);
    assert.equal(browserOrder.indexOf('cn') < browserOrder.indexOf('ru'), true);
    const deviceOrder = RULES.deviceRules.map(rule => rule.region);
    assert.equal(deviceOrder.indexOf('cn') < deviceOrder.indexOf('ru'), true);
    assert.equal(RULES.browserRules[0].label, 'wechat');
    assert.equal(RULES.deviceRules[0].label, 'harmonyos');
  });
});
