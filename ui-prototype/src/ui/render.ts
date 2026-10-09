/* View layer: pure view-model to HTML. No DOM access, no scoring, no state.
 *
 * The Focus presentation is preserved: a centered introduction, one primary
 * action, and plain open sections. Icons come from the locally vendored Tabler
 * sprite, so no third-party requests are made. Region labels come from the rule
 * configuration rather than from ids the UI knows about.
 */

import type { Band, ScanResult, ScanState, SignalId, SignalResult } from '../core/types.ts';
import { RULES } from '../core/rules.ts';
import { formatOffset } from '../core/scoring.ts';
import { COMMANDS } from '../content/commands.ts';
import { HTML_LANG, LANGUAGE_LINKS, LOCALE_ROUTES, formatMessage, labelText } from '../content/locales.ts';
import type { LocaleId, Messages } from '../content/locales.ts';
import { SITE } from '../content/site.ts';
import { SOCIAL_TARGETS } from '../sharing/links.ts';
import type { ShareSummary } from '../sharing/text.ts';
import type { PreviewStateId } from './previews.ts';

export interface ViewModel {
  locale: LocaleId;
  messages: Messages;
  state: ScanState;
  /** Serialized query string, preserved by language links and the brand link. */
  query: string;
  hash: string;
  /** Review mode: the preview id currently rendered, if any. */
  preview: PreviewStateId | null;
  /** Present only after a completed scan (or a review preview). */
  summary: ShareSummary | null;
  /** Prepared image preview URL, when one exists. */
  imageUrl?: string | null;
  /** Encoded social links, built from the summary. */
  links?: Partial<Record<string, string>>;
}

const SIGNAL_ICONS: Record<SignalId, string> = {
  timezone: 'world',
  language: 'language',
  fonts: 'typography',
  speechVoices: 'message-2',
  intlLocale: 'map-pin',
  timezoneOffset: 'clock',
  browserVendor: 'browser',
  deviceBrand: 'device-desktop',
  emoji: 'mood-smile',
};

const SIGNAL_IDS: SignalId[] = RULES.signalOrder;
const PREVIEW_ORDER: PreviewStateId[] = ['idle', 'running', 'low', 'medium', 'high', 'partial', 'error'];

export const escapeHtml = (value: unknown): string =>
  String(value).replace(
    /[&<>"']/g,
    character =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] as string,
  );

const clean = (value: unknown): string => escapeHtml(String(value).replace(/[—–]/g, '-'));

/** Icon from the vendored Tabler sprite. */
export const glyph = (name: string, extra = ''): string =>
  `<svg class="taste-icon${extra ? ` ${extra}` : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="/taste-assets/tabler.svg#${name}"></use></svg>`;

function iconFor(id: SignalId): string {
  return SIGNAL_ICONS[id];
}

function indexOf(id: SignalId): number {
  return SIGNAL_IDS.indexOf(id);
}

function nameOf(id: SignalId, messages: Messages): string {
  return messages.signalNames[indexOf(id)] ?? id;
}

function weightOf(id: SignalId): number {
  return RULES.weights[id];
}

function bandBody(band: Band, messages: Messages): string {
  if (band === 'high') return messages.bodyHigh;
  if (band === 'medium') return messages.bodyMedium;
  return messages.bodyLow;
}

function bandLabel(band: Band, messages: Messages): string {
  if (band === 'high') return messages.bandHigh;
  if (band === 'medium') return messages.bandMedium;
  return messages.bandLow;
}

/** Profile label resolved from configuration, never from a hard-coded id. */
function profileLabel(region: string | null, messages: Messages): string {
  const profile = RULES.profiles.find(candidate => candidate.id === region);
  if (!profile) return region ?? '';
  const key = profile.labelKey as keyof Messages;
  const value = messages[key];
  return typeof value === 'string' ? value : profile.labelKey;
}

function sectionTitle(id: string, text: string, iconName: string): string {
  return `<h2 id="${id}">${glyph(iconName)}<span>${escapeHtml(text)}</span></h2>`;
}

function statusLabel(signal: SignalResult, messages: Messages): string {
  if (signal.status === 'unavailable') return messages.statusUnavailable;
  if (signal.status === 'error') return messages.statusError;
  return messages.statusAvailable;
}

function severityLabel(signal: SignalResult, messages: Messages): string {
  if (signal.severity === 'high') return messages.severityHigh;
  if (signal.severity === 'medium') return messages.severityMedium;
  return messages.severityLow;
}

/* ------------------------------------------------------------- fragments -- */

