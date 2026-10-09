/* Shared fixtures: injectable environments for deterministic rule tests. */

import type { FontProbe, ObservationSource, VoiceInfo } from '../src/core/types.ts';

export interface FakeEnvironment {
  timeZone?: string | null;
  languages?: string[];
  intlLocale?: string | null;
  offset?: number | null;
  userAgent?: string;
  platform?: string;
  /** Local and network voices, or 'throw' to simulate a failing API. */
  voices?: VoiceInfo[] | 'throw';
  /** Families whose measured width differs from the fallback. */
  matchedFonts?: string[];
  /** Returning null simulates a browser without Canvas. */
  fontsUnavailable?: boolean;
  /** Width difference used for matched families; 0.5 is exactly the tolerance. */
  fontDelta?: number;
  /** Value returned when measureText is unavailable for one family. */
  fontNullFor?: string;
}

export function fakeFontProbe(environment: FakeEnvironment): FontProbe {
  const matched = new Set(environment.matchedFonts ?? []);
  const delta = environment.fontDelta ?? 12;
  return {
    measure(_sample, family, _fallback) {
      if (environment.fontsUnavailable) return null;
      if (family && environment.fontNullFor && family === environment.fontNullFor) return null;
      const base = 240;
      return family && matched.has(family) ? base + delta : base;
    },
  };
}

export function fakeSource(environment: FakeEnvironment = {}): ObservationSource {
  return {
    timeZone: () => (environment.timeZone === null ? '' : (environment.timeZone ?? 'Europe/London')),
    languages: () => environment.languages ?? ['en-GB', 'en'],
    intlLocale: () => (environment.intlLocale === null ? '' : (environment.intlLocale ?? 'en-GB')),
    timezoneOffset: () => (environment.offset === null ? Number.NaN : (environment.offset ?? 0)),
    userAgent: () => environment.userAgent ?? CHROME_LINUX,
    platform: () => environment.platform ?? 'Linux x86_64',
    voices: async () => {
      if (environment.voices === 'throw') throw new Error('speechSynthesis denied');
      return (environment.voices ?? []).map(voice => ({ ...voice }));
    },
    fonts: fakeFontProbe(environment),
  };
}

export const CHROME_LINUX =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
export const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
export const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
export const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
export const WECHAT_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003132) NetType/WIFI Language/zh_CN';
export const YANDEX_ON_HUAWEI =
  'Mozilla/5.0 (Linux; Android 10; HUAWEI VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 YaBrowser/25.8.0 Mobile Safari/537.36';
export const HARMONY_UA =
  'Mozilla/5.0 (Phone; HarmonyOS 4.0; HUAWEI Mate 60) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

/** A full Chinese-profile environment: 76 points, seven matched signals. */
export const CHINA_ENVIRONMENT: FakeEnvironment = {
  timeZone: 'Asia/Shanghai',
  languages: ['zh-CN', 'zh', 'en'],
  intlLocale: 'zh-CN',
  offset: -480,
  userAgent: CHROME_WINDOWS,
  platform: 'Win32',
  voices: [{ lang: 'zh-CN', local: true }],
  matchedFonts: ['Microsoft YaHei', 'SimSun', 'PingFang SC'],
};

/** A full Russian-profile environment: 83 points, eight matched signals. */
export const RUSSIA_ENVIRONMENT: FakeEnvironment = {
  timeZone: 'Europe/Moscow',
  languages: ['ru-RU', 'ru', 'en'],
  intlLocale: 'ru-RU',
  offset: -180,
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 YaBrowser/25.8.0 Safari/537.36',
  platform: 'Win32',
  voices: [{ lang: 'ru-RU', local: true }],
  matchedFonts: ['PT Sans', 'PT Serif'],
};

/** A neutral environment: three points from the emoji signal only. */
export const NEUTRAL_ENVIRONMENT: FakeEnvironment = {
  timeZone: 'Europe/London',
  languages: ['en-GB', 'en'],
  intlLocale: 'en-GB',
  offset: 0,
  userAgent: CHROME_LINUX,
  platform: 'Linux x86_64',
  voices: [{ lang: 'en-GB', local: true }],
  matchedFonts: [],
};
