/* Deployment and integration configuration. */

                                             
import { LOCALE_ROUTES } from './locales.js';
import { basePathFrom, normalizeBase } from './paths.js';

/** Re-exported so build tooling can reuse the mount-point rules. */
export { basePathFrom, normalizeBase } from './paths.js';

                             
                                                                        
                 
                                                                               
                   
               
                     
                             
                                                             
                                                                                                                 
 

export const SITE             = {
  origin: 'https://helpahelpa.github.io',
  basePath: '/screw-claude/',
  name: 'screw/claude',
  supportUrl: 'https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals',
  supportLabelKey: 'support',
  analytics: { enabled: false, provider: 'none' },
};

/** Location-shaped input, so every helper stays testable without a DOM. */
                               
                  
                    
                    
 

function usableOrigin(location                          )                {
  const protocol = location?.protocol ?? '';
  const origin = location?.origin ?? '';
  return origin && (protocol === 'http:' || protocol === 'https:') ? origin.replace(/\/$/, '') : null;
}

/** Absolute URL of a localized route on the configured deployment. */
export function localeUrl(locale          , origin         = SITE.origin, basePath         = SITE.basePath)         {
  const path = (LOCALE_ROUTES[locale] ?? LOCALE_ROUTES.en).replace(/^\//, '');
  return `${origin.replace(/\/$/, '')}${normalizeBase(basePath)}${path}`;
}

/**
 * Root URL of the running page: the deployed origin plus the mount point the
 * browser actually used, so subdirectory hosting needs no configuration.
 */
export function siteRoot(location               )         {
  const origin = usableOrigin(location);
  if (!origin) return `${SITE.origin.replace(/\/$/, '')}${normalizeBase(SITE.basePath)}`;
  return `${origin}${basePathFrom(location?.pathname ?? '/')}`;
}

/** Absolute URL of an app asset or route, e.g. `appUrl('zh/')`. */
export function appUrl(path        , location               )         {
  return `${siteRoot(location)}${path.replace(/^\/+/, '')}`;
}

/**
 * Origin-relative URL of a runtime asset (`/screw-claude/taste-assets/...`).
 * Used inside rendered markup, where a cross-origin absolute URL would be
 * blocked and a document-relative one would break on `/zh/`.
 */
export function assetPath(path        , location               )         {
  return `${basePathFrom(location?.pathname ?? '/')}${path.replace(/^\/+/, '')}`;
}

/**
 * URL used in share payloads: the live origin and mount point when the page is
 * served over HTTP(S), otherwise the configured deployment.
 */
export function shareUrl(locale          , location               )         {
  return usableOrigin(location) ? appUrl(LOCALE_ROUTES[locale] ?? LOCALE_ROUTES.en, location) : localeUrl(locale);
}
