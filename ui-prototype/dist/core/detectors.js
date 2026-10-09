/* Detector registry: nine local checks over an injectable observation source.
 *
 * A detector reads one part of the environment, turns it into an observation
 * and hands the value to the pure rules in `scoring.ts`. Detectors never throw
 * for missing APIs: they report `unavailable`, which adds no points and marks
 * the overall result partial.
 */

                                                              
                                              
import {
  evaluateBrowser,
  evaluateDevice,
  evaluateEmoji,
  evaluateFonts,
  evaluateIntlLocale,
  evaluateLanguages,
  evaluateOffset,
  evaluateTimezone,
  evaluateVoices,
  probeFonts,
} from './scoring.js';
                                                   

/** What one detector returns, before weight and rounding are applied. */
                                      

                           
               
                                                                               
 

const available = (
  observed                             ,
  match       ,
)                  => ({
  status: 'available',
  observed,
  strength: match.strength,
  region: match.region,
  ...(match.details ? { details: match.details } : {}),
});

const unavailable = (observed                              = null)                  => ({
  status: 'unavailable',
  observed,
  strength: 0,
  region: null,
});

function requireString(value         )                {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export const DETECTORS             = [
  {
    id: 'timezone',
    async run(source, rules) {
      const timeZone = requireString(source.timeZone());
      if (!timeZone) return unavailable();
      return available(timeZone, evaluateTimezone(timeZone, rules));
    },
  },
  {
    id: 'language',
    async run(source, rules) {
      const languages = (source.languages() ?? []).map(language => String(language).trim()).filter(Boolean);
      if (languages.length === 0) return unavailable();
      const match = evaluateLanguages(languages, rules);
      return available(languages.map(language => language.toLowerCase()), match);
    },
  },
  {
    id: 'fonts',
    async run(source, rules) {
      const outcomes = probeFonts(source.fonts, rules);
      if (outcomes.length === 0 || outcomes.every(outcome => !outcome.available)) {
        return unavailable();
      }
      const match = evaluateFonts(outcomes, rules);
      const best = match.details?.fontMatches?.find(entry => entry.profile === match.region);
      const matched = best?.matched ?? [];
      return available(matched.length > 0 ? best?.summary ?? '' : [], match);
    },
  },
  {
    id: 'speechVoices',
    async run(source, rules) {
      const voices = await source.voices();
      if (!Array.isArray(voices) || voices.length === 0) return unavailable();
      const local = voices.filter(voice => voice.local).map(voice => voice.lang).filter(Boolean);
      if (local.length === 0) {
        // Voices exist, but only network voices: an explainable zero, not absence.
        return available([], {
          strength: 0,
          region: null,
          details: { voiceLanguages: [], voiceMatches: [], voiceCount: 0 },
        });
      }
      const match = evaluateVoices(local, rules);
      const languages = match.details?.voiceLanguages ?? [];
      return available(languages, {
        ...match,
        details: { ...match.details, voiceCount: local.length },
      });
    },
  },
  {
    id: 'intlLocale',
    async run(source, rules) {
      const locale = requireString(source.intlLocale());
      if (!locale) return unavailable();
      return available(locale, evaluateIntlLocale(locale, rules));
    },
  },
  {
    id: 'timezoneOffset',
    async run(source, rules) {
      const offset = source.timezoneOffset();
      if (typeof offset !== 'number' || !Number.isFinite(offset)) return unavailable();
      return available(offset, evaluateOffset(offset, rules));
    },
  },
  {
    id: 'browserVendor',
    async run(source, rules) {
      const userAgent = source.userAgent() ?? '';
      if (!userAgent.trim()) return unavailable();
      const match = evaluateBrowser(userAgent, rules);
      return available(match.label ?? 'unknown', match);
    },
  },
  {
    id: 'deviceBrand',
    async run(source, rules) {
      const userAgent = source.userAgent() ?? '';
      const platform = source.platform() ?? '';
      if (!userAgent.trim() && !platform.trim()) return unavailable();
      const match = evaluateDevice(userAgent, platform, rules);
      const label = match.details?.deviceLabel ?? platform.trim();
      return available(label, match);
    },
  },
  {
    id: 'emoji',
    async run(source, rules) {
      const userAgent = source.userAgent() ?? '';
      const platform = source.platform() ?? '';
      const match = evaluateEmoji(userAgent, platform, rules);
      return available(match.label ?? 'unknown', match);
    },
  },
];

export function detectorById(id          )           {
  const detector = DETECTORS.find(candidate => candidate.id === id);
  if (!detector) throw new Error(`Unknown detector: ${id}`);
  return detector;
}
