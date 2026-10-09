/* Live application entry for the Focus presentation.
 *
 * Binds the scan controller, result data and action adapters to the page. The
 * page shell (variant selection and the A/B/D/E specimens) lives in app.js,
 * which calls `mount()` below for variant C.
 */

import { createAnalytics } from '../analytics.ts';
import { createCanvasRenderer } from '../browser/canvas-image.ts';
import { createDownloader } from '../browser/download.ts';
import { createBrowserSource } from '../browser/observations.ts';
import { RULES } from '../core/rules.ts';
import type { ScanController, ScanState, SignalId } from '../core/types.ts';
import { COMMANDS } from '../content/commands.ts';
import { dictionary, localeFromPath } from '../content/locales.ts';
import type { LocaleId } from '../content/locales.ts';
import { SITE, assetPath, basePathFrom, shareUrl } from '../content/site.ts';
import { createScanController } from '../scan/controller.ts';
import { copyText } from '../sharing/clipboard.ts';
import { createImageCache, deliverResultImage } from '../sharing/image.ts';
import { buildSocialLink } from '../sharing/links.ts';
import type { SocialTarget } from '../sharing/links.ts';
import { buildNativeSharePayload, buildPlatformText, buildSummary } from '../sharing/text.ts';
import type { ShareSummary } from '../sharing/text.ts';
import type { ViewModel } from './render.ts';
import { glyph, renderPage } from './render.ts';
import { buildPreviewState, isPreviewStateId, PREVIEW_STATE_IDS } from './previews.ts';
import type { PreviewStateId } from './previews.ts';

/** Optional pacing: the UI animates progress, scoring stays unaffected. */
const PACING = { perSignalDelayMs: 550 };
const COPY_FEEDBACK_MS = 1600;
const SHARE_STATUS_MS = 2600;

export interface MountOptions {
  locale?: LocaleId;
  /** Review mode: render this preview state instead of a live scan. */
  preview?: PreviewStateId | null;
  query?: string;
  hash?: string;
}

const idleState = (): ScanState => ({
  status: 'idle',
  progress: Object.fromEntries(RULES.signalOrder.map(id => [id, 'pending'])) as Record<SignalId, 'pending'>,
  current: null,
  completedCount: 0,
  totalCount: RULES.signalOrder.length,
  result: null,
  error: null,
});

const analytics = createAnalytics(SITE.analytics);
const renderer = createCanvasRenderer();
const download = createDownloader();
const imageCache = createImageCache();

let options: MountOptions = {};
let locale: LocaleId = 'en';
let controller: ScanController | null = null;
let liveState: ScanState = idleState();
let previewState: ScanState | null = null;
let summary: ShareSummary | null = null;
let imagePreviewUrl: string | null = null;
let copyTimer: ReturnType<typeof setTimeout> | null = null;
let statusTimer: ReturnType<typeof setTimeout> | null = null;

function messagesFor(): ViewModel['messages'] {
  return dictionary(locale);
}

function isReview(): boolean {
  return !!options.preview;
}

function currentState(): ScanState {
  return isReview() ? (previewState ?? idleState()) : liveState;
}

function buildViewModel(): ViewModel {
  const result = currentState().result;
  const messages = messagesFor();
  const links: Partial<Record<string, string>> = {};
  if (summary) {
    for (const target of ['x', 'facebook', 'telegram', 'weibo'] as SocialTarget[]) {
      links[target] = buildSocialLink(target, summary);
    }
  }
  return {
    locale,
    messages,
    state: currentState(),
    // Mount point of the running page, so every link works under a subdirectory.
    // Origin-relative with a trailing slash: links append a route such as `zh/`.
    root: basePathFrom(location.pathname),
    query: options.query ?? '',
    hash: options.hash ?? '',
    preview: options.preview ?? null,
    summary: result ? summary : null,
    imageUrl: imagePreviewUrl,
    links,
  };
}

