/* Browser adapters: the only place that touches Web APIs.
 *
 * Each function reads one observation and reports exactly what the browser
 * exposed. Missing APIs return empty observations so a detector can report
 * `unavailable` instead of a confirmed absence. Nothing here sends data
 * anywhere: observations stay in memory.
 */

import { FONT_SAMPLE_SIZE } from '../core/rules.js';
                                                                                

                                 
               
                                  
                      
                       
                      
                                          
    
                      
                                    
 

const VOICES_TIMEOUT_MS = 300;

function stackFor(family        , fallback        )         {
  if (!family) return fallback;
  return `"${family.replace(/"/g, '')}", ${fallback}`;
}

/**
 * Canvas text width probe. Candidate families are measured, never loaded as
 * page fonts, and local fonts are never enumerated.
 */
export function createFontProbe(doc                      )            {
  let context                                  = null;
  try {
    const canvas = doc?.createElement('canvas');
    context = canvas?.getContext('2d') ?? null;
  } catch {
    context = null;
  }
  const cache = new Map                       ();

  return {
    measure(sample        , family        , fallback        )                {
      if (!context) return null;
      const key = `${sample}${family}${fallback}`;
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      let width                = null;
      try {
        context.font = `${FONT_SAMPLE_SIZE}px ${stackFor(family, fallback)}`;
        width = context.measureText(sample).width;
      } catch {
        width = null;
      }
      cache.set(key, width);
      return width;
    },
  };
}

/**
 * Local speech voices. Chrome's network voices (such as the Google voices)
 * would otherwise make this check universal, so only `localService` voices are
 * returned. A missing API or an empty list resolves to an empty array, which a
 * detector reports as `unavailable` rather than as a confirmed absence.
 */
export async function collectVoices(
  synth                             ,
  timeoutMs = VOICES_TIMEOUT_MS,
)                       {
  if (!synth || typeof synth.getVoices !== 'function') return [];
  const synthRef = synth;
  const map = (voices                        )              =>
    voices.map(voice => ({ lang: voice.lang ?? '', local: voice.localService === true }));

  const immediate = synthRef.getVoices();
  if (immediate && immediate.length > 0) return map([...immediate]);

  return new Promise             (resolve => {
    let settled = false;
    const finish = (voices                        ) => {
      if (settled) return;
      settled = true;
      synthRef.removeEventListener?.('voiceschanged', onChanged);
      resolve(map([...voices]));
    };
    function onChanged() {
      finish(synthRef.getVoices() ?? []);
    }
    synthRef.addEventListener?.('voiceschanged', onChanged);
    setTimeout(() => finish(synthRef.getVoices() ?? []), timeoutMs);
  });
}

function resolvedLocale()         {
  return new Intl.DateTimeFormat().resolvedOptions().locale ?? '';
}

function resolvedTimeZone()         {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
}

/** Build the environment the nine detectors read. */
export function createBrowserSource(globals                 )                    {
  const source = globals ?? (globalThis                             );
  const nav = source.navigator;

  return {
    timeZone: () => resolvedTimeZone(),
    languages: () => {
      const languages = nav?.languages;
      if (Array.isArray(languages) && languages.length > 0) return [...languages];
      return nav?.language ? [nav.language] : [];
    },
    intlLocale: () => resolvedLocale(),
    timezoneOffset: () => new Date().getTimezoneOffset(),
    userAgent: () => nav?.userAgent ?? '',
    platform: () => nav?.userAgentData?.platform ?? nav?.platform ?? '',
    voices: () => collectVoices(source.speechSynthesis),
    fonts: createFontProbe(source.document),
  };
}