function header(vm: ViewModel): string {
  const languages = LANGUAGE_LINKS.map(link => {
    const current = link.id === vm.locale;
    return `<a href="${LOCALE_ROUTES[link.id]}${vm.query}${vm.hash}" lang="${HTML_LANG[link.id]}" hreflang="${HTML_LANG[link.id]}" aria-label="${escapeHtml(`${link.label}: ${link.name}`)}"${current ? ' aria-current="page"' : ''}>${escapeHtml(link.label)}</a>`;
  }).join('');
  return `<a class="focus-skip" href="#check">${escapeHtml(vm.messages.skipToContent)}</a><header class="site-header focus-header"><a class="brand" href="${LOCALE_ROUTES[vm.locale]}${vm.query}" aria-label="screw/claude"><span class="brand-mark">${glyph('mark', 'brand-glyph')}</span><span>screw<span class="brand-slash">/</span>claude</span></a><nav class="languages" aria-label="${escapeHtml(vm.messages.languageLabel)}">${languages}</nav></header>`;
}

/** Rendered observation for one signal, always escaped. */
function describe(signal: SignalResult | null, index: number, vm: ViewModel): string {
  const { messages } = vm;
  if (!signal) return `<span class="focus-placeholder">${clean(messages.signalDetails[index])}</span>`;
  if (signal.status === 'unavailable') return `<span class="focus-placeholder">${escapeHtml(messages.statusUnavailable)}</span>`;
  if (signal.status === 'error') return `<span class="focus-placeholder">${escapeHtml(messages.statusError)}</span>`;

  const observed = signal.observed;
  switch (signal.id) {
    case 'timezone':
    case 'intlLocale':
      return `<code>${clean(observed ?? messages.statusUnavailable)}</code>`;
    case 'language':
      return Array.isArray(observed) && observed.length > 0
        ? `<code>${clean(observed.join(', '))}</code>`
        : `<span class="focus-placeholder">${escapeHtml(messages.statusUnavailable)}</span>`;
    case 'fonts':
      return typeof observed === 'string' && observed
        ? `<code>${clean(observed)}</code>`
        : `<span class="focus-placeholder">${escapeHtml(messages.noMatchingFonts)}</span>`;
    case 'speechVoices':
      return Array.isArray(observed) && observed.length > 0
        ? `<code>${clean(observed.join(', '))}</code>`
        : `<span class="focus-placeholder">${escapeHtml(messages.noneMatched)}</span>`;
    case 'timezoneOffset':
      return `<code>${clean(formatOffset(Number(observed)))}</code>`;
    case 'browserVendor':
      return `<span>${escapeHtml(labelText(messages, signal.details?.browserLabel ?? null))}</span>`;
    case 'deviceBrand':
      return `<span>${escapeHtml(labelText(messages, signal.details?.deviceLabel ?? null))}</span>`;
    case 'emoji':
      return `<span>${escapeHtml(labelText(messages, signal.details?.osFamily ?? null))}</span>`;
    default:
      return clean(String(observed ?? ''));
  }
}

function observations(result: ScanResult | null, vm: ViewModel): string {
  const { messages } = vm;
  const rows = messages.signalNames
    .map((name, index) => {
      const id = SIGNAL_IDS[index];
      const signal = result?.signals.find(entry => entry.id === id) ?? null;
      const tags = [
        signal?.severity ? `<span class="focus-tag">${escapeHtml(severityLabel(signal, messages))}</span>` : '',
        signal?.region ? `<span class="focus-tag is-region">${escapeHtml(profileLabel(signal.region, messages))}</span>` : '',
        signal && signal.status !== 'available'
          ? `<span class="focus-tag is-status">${escapeHtml(statusLabel(signal, messages))}</span>`
          : '',
      ]
        .filter(Boolean)
        .join('');
      const points = signal
        ? `<strong>+${signal.contribution}</strong><span>${escapeHtml(formatMessage(messages.pointsOfWeight, { weight: signal.weight }))}</span>`
        : `<strong>${weightOf(id)}</strong><span>${escapeHtml(messages.weightLabel)}</span>`;
      return `<div class="focus-signal" data-signal="${id}"><dt>${glyph(iconFor(id))}<span>${escapeHtml(name)}</span></dt><dd class="focus-signal-value ${signal ? 'is-observed' : ''}">${describe(signal, index, vm)}</dd><dd class="focus-signal-points">${points}</dd><dd class="focus-signal-meta">${tags}</dd>${fontDetail(signal, messages)}</div>`;
    })
    .join('');

  return `<section id="signals" class="focus-section" aria-labelledby="focus-signals-title">${sectionTitle('focus-signals-title', messages.observationsHeading, 'list-check')}<dl class="focus-signals">${rows}</dl></section>`;
}

