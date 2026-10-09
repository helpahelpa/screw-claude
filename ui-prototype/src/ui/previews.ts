/* Design-review previews.
 *
 * The `?state=` previews in review mode are not mock strings: each one runs the
 * real controller over an injected environment, so the review screens show
 * authentic arithmetic produced by the shipped rules.
 */

import { createScanController, runScan } from '../scan/controller.ts';
import type { FontProbe, ObservationSource, ScanState, VoiceInfo } from '../core/types.ts';

export type PreviewStateId = 'idle' | 'running' | 'low' | 'medium' | 'high' | 'partial' | 'error';

export const PREVIEW_STATE_IDS: PreviewStateId[] = [
  'idle',
  'running',
  'low',
  'medium',
  'high',
  'partial',
  'error',
];

export function isPreviewStateId(value: string | null): value is PreviewStateId {
  return !!value && (PREVIEW_STATE_IDS as string[]).includes(value);
}

interface FakeEnvironmentSpec {
  timeZone: string;
  languages: string[];
  intlLocale: string;
  offset: number;
  userAgent: string;
  platform: string;
  voices: VoiceInfo[];
  /** Families whose measured width differs from the fallback. */
  matchedFonts: string[];
  /** True when Canvas is unavailable. */
  fontsUnavailable?: boolean;
}

const CHROME_LINUX =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const NEUTRAL: FakeEnvironmentSpec = {
  timeZone: 'Europe/London',
  languages: ['en-GB', 'en'],
  intlLocale: 'en-GB',
  offset: 0,
  userAgent: CHROME_LINUX,
  platform: 'Linux x86_64',
  voices: [{ lang: 'en-GB', local: true }],
  matchedFonts: [],
};

const MEDIUM: FakeEnvironmentSpec = {
  timeZone: 'Asia/Taipei',
  languages: ['zh-TW', 'en'],
  intlLocale: 'zh-TW',
  offset: -480,
  userAgent: SAFARI_MAC,
  platform: 'MacIntel',
  voices: [{ lang: 'en-US', local: true }],
  matchedFonts: ['PingFang TC'],
};

const HIGH: FakeEnvironmentSpec = {
  timeZone: 'Asia/Shanghai',
  languages: ['zh-CN', 'zh', 'en'],
  intlLocale: 'zh-CN',
  offset: -480,
  userAgent: CHROME_WINDOWS,
  platform: 'Win32',
  voices: [{ lang: 'zh-CN', local: true }],
  matchedFonts: ['Microsoft YaHei', 'SimSun', 'PingFang SC'],
};

const PREVIEW_ENVIRONMENTS: Record<Exclude<PreviewStateId, 'idle' | 'running' | 'error'>, FakeEnvironmentSpec> = {
  low: NEUTRAL,
  medium: MEDIUM,
  high: HIGH,
  // The high environment with one check that cannot be observed, so reviewers
  // see a partial caveat on a strong result.
  partial: { ...HIGH, fontsUnavailable: true },
};

function fakeFontProbe(spec: FakeEnvironmentSpec): FontProbe {
  const matched = new Set(spec.matchedFonts);
  return {
    measure(_sample, family, _fallback) {
      if (spec.fontsUnavailable) return null;
      const base = 240;
      return family && matched.has(family) ? base + 12 : base;
    },
  };
}

function specFor(id: PreviewStateId): FakeEnvironmentSpec {
  if (id === 'medium') return PREVIEW_ENVIRONMENTS.medium;
  if (id === 'high' || id === 'running') return PREVIEW_ENVIRONMENTS.high;
  if (id === 'partial') return PREVIEW_ENVIRONMENTS.partial;
  return NEUTRAL;
}

export function createPreviewSource(id: PreviewStateId): ObservationSource {
  const spec = specFor(id);
  return {
    timeZone: () => spec.timeZone,
    languages: () => [...spec.languages],
    intlLocale: () => spec.intlLocale,
    timezoneOffset: () => spec.offset,
    userAgent: () => spec.userAgent,
    platform: () => spec.platform,
    voices: async () => spec.voices.map(voice => ({ ...voice })),
    fonts: fakeFontProbe(spec),
  };
}

/** Build a full `ScanState` for a review preview, using the shipped pipeline. */
export async function buildPreviewState(id: PreviewStateId): Promise<ScanState> {
  if (id === 'idle') {
    return createScanController({ source: createPreviewSource('low') }).getState();
  }

  if (id === 'error') {
    // An empty detector registry is a terminal controller failure, exactly like
    // a misconfigured integration. The sample keeps a visitor-facing message so
    // the review screen never reads like an internal diagnostic.
    const controller = createScanController({ source: createPreviewSource('low'), detectors: [] });
    await controller.start();
    const failed = controller.getState();
    return {
      ...failed,
      error: { message: 'Sample failure: the run stopped before the checks began. Nothing left the device.' },
    };
  }

  if (id === 'running') {
    let snapshot: ScanState | null = null;
    const controller = createScanController({ source: createPreviewSource('running') });
    const unsubscribe = controller.subscribe((state, event) => {
      if (event.type === 'signal:complete' && event.index === 3) snapshot = state;
    });
    await controller.start();
    unsubscribe();
    return snapshot ?? controller.getState();
  }

  const controller = createScanController({ source: createPreviewSource(id) });
  await controller.start();
  return controller.getState();
}

/** Convenience for tests: run one preview environment end to end. */
export function runPreview(id: Exclude<PreviewStateId, 'idle' | 'running' | 'error'>) {
  return runScan({ source: createPreviewSource(id) });
}
