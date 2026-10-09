/* Share text: a localized summary that carries no raw observations. */

import type { Band, ScanResult, SignalId } from '../core/types.ts';
import { SIGNAL_ORDER } from '../core/rules.ts';
import { dictionary, formatMessage } from '../content/locales.ts';
import type { LocaleId, Messages } from '../content/locales.ts';

export interface ShareSummary {
  score: number;
  band: Band;
  bandLabel: string;
  /** Matched signal names, localized, in detector order. */
  matched: string[];
  /** Summary body without the link. */
  body: string;
  /** Ready-to-share text: body plus the canonical page URL. */
  text: string;
  url: string;
}

export interface SummaryInput {
  result: ScanResult;
  locale: LocaleId;
  /** Canonical URL of the localized page. */
  url: string;
  messages?: Messages;
}

function bandLabel(messages: Messages, band: Band): string {
  if (band === 'high') return messages.bandHigh;
  if (band === 'medium') return messages.bandMedium;
  return messages.bandLow;
}

export function matchedNames(result: ScanResult, messages: Messages): string[] {
  return result.hits.map(id => messages.signalNames[signalIndex(id)] ?? id);
}

export function signalIndex(id: SignalId): number {
  return SIGNAL_ORDER.indexOf(id);
}

/**
 * Localized summary: score, classification, matched signal names and the page
 * URL. Raw observations, font lists, platform strings and user agents are
 * deliberately excluded from the default payload.
 */
export function buildSummary(input: SummaryInput): ShareSummary {
  const messages = input.messages ?? dictionary(input.locale);
  const matched = matchedNames(input.result, messages);
  const body = formatMessage(
    matched.length > 0 ? messages.shareSummary : messages.shareSummaryNoSignals,
    {
      score: input.result.total,
      band: bandLabel(messages, input.result.band),
      signals: matched.join(', '),
    },
  );
  return {
    score: input.result.total,
    band: input.result.band,
    bandLabel: bandLabel(messages, input.result.band),
    matched,
    body,
    text: `${body}\n${input.url}`,
    url: input.url,
  };
}

export type CopyPlatform = 'red' | 'douyin' | 'jike';

/** Summary plus platform hashtags, for destinations with a copy workflow. */
export function buildPlatformText(
  summary: ShareSummary,
  platform: CopyPlatform,
  input: { locale: LocaleId; messages?: Messages },
): string {
  const messages = input.messages ?? dictionary(input.locale);
  const hashtags = messages.hashtags[platform] ?? [];
  return [summary.text, hashtags.join(' ')].filter(Boolean).join('\n');
}

/** Payload for `navigator.share`. */
export function buildNativeSharePayload(
  summary: ShareSummary,
  input: { locale: LocaleId; messages?: Messages },
): { title: string; text: string; url: string } {
  const messages = input.messages ?? dictionary(input.locale);
  return { title: messages.title, text: summary.body, url: summary.url };
}