/** The complete matched list survives beside the shortened summary. */
function fontDetail(signal: SignalResult | null, messages: Messages): string {
  const matches = signal?.details?.fontMatches;
  if (!matches) return '';
  const full = matches.filter(entry => entry.matched.length > 0);
  if (full.length === 0) return '';
  const text = full
    .map(entry => `${profileLabel(entry.profile, messages)}: ${entry.matched.join(', ')}`)
    .join(' · ');
  return `<p class="focus-signal-detail">${clean(text)}</p>`;
}

/* ----------------------------------------------------------- check panel -- */

function checkPanel(vm: ViewModel): string {
  const { messages, state } = vm;
  const label = escapeHtml(messages.resultLabel);

  if (state.status === 'idle') {
    return `<section id="check" class="scan-panel focus-check focus-ready" aria-label="${label}"><button class="button primary focus-start" data-action="start">${escapeHtml(messages.start)}${glyph('arrow-right')}</button><p class="focus-duration">${escapeHtml(messages.duration)}</p></section>`;
  }

  if (state.status === 'running') {
    const percent = Math.round((state.completedCount / Math.max(1, state.totalCount)) * 100);
    const current = state.current
      ? formatMessage(messages.currentCheck, { name: nameOf(state.current, messages) })
      : messages.checking;
    return `<section id="check" class="scan-panel focus-check focus-running" aria-live="polite" aria-label="${label}"><h2>${glyph('refresh', 'is-spinning')}<span>${escapeHtml(messages.inProgress)}</span></h2><div class="focus-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${state.totalCount}" aria-valuenow="${state.completedCount}"><span style="width:${percent}%"></span></div><div class="focus-progress-text"><span>${clean(current)}</span><span>${escapeHtml(formatMessage(messages.progress, { done: state.completedCount, total: state.totalCount }))}</span></div></section>`;
  }

  if (state.status === 'error' || !state.result) {
    const detail = state.error?.message
      ? `<p class="focus-error-detail">${escapeHtml(state.error.message)}</p>`
      : '';
    return `<section id="check" class="scan-panel focus-check focus-error" aria-live="assertive" aria-label="${label}"><h2>${glyph('alert-triangle')}<span>${escapeHtml(messages.errorTitle)}</span></h2><p>${clean(messages.errorBody)}</p>${detail}<button class="button primary focus-start" data-action="start">${escapeHtml(messages.retry)}${glyph('refresh')}</button></section>`;
  }

  const result = state.result;
  const body = result.partial ? partialBody(result, vm) : bandBody(result.band, messages);
  return `<section id="check" class="scan-panel focus-check focus-result" aria-live="polite" aria-label="${label}"><div class="focus-result-top"><span>${label}</span><span class="focus-band-label">${escapeHtml(bandLabel(result.band, messages))}</span></div><div class="focus-result-score"><strong>${result.total}</strong><span>${escapeHtml(messages.outOf)}</span></div><p class="focus-result-description">${clean(body)}</p>${regionsLine(result, messages)}<div class="focus-result-actions"><button class="button primary" data-action="reset">${escapeHtml(messages.again)}${glyph('refresh')}</button><button class="focus-text-button" data-action="share">${escapeHtml(messages.share)}${glyph('upload')}</button></div>${result.partial ? `<p class="focus-partial-note">${glyph('alert-triangle')}<span>${escapeHtml(messages.partialLabel)}</span></p>` : ''}</section>`;
}

function partialBody(result: ScanResult, vm: ViewModel): string {
  const names = result.signals
    .filter(signal => signal.status !== 'available')
    .map(signal => nameOf(signal.id, vm.messages))
    .join(', ');
  return formatMessage(vm.messages.partialBody, { names });
}

function regionsLine(result: ScanResult, messages: Messages): string {
  if (result.matchedRegions.length === 0) {
    return `<p class="focus-regions-line">${escapeHtml(messages.regionsNone)}</p>`;
  }
  const names = result.matchedRegions.map(region => profileLabel(region, messages)).join(' · ');
  return `<p class="focus-regions-line">${escapeHtml(messages.regionsHeading)}: <strong>${escapeHtml(names)}</strong></p>`;
}

/* -------------------------------------------------------------- findings -- */