function render(): void {
  const root = document.getElementById('app');
  if (!root) return;
  const vm = buildViewModel();
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale;
  document.title = vm.messages.title.replace(/[—–]/g, '-');
  document.body.dataset.variant = 'C';
  document.body.classList.toggle('has-focus-state-controls', isReview());
  root.innerHTML = renderPage(vm);
}

/* ------------------------------------------------------------- scanning -- */

function ensureController(): ScanController | null {
  if (controller) return controller;
  try {
    controller = createScanController({
      source: createBrowserSource(),
      pacing: PACING,
    });
    controller.subscribe(state => {
      liveState = state;
      if (state.result) {
        refreshSummary(state.result);
        analytics.event('scan-complete');
      }
      render();
    });
  } catch (error) {
    liveState = {
      ...idleState(),
      status: 'error',
      error: { message: error instanceof Error ? error.message : dictionary(locale).errorFallback },
    };
    render();
    return null;
  }
  return controller;
}

function refreshSummary(result: NonNullable<ScanState['result']>): void {
  summary = buildSummary({ result, locale, url: shareUrl(locale, location) });
  releaseImagePreview();
  imageCache.clear();
  // Preparing now keeps the user activation for sharing, not for rendering.
  void imageCache.prepare(result, locale, renderer, summary.url).catch(() => undefined);
}

async function startScan(): Promise<void> {
  summary = null;
  releaseImagePreview();
  imageCache.clear();
  analytics.event('scan-start');
  const instance = ensureController();
  if (!instance) return;
  render();
  await instance.start();
}

/* ------------------------------------------------------ image and shares -- */

function releaseImagePreview(): void {
  if (imagePreviewUrl) {
    URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = null;
  }
}

function setShareStatus(message: string): void {
  const status = document.getElementById('share-status');
  if (!status) return;
  status.textContent = message;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    const node = document.getElementById('share-status');
    if (node) node.textContent = '';
  }, SHARE_STATUS_MS);
}

async function prepareImage(): Promise<void> {
  const result = currentState().result;
  if (!result || !summary) return;
  setShareStatus(messagesFor().imagePreparing);
  try {
    const blob = await imageCache.prepare(result, locale, renderer, summary.url);
    const nextUrl = URL.createObjectURL(blob);
    releaseImagePreview();
    imagePreviewUrl = nextUrl;
    // Insert the preview in place so the open dialog is not re-created.
    const preview = document.querySelector('.focus-share-preview');
    if (preview && !preview.querySelector('.focus-share-image')) {
      const image = document.createElement('img');
      image.className = 'focus-share-image';
      image.src = nextUrl;
      image.alt = messagesFor().saveImage;
      preview.prepend(image);
    } else if (preview) {
      (preview.querySelector('.focus-share-image') as HTMLImageElement).src = nextUrl;
    }
    setShareStatus('');
  } catch (error) {
    setShareStatus(messagesFor().imageFailed);
  }
}

async function saveImage(): Promise<void> {
  const result = currentState().result;
  if (!result || !summary) return;
  let blob: Blob;
  try {
    blob = await imageCache.prepare(result, locale, renderer, summary.url);
  } catch {
    setShareStatus(messagesFor().imageFailed);
    return;
  }
  const messages = messagesFor();
  const outcome = await deliverResultImage(blob, {
    locale,
    score: result.total,
    title: messages.title,
    text: summary.text,
    environment: {
      shareFiles:
        typeof navigator !== 'undefined' && typeof navigator.share === 'function'
          ? data => navigator.share(data)
          : undefined,
      canShareFiles:
        typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
          ? data => navigator.canShare(data)
          : undefined,
      createFile: typeof File === 'function' ? (value, name) => new File([value], name, { type: 'image/png' }) : undefined,
      writeClipboard:
        typeof navigator !== 'undefined' && navigator.clipboard && 'write' in navigator.clipboard
          ? items => navigator.clipboard.write(items as ClipboardItem[])
          : undefined,
      createClipboardItem:
        typeof ClipboardItem === 'function' ? data => new ClipboardItem(data) : undefined,
      download,
    },
  });
  if (outcome.canceled) setShareStatus(messages.imageCanceled);
  else if (outcome.ok && outcome.method === 'download') setShareStatus(messages.imageSaved);
  else if (outcome.ok && outcome.method === 'clipboard') setShareStatus(messages.imageCopied);
  else if (outcome.ok) setShareStatus(messages.nativeShareDone);
  else setShareStatus(messages.imageFailed);
}

