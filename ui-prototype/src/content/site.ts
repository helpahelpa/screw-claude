/* Deployment and integration configuration. */

import type { LocaleId } from './locales.ts';
import { LOCALE_ROUTES } from './locales.ts';

export interface SiteConfig {
  /** Configure this origin before deploying metadata, sitemap and share links. */
  origin: string;
  name: string;
  supportUrl: string;
  supportLabelKey: 'support';
  /** Page analytics are optional and disabled by default. */
  analytics: { enabled: boolean; provider: 'plausible' | 'umami' | 'none'; domain?: string; scriptUrl?: string };
}

export const SITE: SiteConfig = {
  origin: 'https://screw-claude.example',
  name: 'screw/claude',
  supportUrl: 'https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals',
  supportLabelKey: 'support',
  analytics: { enabled: false, provider: 'none' },
};

/** Absolute URL of a localized route on the configured origin. */
export function localeUrl(locale: LocaleId, origin: string = SITE.origin): string {
  const path = LOCALE_ROUTES[locale] ?? LOCALE_ROUTES.en;
  return `${origin.replace(/\/$/, '')}${path}`;
}

/**
 * URL used in share payloads: the deployed origin when the page is served over
 * HTTP(S), otherwise the configured origin.
 */
export function shareUrl(locale: LocaleId, location?: { origin?: string; protocol?: string }): string {
  const protocol = location?.protocol ?? '';
  const origin = location?.origin ?? '';
  const usable = origin && (protocol === 'http:' || protocol === 'https:');
  return localeUrl(locale, usable ? origin : SITE.origin);
}