function findings(vm: ViewModel): string {
  const result = vm.state.result;
  if (!result) return '';
  const { messages } = vm;
  if (result.hits.length === 0) {
    return `<section id="findings" class="focus-section" aria-labelledby="focus-findings-title">${sectionTitle('focus-findings-title', messages.findingsHeading, 'flag')}<p class="focus-prose-note">${clean(messages.findingsNone)}</p></section>`;
  }
  const items = result.hits
    .map(id => result.signals.find(signal => signal.id === id))
    .filter((signal): signal is SignalResult => !!signal)
    .map(signal => {
      const region = signal.region
        ? `<span class="focus-tag is-region">${escapeHtml(profileLabel(signal.region, messages))}</span>`
        : `<span class="focus-tag is-region">${escapeHtml(messages.severityLabel)} ${escapeHtml(severityLabel(signal, messages))}</span>`;
      return `<li class="focus-finding"><span class="focus-finding-name">${glyph(iconFor(signal.id))}<span>${escapeHtml(nameOf(signal.id, messages))}</span></span><span class="focus-finding-value">${describe(signal, indexOf(signal.id), vm)}</span><span class="focus-finding-points">+${signal.contribution}<span class="focus-sr-only"> ${escapeHtml(messages.pointsLabel)}</span></span>${region}</li>`;
    })
    .join('');
  return `<section id="findings" class="focus-section" aria-labelledby="focus-findings-title">${sectionTitle('focus-findings-title', messages.findingsHeading, 'flag')}<ul class="focus-findings-list">${items}</ul></section>`;
}

/* ------------------------------------------------------------- education -- */

function education(vm: ViewModel): string {
  const { messages } = vm;
  const profiles = RULES.profiles.map(profile => profileLabel(profile.id, messages)).join(', ');
  return `<section id="how" class="focus-section focus-prose" aria-labelledby="focus-how-title">${sectionTitle('focus-how-title', messages.methodHeading, 'info-circle')}<p>${clean(messages.methodBody)}</p><h3>${escapeHtml(messages.profilesHeading)}</h3><p>${clean(formatMessage(messages.profilesBody, { profiles }))}</p><h3>${escapeHtml(messages.limitsHeading)}</h3><p>${clean(messages.limitsBody)}</p><h3>${escapeHtml(messages.privacyHeading)}</h3><p>${clean(messages.privacyBody)}</p></section>`;
}

function terminal(vm: ViewModel): string {
  const { messages } = vm;
  const commands = COMMANDS.map(command => {
    const title = messages[command.titleKey];
    const description = messages[command.descriptionKey];
    return `<article class="focus-command"><div class="focus-command-heading"><h3>${escapeHtml(title)}</h3><button type="button" class="focus-copy-button" data-copy-command="${command.id}" aria-label="${escapeHtml(`${messages.copyCommand}: ${title}`)}" title="${escapeHtml(messages.copyCommand)}">${glyph('copy')}</button></div><p class="focus-command-note">${escapeHtml(description)}</p><pre tabindex="0"><code>${clean(command.command)}</code></pre></article>`;
  }).join('');
  return `<section id="terminal" class="focus-section focus-prose" aria-labelledby="focus-terminal-title">${sectionTitle('focus-terminal-title', messages.terminalHeading, 'terminal-2')}<p>${clean(messages.terminalBody)}</p><p class="focus-command-note">${escapeHtml(messages.terminalUnix)}</p>${commands}<span id="copy-status" class="focus-sr-only" role="status" aria-atomic="true"></span></section>`;
}

function faq(vm: ViewModel): string {
  const { messages } = vm;
  const items = messages.faqs
    .map(
      ([question, answer]) =>
        `<article class="focus-question"><h3>${escapeHtml(question)}</h3><p>${clean(answer)}</p></article>`,
    )
    .join('');
  return `<section id="faq" class="focus-section focus-prose" aria-labelledby="focus-faq-title">${sectionTitle('focus-faq-title', messages.faqHeading, 'help-circle')}${items}<a class="focus-support" href="${SITE.supportUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(messages.support)}${glyph('external-link')}</a></section>`;
}

/* ----------------------------------------------------------------- share -- */

function nativeShareAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

