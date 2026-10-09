/* Deployment and integration configuration. */

import type { LocaleId } from './locales.ts';
import { LOCALE_ROUTES } from './locales.ts';
import { basePathFrom, normalizeBase } from './paths.ts';

/** Re-exported so build tooling can reuse the mount-point rules. */
export { basePathFrom, normalizeBase } from './paths.ts';

export interface SiteConfig {
  /** Origin used for absolute metadata, sitemap and share fallbacks. */
  origin: string;
  /** Mount point of the deployment: `/` locally, `/screw-claude/` on Pages. */
  basePath: string;
  name: string;
  supportUrl: string;
  supportLabelKey: 'support';
  /** Page analytics are optional and disabled by default. */
  analytics: { enabled: boolean; provider: 'plausible' | 'umami' | 'none'; domain?: string; scriptUrl?: string };
}

export const SITE: SiteConfig = {
  origin: 'https://helpahelpa.github.io',
  basePath: '/screw-claude/',
  name: 'screw/claude',
  supportUrl: 'https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals',
  supportLabelKey: 'support',
  analytics: { enabled: false, provider: 'none' },
};

/** Location-shaped input, so every helper stays testable without a DOM. */
export interface LocationLike {
  origin?: string;
  protocol?: string;
  pathname?: string;
}

function usableOrigin(location: LocationLike | undefined): string | null {
  const protocol = location?.protocol ?? '';
  const origin = location?.origin ?? '';
  return origin && (protocol === 'http:' || protocol === 'https:') ? origin.replace(/\/$/, '') : null;
}

/** Absolute URL of a localized route on the configured deployment. */
export function localeUrl(locale: LocaleId, origin: string = SITE.origin, basePath: string = SITE.basePath): string {
  const path = (LOCALE_ROUTES[locale] ?? LOCALE_ROUTES.en).replace(/^\//, '');
  return `${origin.replace(/\/$/, '')}${normalizeBase(basePath)}${path}`;
}

/**
 * Root URL of the running page: the deployed origin plus the mount point the
 * browser actually used, so subdirectory hosting needs no configuration.
 */
export function siteRoot(location?: LocationLike): string {
  const origin = usableOrigin(location);
  if (!origin) return `${SITE.origin.replace(/\/$/, '')}${normalizeBase(SITE.basePath)}`;
  return `${origin}${basePathFrom(location?.pathname ?? '/')}`;
}

/** Absolute URL of an app asset or route, e.g. `appUrl('zh/')`. */
export function appUrl(path: string, location?: LocationLike): string {
  return `${siteRoot(location)}${path.replace(/^\/+/, '')}`;
}

/**
 * Origin-relative URL of a runtime asset (`/screw-claude/taste-assets/...`).
 * Used inside rendered markup, where a cross-origin absolute URL would be
 * blocked and a document-relative one would break on `/zh/`.
 */
export function assetPath(path: string, location?: LocationLike): string {
  return `${basePathFrom(location?.pathname ?? '/')}${path.replace(/^\/+/, '')}`;
}

/**
 * URL used in share payloads: the live origin and mount point when the page is
 * served over HTTP(S), otherwise the configured deployment.
 */
export function shareUrl(locale: LocaleId, location?: LocationLike): string {
  return usableOrigin(location) ? appUrl(LOCALE_ROUTES[locale] ?? LOCALE_ROUTES.en, location) : localeUrl(locale);
}
