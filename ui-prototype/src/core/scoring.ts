/* Pure scoring and matching. No DOM, no locale strings, no presentation.
 *
 * Every signal is evaluated inside each region profile and the strongest
 * candidate wins, so one observation never scores twice. Weights, sets,
 * patterns and thresholds come from `rules.ts`.
 */

import type {
  Band,
  FontMatch,
  FontProbe,
  RegionId,
  ScanResult,
  SignalDetails,
  SignalId,
  SignalResult,
  SignalStatus,
} from './types.ts';
import type {
  EmojiRule,
  FontRule,
  LanguageRule,
  RegionProfile,
  RulesConfig,
  TagRule,
  VendorRule,
} from './rules.ts';

/** One signal's best candidate, before weight and rounding are applied. */
export interface Match {
  strength: number;
  region: RegionId | null;
  /** Label key for a localized name, when the detector has one. */
  label?: string;
  details?: SignalDetails;
}

const NO_MATCH: Match = { strength: 0, region: null };

/* --------------------------------------------------------------- helpers -- */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tagMatches(tag: string, rule: TagRule): boolean {
  if (rule.equals?.includes(tag)) return true;
  if (rule.prefixes?.some(prefix => tag.startsWith(prefix))) return true;
  if (rule.contains?.some(fragment => tag.includes(fragment))) return true;
  return false;
}

function vendorMatches(value: string, rule: VendorRule): boolean {
  if (rule.markers?.some(marker => value.includes(marker))) return true;
  if (rule.patterns?.some(pattern => new RegExp(pattern, 'i').test(value))) return true;
  return false;
}

/** One profile's candidate: `matched` records that a configured rule applied. */
interface Candidate extends Match {
  matched: boolean;
}

/**
 * Strongest matched candidate wins; ties keep the first profile in
 * configuration order. A rule that matches with strength 0 (a neighbouring
 * zone, a related locale) keeps its profile, while a signal where no profile
 * rule applied at all stays neutral.
 */