function shareDialog(vm: ViewModel): string {
  const { messages } = vm;
  const result = vm.state.result;
  const summary = vm.summary;
  const score = result?.total ?? 0;
  const band = result ? bandLabel(result.band, messages) : messages.bandLow;
  const matched = summary?.matched.length ? summary.matched.join(' · ') : messages.noneMatched;
  const image = vm.imageUrl
    ? `<img class="focus-share-image" src="${escapeHtml(vm.imageUrl)}" alt="${escapeHtml(messages.saveImage)}">`
    : '';
  const preview = `<div class="focus-share-preview">${image}<span>screw/claude</span><div class="focus-result-score"><strong>${score}</strong><span>${escapeHtml(messages.outOf)}</span></div><span class="focus-band-label">${escapeHtml(band)}</span><p>${escapeHtml(matched)}</p>${summary ? `<p class="focus-share-url">${escapeHtml(summary.url)}</p>` : ''}</div>`;

  const social = SOCIAL_TARGETS.map(
    target =>
      `<a class="button secondary focus-share-link" data-share-target="${target}" href="${escapeHtml(vm.links?.[target] ?? '#')}"${vm.links?.[target] ? ' target="_blank"' : ''} rel="noopener noreferrer">${escapeHtml(messages.platformNames[target])}</a>`,
  ).join('');

  const copyPlatforms = (['red', 'douyin', 'jike'] as const)
    .map(
      platform =>
        `<button type="button" class="button secondary" data-copy-platform="${platform}">${escapeHtml(messages.platformNames[platform])}</button>`,
    )
    .join('');

  const disabled = result ? '' : ' disabled';
  const native = nativeShareAvailable()
    ? `<button class="button secondary focus-share-native" data-action="native-share"${disabled}>${glyph('upload')}${escapeHtml(messages.shareNative)}</button>`
    : `<p class="focus-share-hint">${escapeHtml(messages.shareNativeUnavailable)}</p>`;

  return `<dialog id="share-dialog" class="focus-share" aria-labelledby="share-title"><div class="focus-share-heading"><h2 id="share-title">${escapeHtml(messages.shareHeading)}</h2><button class="icon-button" data-action="close" aria-label="${escapeHtml(messages.close)}">${glyph('x')}</button></div><p>${clean(messages.shareBody)}</p>${preview}<p id="share-status" class="focus-share-status" role="status" aria-atomic="true"></p><button class="button primary focus-save" data-action="save-image"${disabled}>${glyph('download')}${escapeHtml(messages.saveImage)}</button>${native}<section class="focus-share-options" aria-label="${escapeHtml(messages.shareTo)}"><h3>${escapeHtml(messages.shareTo)}</h3><div class="focus-share-platforms">${social}</div></section><section class="focus-share-options" aria-label="${escapeHtml(messages.copyFor)}"><h3>${escapeHtml(messages.copyFor)}</h3><div class="focus-share-platforms">${copyPlatforms}</div></section></dialog>`;
}

/* ---------------------------------------------------------------- review -- */

function reviewControls(vm: ViewModel): string {
  if (!vm.preview) return '';
  const { messages } = vm;
  const index = PREVIEW_ORDER.indexOf(vm.preview);
  const previous = PREVIEW_ORDER[(index + PREVIEW_ORDER.length - 1) % PREVIEW_ORDER.length];
  const next = PREVIEW_ORDER[(index + 1) % PREVIEW_ORDER.length];
  return `<aside class="focus-state-controls" aria-label="${escapeHtml(messages.reviewLabel)}"><button data-review="previous" aria-label="${escapeHtml(`${messages.reviewPrevious}: ${messages.reviewStates[PREVIEW_ORDER.indexOf(previous)]}`)}" title="${escapeHtml(messages.reviewStates[PREVIEW_ORDER.indexOf(previous)])}">${glyph('chevron-left')}</button><span class="focus-state-label" aria-live="polite" aria-atomic="true">${escapeHtml(messages.reviewStates[index])}</span><button data-review="next" aria-label="${escapeHtml(`${messages.reviewNext}: ${messages.reviewStates[PREVIEW_ORDER.indexOf(next)]}`)}" title="${escapeHtml(messages.reviewStates[PREVIEW_ORDER.indexOf(next)])}">${glyph('chevron-right')}</button></aside>`;
}

/* ------------------------------------------------------------------ page -- */

export function renderPage(vm: ViewModel): string {
  const { messages } = vm;
  const notice = vm.preview ? `<p class="focus-sample-notice">${escapeHtml(messages.sampleNotice)}</p>` : '';
  return `${header(vm)}<main class="main-content focus-main" id="main"><section class="focus-introduction" aria-labelledby="focus-title"><h1 id="focus-title">${clean(messages.headline)}<br><span>${clean(messages.headlineAccent)}</span></h1><p class="focus-intro">${clean(messages.intro)}</p>${notice}${checkPanel(vm)}</section><section class="focus-information" aria-label="${escapeHtml(messages.scopeHeading)}">${findings(vm)}${observations(vm.state.result, vm)}${education(vm)}${terminal(vm)}${faq(vm)}</section></main><footer class="focus-footer"><p>${clean(messages.footer)}</p><p class="focus-footer-note">${escapeHtml(messages.footerNote)}</p></footer>${reviewControls(vm)}${shareDialog(vm)}`;
}

export { SIGNAL_IDS, PREVIEW_ORDER, profileLabel, bandLabel };
