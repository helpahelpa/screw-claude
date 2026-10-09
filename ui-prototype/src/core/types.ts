/* Core contracts for the browser environment diagnostic.
 * Types only: no DOM access, no framework, no I/O.
 */

/** Result classification bands. */
export type Band = 'low' | 'medium' | 'high';

/** Shipped region profiles. Extend together with `PROFILES`. */
export type RegionId = 'cn' | 'ru';

/** The nine local checks, in evaluation and reporting order. */
export type SignalId =
  | 'timezone'
  | 'language'
  | 'fonts'
  | 'speechVoices'
  | 'intlLocale'
  | 'timezoneOffset'
  | 'browserVendor'
  | 'deviceBrand'
  | 'emoji';

/** Whether an observation could be collected at all. */
export type SignalStatus = 'available' | 'unavailable' | 'error';

/** Presentation-independent progress of one check. */
export type ProgressState = 'pending' | 'running' | 'complete';

export type ScanStatus = 'idle' | 'running' | 'complete' | 'error';

/** Structured extras kept beside an observation so a UI can explain it. */
export interface SignalDetails {
  /** Every language tag observed, lowercased. */
  languages?: string[];
  /** Per-profile font matches; the full list survives for local display. */
  fontMatches?: FontMatch[];
  /** Local voice languages observed, lowercased and deduplicated. */
  voiceLanguages?: string[];
  /** Observed tags that matched the scoring voice rule, i.e. the ones that scored. */
  voiceMatches?: string[];
  /** Local voices reported by the browser before deduplication. */
  voiceCount?: number;
  /** Best-effort browser label, also used when nothing matched. */
  browserLabel?: string;
  /** Best-effort device or platform label. */
  deviceLabel?: string;
  /** Estimated OS family behind the emoji style signal. */
  osFamily?: string;
  /** The raw UTC offset in minutes (as `getTimezoneOffset()` reports it). */
  offsetMinutes?: number;
}

export interface FontMatch {
  profile: RegionId;
  /** Full matched family list for the profile, in candidate order. */
  matched: string[];
  /** Human-readable list, shortened to a few names with an ellipsis. */
  summary: string;
}

export interface SignalResult {
  id: SignalId;
  status: SignalStatus;
  /** Observed value: what the browser reported, never a conclusion. */
  observed: string | number | string[] | null;
  /** Normalized signal strength, 0 to 1. */
  strength: number;
  weight: number;
  contribution: number;
  severity: Band | null;
  /** Region profile the strongest match belongs to, if any. */
  region: RegionId | null;
  details?: SignalDetails;
}

export interface ScanResult {
  rulesVersion: string;
  completedAt: string;
  total: number;
  band: Band;
  /** True when at least one check could not be observed. */
  partial: boolean;
  signals: SignalResult[];
  /** Matched signals, in detector order. */
  hits: SignalId[];
  /** Region profiles consistent with the matched signals. */
  matchedRegions: RegionId[];
}

/* ---------------------------------------------------------------- browser -- */

export interface VoiceInfo {
  lang: string;
  /** `SpeechSynthesisVoice.localService`; network voices are excluded. */
  local: boolean;
}

/** Canvas text measurement, isolated so fixtures can inject widths. */
export interface FontProbe {
  /** Width of `sample` in `family` falling back to `fallback`, or null when Canvas is unavailable. */
  measure(sample: string, family: string, fallback: string): number | null;
}

/** Injectable environment. Every browser read goes through this interface. */
export interface ObservationSource {
  timeZone(): string;
  languages(): string[];
  intlLocale(): string;
  timezoneOffset(): number;
  userAgent(): string;
  platform(): string;
  voices(): Promise<VoiceInfo[]>;
  fonts: FontProbe;
}

/* ------------------------------------------------------------------ scan -- */

export interface ScanState {
  status: ScanStatus;
  progress: Record<SignalId, ProgressState>;
  current: SignalId | null;
  completedCount: number;
  totalCount: number;
  result: ScanResult | null;
  error: { message: string } | null;
}

export type ScanEvent =
  | { type: 'scan:start'; at: string }
  | { type: 'signal:start'; id: SignalId; index: number; total: number }
  | {
      type: 'signal:complete';
      id: SignalId;
      index: number;
      total: number;
      signal: SignalResult;
      runningTotal: number;
    }
  | { type: 'scan:complete'; result: ScanResult }
  | { type: 'scan:error'; message: string }
  | { type: 'scan:abort' };

export interface Pacing {
  /** Delay before each check starts, so a UI can animate progress. */
  perSignalDelayMs?: number;
  /** Delay before the first check starts. */
  beforeFirstSignalMs?: number;
}

export interface ScanOptions {
  onEvent?: (event: ScanEvent) => void;
  signal?: AbortSignal;
  source?: ObservationSource;
  pacing?: Pacing;
  /** Injected clock for deterministic fixtures. */
  now?: () => Date;
}

export interface ScanController {
  start(): Promise<ScanResult | null>;
  getState(): ScanState;
  subscribe(listener: (state: ScanState, event: ScanEvent) => void): () => void;
  dispose(): void;
  readonly rulesVersion: string;
}
