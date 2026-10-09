/* Deployment and integration configuration. */

                                             
import { LOCALE_ROUTES } from './locales.js';

                             
                                                                                  
                 
               
                     
                             
                                                             
                                                                                                                 
 

export const SITE             = {
  origin: 'https://screw-claude.example',
  name: 'screw/claude',
  supportUrl: 'https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals',
  supportLabelKey: 'support',
  analytics: { enabled: false, provider: 'none' },
};

/** Absolute URL of a localized route on the configured origin. */
export function localeUrl(locale          , origin         = SITE.origin)         {
  const path = LOCALE_ROUTES[locale] ?? LOCALE_ROUTES.en;
  return `${origin.replace(/\/$/, '')}${path}`;
}

/**
 * URL used in share payloads: the deployed origin when the page is served over
 * HTTP(S), otherwise the configured origin.
 */
export function shareUrl(locale          , location                                         )         {
  const protocol = location?.protocol ?? '';
  const origin = location?.origin ?? '';
  const usable = origin && (protocol === 'http:' || protocol === 'https:');
  return localeUrl(locale, usable ? origin : SITE.origin);
}
