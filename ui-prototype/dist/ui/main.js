/* Live application entry for the Focus presentation.
 *
 * Binds the scan controller, result data and action adapters to the page. The
 * page shell (variant selection and the A/B/D/E specimens) lives in app.js,
 * which calls `mount()` below for variant C.
 */

import { createAnalytics } from '../analytics.js';
import { createCanvasRenderer } from '../browser/canvas-image.js';
import { createDownloader } from '../browser/download.js';
import { createBrowserSource } from '../browser/observations.js';
import { RULES } from '../core/rules.js';
                                                                            
import { COMMANDS } from '../content/commands.js';
import { dictionary, localeFromPath } from '../content/locales.js';
                                                      
import { SITE, assetPath, basePathFrom, shareUrl } from '../content/site.js';
import { createScanController } from '../scan/controller.js';
import { copyText } from '../sharing/clipboard.js';
import { createImageCache, deliverResultImage } from '../sharing/image.js';
import { buildSocialLink } from '../sharing/links.js';
                                                        
import { buildNativeSharePayload, buildPlatformText, buildSummary } from '../sharing/text.js';
                                                       
                                             
import { glyph, renderPage } from './render.js';
import { buildPreviewState, isPreviewStateId, PREVIEW_STATE_IDS } from './previews.js';
                                                    

/** Optional pacing: the UI animates progress, scoring stays unaffected. */
const PACING = { perSignalDelayMs: 550 };
const COPY_FEEDBACK_MS = 1600;
const SHARE_STATUS_MS = 2600;

                               
                    
                                                                       
                                  
                 
                
 

const idleState = ()            => ({
  status: 'idle',
  progress: Object.fromEntries(RULES.signalOrder.map(id => [id, 'pending']))                               ,
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

let options               = {};
let locale           = 'en';
let controller                        = null;
let liveState            = idleState();
let previewState                   = null;
let summary                      = null;
let imagePreviewUrl                = null;
let copyTimer                                       = null;
let statusTimer                                       = null;

function messagesFor()                        {
  return dictionary(locale);
}

function isReview()          {
  return !!options.preview;
}

function currentState()            {
  return isReview() ? (previewState ?? idleState()) : liveState;
}

function buildViewModel()            {
  const result = currentState().result;
  const messages = messagesFor();
  const links                                  = {};
  if (summary) {
    for (const target of ['x', 'facebook', 'telegram', 'weibo']                  ) {
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

function render()       {
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

function ensureController()                        {
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

function refreshSummary(result                                  )       {
  summary = buildSummary({ result, locale, url: shareUrl(locale, location) });
  releaseImagePreview();
  imageCache.clear();
  // Preparing now keeps the user activation for sharing, not for rendering.
  void imageCache.prepare(result, locale, renderer, summary.url).catch(() => undefined);
}

async function startScan()                {
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

function releaseImagePreview()       {
  if (imagePreviewUrl) {
    URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = null;
  }
}

function setShareStatus(message        )       {
  const status = document.getElementById('share-status');
  if (!status) return;
  status.textContent = message;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    const node = document.getElementById('share-status');
    if (node) node.textContent = '';
  }, SHARE_STATUS_MS);
}

async function prepareImage()                {
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
      (preview.querySelector('.focus-share-image')                    ).src = nextUrl;
    }
    setShareStatus('');
  } catch (error) {
    setShareStatus(messagesFor().imageFailed);
  }
}

async function saveImage()                {
  const result = currentState().result;
  if (!result || !summary) return;
  let blob      ;
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
          ? items => navigator.clipboard.write(items                   )
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

async function nativeShare()                {
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

async function copyPlatform(platform                           , button             )                {
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

async function copyCommand(id        , button             )                {
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

async function setPreview(id                , focusDirection                      )                {
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
    const restored = document.querySelector(`[data-review="${focusDirection}"]`)                      ;
    restored?.focus({ preventScroll: true });
    const panel = document.getElementById('check');
    if (panel && focusDirection) panel.scrollIntoView({ block: 'nearest' });
  }
}

/* --------------------------------------------------------------- events -- */

document.addEventListener('click', event => {
  const element = event.target                      ;
  if (!element) return;
  // Another presentation owns the page while the shell shows A/B/D/E.
  if (document.body.dataset.variant && document.body.dataset.variant !== 'C') return;

  const action = element.closest             ('[data-action]')?.dataset.action;
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
    const dialog = document.getElementById('share-dialog')                            ;
    dialog?.showModal();
    void prepareImage();
    return;
  }
  if (action === 'close') {
    (document.getElementById('share-dialog')                            )?.close();
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

  const command = element.closest             ('[data-copy-command]');
  if (command) {
    void copyCommand(command.dataset.copyCommand ?? '', command);
    return;
  }

  const platform = element.closest             ('[data-copy-platform]');
  if (platform) {
    void copyPlatform(platform.dataset.copyPlatform                             , platform);
    return;
  }

  const shareTarget = element.closest             ('[data-share-target]');
  if (shareTarget) {
    analytics.event('share-action');
    return;
  }

  const review = element.closest             ('[data-review]');
  if (review) {
    const direction = review.dataset.review === 'next' ? 'next' : 'previous';
    const index = PREVIEW_STATE_IDS.indexOf(currentPreviewId());
    const next = PREVIEW_STATE_IDS[(index + (direction === 'next' ? 1 : -1) + PREVIEW_STATE_IDS.length) % PREVIEW_STATE_IDS.length];
    void setPreview(next, direction);
    return;
  }

  const dialog = document.getElementById('share-dialog')                            ;
  if (dialog && event.target === dialog) dialog.close();
});

function currentPreviewId()                 {
  return options.preview ?? 'idle';
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  applyTheme();
});

function applyTheme()       {
  const choice = new URLSearchParams(location.search).get('theme');
  document.body.dataset.focusTheme = ['light', 'dark'].includes(choice ?? '')
    ? (choice          )
    : matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
}

/** Called by the page shell for variant C. */
export function mount(next               = {})       {
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

export function localeForPath(pathname        )           {
  return localeFromPath(pathname);
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
    assetUrl: (path        ) => assetPath(path, location),
  };
  analytics.pageView();
}
