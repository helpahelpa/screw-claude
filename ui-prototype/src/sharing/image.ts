/* Result image: local PNG generation with an injected renderer, plus the
 * reference delivery order (native file share, clipboard, download).
 *
 * The functionality supplies localized strings and structured result data; the
 * renderer decides the appearance. Nothing is uploaded and no page screenshot
 * is taken.
 */

import type { ScanResult, SignalId } from '../core/types.ts';
import { RULES } from '../core/rules.ts';
import { dictionary } from '../content/locales.ts';
import type { LocaleId, Messages } from '../content/locales.ts';
import { matchedNames } from './text.ts';

/** Everything a renderer needs; all strings are already localized. */
export interface ImageContent {
  brand: string;
  scoreLabel: string;
  score: string;
  outOf: string;
  band: string;
  matchedLabel: string;
  matchedNames: string[];
  /** Matched signal ids, capped by the rules; useful for icons or chips. */
  matchedIds: SignalId[];
  noneMatched: string;
  urlLabel: string;
  url: string;
  note: string;
  /** Recommended export size. */
  width: number;
  height: number;
}

export interface ResultImageRenderer {
  render(content: ImageContent): Promise<Blob> | Blob;
}

export class ResultImageError extends Error {
  /** A failed export never changes the scan result; the UI can keep the result. */
  readonly recoverable = true;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ResultImageError';
  }
}

export const IMAGE_WIDTH = 1200;
export const IMAGE_HEIGHT = 630;

export function buildImageContent(
  result: ScanResult,
  locale: LocaleId,
  url: string,
  messages: Messages = dictionary(locale),
): ImageContent {
  const names = matchedNames(result, messages);
  const capped = names.slice(0, RULES.imageHitLimit);
  return {
    brand: 'screw/claude',
    scoreLabel: messages.resultLabel,
    score: String(result.total),
    outOf: messages.outOf,
    band: result.band === 'high' ? messages.bandHigh : result.band === 'medium' ? messages.bandMedium : messages.bandLow,
    matchedLabel: messages.findingsHeading,
    matchedNames: capped,
    matchedIds: result.hits.slice(0, RULES.imageHitLimit),
    noneMatched: messages.noneMatched,
    urlLabel: messages.shareUrlLabel,
    url,
    note: messages.shareGeneratedNote,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  };
}

/** Render a PNG blob on the device. Throws a recoverable `ResultImageError`. */
export async function createResultPng(
  result: ScanResult,
  locale: LocaleId,
  renderer: ResultImageRenderer,
  options: { url: string; messages?: Messages },
): Promise<Blob> {
  const content = buildImageContent(result, locale, options.url, options.messages);
  let blob: Blob;
  try {
    blob = await renderer.render(content);
  } catch (error) {
    throw new ResultImageError('Image rendering failed', { cause: error });
  }
  if (!blob || typeof blob.size !== 'number') {
    throw new ResultImageError('The renderer did not return a Blob');
  }
  return blob;
}

/* -------------------------------------------------------------- delivery -- */

export type DeliveryMethod = 'native-share' | 'clipboard' | 'download';

export interface ImageDeliveryOutcome {
  ok: boolean;
  method?: DeliveryMethod;
  canceled?: boolean;
  reason?: string;
}

export interface ImageDeliveryEnvironment {
  /** `navigator.share` with a file payload. */
  shareFiles?: (data: { files: File[]; title: string; text: string }) => Promise<void>;
  canShareFiles?: (data: { files: File[] }) => boolean;
  /** `navigator.clipboard.write` with a `ClipboardItem`. */
  writeClipboard?: (items: unknown[]) => Promise<void>;
  createClipboardItem?: (data: Record<string, Blob>) => unknown;
  createFile?: (blob: Blob, name: string) => File;
  /** Triggers the PNG download and releases any temporary object URL. */
  download?: (blob: Blob, fileName: string) => void;
}

function isCancel(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'NotAllowedError');
}

function fileNameFor(locale: LocaleId, score: number): string {
  return `screw-claude-${locale}-${score}.png`;
}

/**
 * Deliver a prepared PNG. Order: native file sharing, image clipboard, then
 * download. A canceled share stays canceled; other failures fall through.
 */
export async function deliverResultImage(
  blob: Blob,
  options: {
    locale: LocaleId;
    score: number;
    title: string;
    text: string;
    environment?: ImageDeliveryEnvironment;
  },
): Promise<ImageDeliveryOutcome> {
  const env = options.environment ?? {};
  const fileName = fileNameFor(options.locale, options.score);
  const file = env.createFile?.(blob, fileName);

  if (env.shareFiles && file) {
    try {
      const data = { files: [file], title: options.title, text: options.text };
      if (!env.canShareFiles || env.canShareFiles(data)) {
        await env.shareFiles(data);
        return { ok: true, method: 'native-share' };
      }
    } catch (error) {
      if (isCancel(error)) return { ok: false, canceled: true, reason: 'canceled' };
      // Any other failure falls through to the next supported method.
    }
  }

  if (env.writeClipboard && env.createClipboardItem) {
    try {
      await env.writeClipboard([env.createClipboardItem({ 'image/png': blob })]);
      return { ok: true, method: 'clipboard' };
    } catch (error) {
      if (isCancel(error)) return { ok: false, canceled: true, reason: 'canceled' };
    }
  }

  if (env.download) {
    try {
      env.download(blob, fileName);
      return { ok: true, method: 'download' };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : 'download failed',
      };
    }
  }

  return { ok: false, reason: 'no delivery method available' };
}

/**
 * Cache a prepared blob after scan completion so the user activation needed
 * for sharing is not spent on rendering.
 */
export function createImageCache(): {
  prepare(result: ScanResult, locale: LocaleId, renderer: ResultImageRenderer, url: string): Promise<Blob>;
  get(): Blob | null;
  clear(): void;
} {
  let blob: Blob | null = null;
  let pending: Promise<Blob> | null = null;
  return {
    prepare(result, locale, renderer, url) {
      if (blob) return Promise.resolve(blob);
      if (pending) return pending;
      pending = createResultPng(result, locale, renderer, { url })
        .then(value => {
          blob = value;
          return value;
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    },
    get: () => blob,
    clear() {
      blob = null;
      pending = null;
    },
  };
}