async function nativeShare(): Promise<void> {
  const messages = messagesFor();
  if (!summary || typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    setShareStatus(messages.shareNativeUnavailable);
    return;
  }
  const payload = buildNativeSharePayload(summary, { locale });
  try {
    await navigator.share(payload);
    setShareStatus(messages.nativeShareDone);
    analytics.event('share-action');
  } catch (error) {
    const canceled = error instanceof Error && (error.name === 'AbortError' || error.name === 'NotAllowedError');
    setShareStatus(canceled ? messages.nativeShareCanceled : messages.nativeShareFailed);
  }
}

async function copyPlatform(platform: 'red' | 'douyin' | 'jike', button: HTMLElement): Promise<void> {
  if (!summary) return;
  const messages = messagesFor();
  const text = buildPlatformText(summary, platform, { locale });
  const outcome = await copyText(text);
  button.dataset.copyFeedback = outcome === 'success' ? 'success' : 'failure';
  setShareStatus(outcome === 'success' ? messages.copyTextDone : messages.copyTextFailed);
  analytics.event('share-action');
  setTimeout(() => {
    delete button.dataset.copyFeedback;
  }, COPY_FEEDBACK_MS);
}

async function copyCommand(id: string, button: HTMLElement): Promise<void> {
  const command = COMMANDS.find(candidate => candidate.id === id);
  if (!command) return;
  const messages = messagesFor();
  const title = messages[command.titleKey];
  const outcome = await copyText(command.command);
  const failed = outcome !== 'success';
  button.innerHTML = glyph(failed ? 'alert-triangle' : 'check');
  button.dataset.copyFeedback = failed ? 'failure' : 'success';
  button.title = failed ? messages.copyFailed : messages.copied;
  button.setAttribute('aria-label', `${failed ? messages.copyFailed : messages.copied}: ${title}`);
  const status = document.getElementById('copy-status');
  if (status) status.textContent = `${failed ? messages.copyFailed : messages.copied}: ${title}`;
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    button.innerHTML = glyph('copy');
    delete button.dataset.copyFeedback;
    button.title = messages.copyCommand;
    button.setAttribute('aria-label', `${messages.copyCommand}: ${title}`);
  }, COPY_FEEDBACK_MS);
}

/* ------------------------------------------------------------ review UI -- */

async function setPreview(id: PreviewStateId, focusDirection?: 'previous' | 'next'): Promise<void> {
  options = { ...options, preview: id };
  const url = new URL(location.href);
  url.searchParams.set('review', '1');
  url.searchParams.set('state', id);
  history.replaceState(null, '', url);
  options.query = url.search;
  previewState = await buildPreviewState(id);
  summary = previewState.result
    ? buildSummary({ result: previewState.result, locale, url: shareUrl(locale, location) })
    : null;
  render();
  if (focusDirection) {
    const restored = document.querySelector(`[data-review="${focusDirection}"]`) as HTMLElement | null;
    restored?.focus({ preventScroll: true });
    const panel = document.getElementById('check');
    if (panel && focusDirection) panel.scrollIntoView({ block: 'nearest' });
  }
}

/* --------------------------------------------------------------- events -- */