function strongest(candidates: Candidate[]): Match {
  let best: Candidate | null = null;
  for (const candidate of candidates) {
    if (!candidate.matched) continue;
    if (!best || candidate.strength > best.strength) best = candidate;
  }
  if (!best) return NO_MATCH;
  return {
    strength: best.strength,
    region: best.region,
    ...(best.label ? { label: best.label } : {}),
    ...(best.details ? { details: best.details } : {}),
  };
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/** Shorten a matched-name list to a few names plus an ellipsis. */
export function summarizeMatches(matched: string[], limit = 4): string {
  if (matched.length <= limit) return matched.join(', ');
  return `${matched.slice(0, limit).join(', ')}…`;
}

/** `UTC+08:00` style label for `getTimezoneOffset()` minutes. */
export function formatOffset(minutes: number): string {
  const sign = minutes <= 0 ? '+' : '-';
  const total = Math.abs(minutes);
  const hours = String(Math.floor(total / 60)).padStart(2, '0');
  const rest = String(total % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${rest}`;
}

/* -------------------------------------------------------------- timezone -- */

export function evaluateTimezone(timeZone: string | null, rules: RulesConfig): Match {
  const zone = timeZone?.trim().toLowerCase();
  if (!zone) return NO_MATCH;
  return strongest(
    rules.profiles.map(profile => {
      const rule = profile.timezones.find(candidate =>
        candidate.ids.some(id => id.toLowerCase() === zone),
      );
      return rule
        ? { matched: true, strength: rule.strength, region: profile.id }
        : { matched: false, strength: 0, region: null };
    }),
  );
}

/* -------------------------------------------------------------- language -- */

export function evaluateLanguages(languages: string[], rules: RulesConfig): Match {
  const tags = languages.map(normalizeTag).filter(Boolean);
  if (tags.length === 0) return NO_MATCH;
  const [primary, ...later] = tags;
  const candidates: Candidate[] = rules.profiles.map(profile => {
    const rule = profile.languages.find((candidate: LanguageRule) => {
      const pool = candidate.position === 'primary' ? [primary] : later;
      return pool.some(tag => tagMatches(tag, candidate));
    });
    return rule
      ? { matched: true, strength: rule.strength, region: profile.id }
      : { matched: false, strength: 0, region: null };
  });
  return strongest(candidates);
}

/* ----------------------------------------------------------------- fonts -- */

export interface FontProbeOutcome {
  profile: RegionId;
  matched: string[];
  /** False when the probe could not measure (for example, no Canvas). */
  available: boolean;
}

/** Measure each profile's candidates through the injected probe. */
export function probeFonts(probe: FontProbe, rules: RulesConfig): FontProbeOutcome[] {
  return rules.profiles.map(profile => {
    const matched: string[] = [];
    let available = true;
    for (const family of profile.fonts.families) {
      let hit = false;
      for (const fallback of rules.fontFallbacks) {
        const candidateWidth = probe.measure(profile.fonts.sample, family, fallback);
        const fallbackWidth = probe.measure(profile.fonts.sample, '', fallback);
        if (candidateWidth === null || fallbackWidth === null) {
          available = false;
          break;
        }
        if (Math.abs(candidateWidth - fallbackWidth) > rules.fontTolerancePx) hit = true;
      }
      if (!available) break;
      if (hit) matched.push(family);
    }
    return { profile: profile.id, matched, available };
  });
}

export function scoreProfileFonts(rule: FontRule, matched: string[]): number {
  if (matched.length === 0) return 0;
  const traditional = new Set(rule.traditionalFamilies ?? []);
  const simplified = matched.filter(family => !traditional.has(family));
  if (rule.scoring) {
    if (simplified.length === 0) return rule.scoring.traditionalOnly;
    const { base, step, max } = rule.scoring.simplified;
    return Math.min(max, base + step * simplified.length);
  }
  const thresholds = [...(rule.thresholds ?? [])].sort((a, b) => b.min - a.min);
  const reached = thresholds.find(stage => matched.length >= stage.min);
  return reached ? reached.strength : 0;
}

export function evaluateFonts(outcomes: FontProbeOutcome[], rules: RulesConfig): Match {
  const available = outcomes.filter(outcome => outcome.available);
  if (available.length === 0) return NO_MATCH;

  const perProfile: FontMatch[] = available.map(outcome => {
    const profile = rules.profiles.find(candidate => candidate.id === outcome.profile) as RegionProfile;
    return {
      profile: outcome.profile,
      matched: outcome.matched,
      summary: summarizeMatches(outcome.matched, rules.fontSummaryLimit),
    };
  });

  const best = strongest(
    available.map(outcome => {
      const profile = rules.profiles.find(candidate => candidate.id === outcome.profile) as RegionProfile;
      return {
        matched: outcome.matched.length > 0,
        strength: scoreProfileFonts(profile.fonts, outcome.matched),
        region: outcome.profile,
      };
    }),
  );

  return { ...best, details: { fontMatches: perProfile } };
}

/* ------------------------------------------------------- speech voices -- */

export function evaluateVoices(voiceLanguages: string[], rules: RulesConfig): Match {
  // Browsers report duplicate voices for the same language, so the observed
  // tag list is deduplicated while the caller keeps the raw count.
  const langs = [...new Set(voiceLanguages.map(normalizeTag).filter(Boolean))];
  if (langs.length === 0) {
    return { strength: 0, region: null, details: { voiceLanguages: [], voiceMatches: [] } };
  }
  const candidates: Candidate[] = rules.profiles.map(profile => {
    const rule = profile.voices.find(candidate => langs.some(lang => lang.split('-')[0] === candidate.lang));
    return rule
      ? { matched: true, strength: rule.strength, region: profile.id, label: rule.lang }
      : { matched: false, strength: 0, region: null };
  });
  const best = strongest(candidates);
  // Only the winning rule scored, so only its tags count as matched.
  const voiceMatches = best.label ? langs.filter(lang => lang.split('-')[0] === best.label) : [];
  return { ...best, details: { voiceLanguages: langs, voiceMatches } };
}

/* --------------------------------------------------------------- locale -- */

export function evaluateIntlLocale(locale: string | null, rules: RulesConfig): Match {
  const tag = locale ? normalizeTag(locale) : '';
  if (!tag) return NO_MATCH;
  return strongest(
    rules.profiles.map(profile => {
      const rule = profile.intlLocales.find(candidate => tagMatches(tag, candidate));
      return rule
        ? { matched: true, strength: rule.strength, region: profile.id }
        : { matched: false, strength: 0, region: null };
    }),
  );
}

/* -------------------------------------------------------- offset in UTC -- */

export function evaluateOffset(minutes: number | null, rules: RulesConfig): Match {
  if (minutes === null || !Number.isFinite(minutes)) return NO_MATCH;
  const strength = rules.offsetStrengths[String(minutes)] ?? 0;
  const owner = rules.profiles.find(profile => profile.offsetMinutes.includes(minutes));
  return { strength, region: owner?.id ?? null, details: { offsetMinutes: minutes } };
}

/* ----------------------------------------------------- browser / device -- */

/** First matching row inside one region, in table order. */
function vendorMatch(value: string, region: RegionId, rules: VendorRule[]): VendorRule | null {
  return rules.find(rule => rule.region === region && vendorMatches(value, rule)) ?? null;
}

function evaluateVendor(
  value: string,
  rules: RulesConfig,
  table: VendorRule[],
  fallbackLabel: string | null,
): Match {
  const haystack = normalizeTag(value);
  if (!haystack) {
    return fallbackLabel
      ? { strength: 0, region: null, label: fallbackLabel }
      : NO_MATCH;
  }
  const candidates: Candidate[] = rules.profiles.map(profile => {
    const rule = vendorMatch(haystack, profile.id, table);
    return rule
      ? { matched: true, strength: rule.strength, region: profile.id, label: rule.label }
      : { matched: false, strength: 0, region: null };
  });
  const best = strongest(candidates);
  if (best.strength > 0) return best;
  return fallbackLabel ? { strength: 0, region: null, label: fallbackLabel } : NO_MATCH;
}

export function browserFallbackLabel(userAgent: string, rules: RulesConfig): string | null {
  const haystack = normalizeTag(userAgent);
  if (!haystack) return null;
  for (const fallback of rules.browserFallbacks) {
    if (fallback.markers.some(marker => haystack.includes(marker))) return fallback.label;
  }
  return 'unknown';
}

export function evaluateBrowser(userAgent: string, rules: RulesConfig): Match {
  const fallback = browserFallbackLabel(userAgent, rules);
  const match = evaluateVendor(userAgent, rules, rules.browserRules, fallback);
  const label = match.label ?? fallback ?? 'unknown';
  return { ...match, label, details: { browserLabel: label } };
}

export function evaluateDevice(userAgent: string, platform: string, rules: RulesConfig): Match {
  const haystack = `${userAgent} ${platform}`.trim();
  const fallback = platform.trim() || null;
  const match = evaluateVendor(haystack, rules, rules.deviceRules, fallback);
  return { ...match, details: { deviceLabel: match.label ?? fallback ?? 'unavailable' } };
}

/* ---------------------------------------------------------------- emoji -- */

export function evaluateEmoji(userAgent: string, platform: string, rules: RulesConfig): Match {
  const haystack = normalizeTag(`${userAgent} ${platform}`);
  if (!haystack.trim()) {
    return { strength: rules.emojiUnknown.strength, region: null, label: rules.emojiUnknown.os, details: { osFamily: rules.emojiUnknown.os } };
  }
  const rule: EmojiRule =
    rules.emojiRules.find(candidate => candidate.markers.some(marker => haystack.includes(marker))) ??
    rules.emojiUnknown;
  return { strength: rule.strength, region: null, label: rule.os, details: { osFamily: rule.os } };
}

/* ---------------------------------------------------------- aggregation -- */

export function contributionFor(strength: number, weight: number): number {
  return Math.round(strength * weight);
}

export function classifyScore(total: number, rules: RulesConfig): Band {
  const band = rules.scoreBands.find(candidate => total >= candidate.min && total <= candidate.max);
  return band ? band.band : total < 0 ? 'low' : 'high';
}

export function classifySignal(strength: number, rules: RulesConfig): Band {
  if (strength >= rules.severityBands.high) return 'high';
  if (strength >= rules.severityBands.medium) return 'medium';
  return 'low';
}

/** One signal's collected observation, before weight and rounding are applied. */
export interface Outcome {
  status: SignalStatus;
  observed: string | number | string[] | null;
  strength: number;
  region: RegionId | null;
  details?: SignalDetails;
}

export interface SignalOutcome extends Outcome {
  id: SignalId;
}

export function toSignalResult(outcome: SignalOutcome, rules: RulesConfig): SignalResult {
  const weight = rules.weights[outcome.id];
  const strength = outcome.status === 'available' ? clamp(outcome.strength, 0, 1) : 0;
  return {
    id: outcome.id,
    status: outcome.status,
    observed: outcome.observed,
    strength,
    weight,
    contribution: contributionFor(strength, weight),
    severity: outcome.status === 'available' ? classifySignal(strength, rules) : null,
    region: outcome.status === 'available' ? (outcome.region ?? null) : null,
    ...(outcome.details ? { details: outcome.details } : {}),
  };
}

export function buildResult(
  signals: SignalResult[],
  rules: RulesConfig,
  completedAt: Date,
): ScanResult {
  const total = clamp(
    signals.reduce((sum, signal) => sum + signal.contribution, 0),
    0,
    100,
  );
  const hits = signals.filter(signal => signal.strength >= rules.matchThreshold).map(signal => signal.id);
  const matchedRegions: RegionId[] = [];
  for (const signal of signals) {
    if (signal.region && signal.strength >= rules.matchThreshold && !matchedRegions.includes(signal.region)) {
      matchedRegions.push(signal.region);
    }
  }
  return {
    rulesVersion: rules.version,
    completedAt: completedAt.toISOString(),
    total,
    band: classifyScore(total, rules),
    partial: signals.some(signal => signal.status !== 'available'),
    signals,
    hits,
    matchedRegions,
  };
}

/** Convenience for callers that already hold a `ScanResult`. */
export function signalById(result: ScanResult, id: SignalId): SignalResult | undefined {
  return result.signals.find(signal => signal.id === id);
}
