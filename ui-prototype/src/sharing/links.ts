/* Social share link builders. Pure: parameters are encoded, nothing is opened. */

import type { ShareSummary } from './text.ts';

export type SocialTarget = 'x' | 'facebook' | 'telegram' | 'weibo';

export const SOCIAL_TARGETS: SocialTarget[] = ['x', 'facebook', 'telegram', 'weibo'];

export interface ShareLink {
  target: SocialTarget;
  /** Absolute URL ready to open on the destination service. */
  url: string;
}

function withParams(base: string, params: Record<string, string>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `${base}?${search.toString()}`;
}

/** Build one destination link. Posting and signing in happen on the service. */
export function buildSocialLink(target: SocialTarget, summary: ShareSummary): string {
  switch (target) {
    case 'x':
      return withParams('https://twitter.com/intent/tweet', { text: summary.body, url: summary.url });
    case 'facebook':
      return withParams('https://www.facebook.com/sharer/sharer.php', {
        u: summary.url,
        quote: summary.body,
      });
    case 'telegram':
      return withParams('https://t.me/share/url', { url: summary.url, text: summary.body });
    case 'weibo':
      return withParams('https://service.weibo.com/share/share.php', {
        url: summary.url,
        title: summary.body,
      });
    default:
      throw new Error(`Unknown share target: ${String(target)}`);
  }
}

export function buildSocialLinks(summary: ShareSummary): ShareLink[] {
  return SOCIAL_TARGETS.map(target => ({ target, url: buildSocialLink(target, summary) }));
}