document.addEventListener('click', event => {
  const element = event.target as HTMLElement | null;
  if (!element) return;
  // Another presentation owns the page while the shell shows A/B/D/E.
  if (document.body.dataset.variant && document.body.dataset.variant !== 'C') return;

  const action = element.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'start') {
    void startScan();
    return;
  }
  if (action === 'reset') {
    void startScan();
    return;
  }
  if (action === 'share') {
    analytics.event('share-open');
    const dialog = document.getElementById('share-dialog') as HTMLDialogElement | null;
    dialog?.showModal();
    void prepareImage();
    return;
  }
  if (action === 'close') {
    (document.getElementById('share-dialog') as HTMLDialogElement | null)?.close();
    return;
  }
  if (action === 'save-image') {
    void saveImage();
    return;
  }
  if (action === 'native-share') {
    void nativeShare();
    return;
  }

  const command = element.closest<HTMLElement>('[data-copy-command]');
  if (command) {
    void copyCommand(command.dataset.copyCommand ?? '', command);
    return;
  }

  const platform = element.closest<HTMLElement>('[data-copy-platform]');
  if (platform) {
    void copyPlatform(platform.dataset.copyPlatform as 'red' | 'douyin' | 'jike', platform);
    return;
  }

  const shareTarget = element.closest<HTMLElement>('[data-share-target]');
  if (shareTarget) {
    analytics.event('share-action');
    return;
  }

  const review = element.closest<HTMLElement>('[data-review]');
  if (review) {
    const direction = review.dataset.review === 'next' ? 'next' : 'previous';
    const index = PREVIEW_STATE_IDS.indexOf(currentPreviewId());
    const next = PREVIEW_STATE_IDS[(index + (direction === 'next' ? 1 : -1) + PREVIEW_STATE_IDS.length) % PREVIEW_STATE_IDS.length];
    void setPreview(next, direction);
    return;
  }

  const dialog = document.getElementById('share-dialog') as HTMLDialogElement | null;
  if (dialog && event.target === dialog) dialog.close();
});

function currentPreviewId(): PreviewStateId {
  return options.preview ?? 'idle';
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  applyTheme();
});

function applyTheme(): void {
  const choice = new URLSearchParams(location.search).get('theme');
  document.body.dataset.focusTheme = ['light', 'dark'].includes(choice ?? '')
    ? (choice as string)
    : matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
}

/** Called by the page shell for variant C. */
export function mount(next: MountOptions = {}): void {
  options = {
    locale: next.locale ?? localeFromPath(location.pathname),
    preview: isPreviewStateId(next.preview ?? null) ? next.preview : null,
    query: next.query ?? location.search,
    hash: next.hash ?? location.hash,
  };
  locale = options.locale ?? 'en';
  applyTheme();
  if (options.preview) {
    void buildPreviewState(options.preview).then(state => {
      previewState = state;
      summary = state.result ? buildSummary({ result: state.result, locale, url: shareUrl(locale, location) }) : null;
      render();
    });
    render();
    return;
  }
  previewState = null;
  ensureController();
  render();
}

export function localeForPath(pathname: string): LocaleId {
  return localeFromPath(pathname);
}

declare global {
  interface Window {
    ScrewClaude?: {
      mount: typeof mount;
      rulesVersion: string;
      signalOrder: SignalId[];
      analytics: typeof analytics;
      /** Read-only snapshot of the on-page state (live scan or review preview). */
      getState: () => ScanState;
      localeForPath: (pathname: string) => LocaleId;
      assetUrl: (path: string) => string;
    };
  }
}

if (typeof window !== 'undefined') {
  window.ScrewClaude = {
    mount,
    rulesVersion: RULES.version,
    signalOrder: RULES.signalOrder,
    analytics,
    // Read-only view of the current in-memory state, for tests and integrations.
    // Nothing here is persisted or transmitted.
    getState: () => currentState(),
    localeForPath: localeFromPath,
    /** Mount-relative URL of an app asset, for the classic-script specimens. */
    assetUrl: (path: string) => assetPath(path, location),
  };
  analytics.pageView();
}
