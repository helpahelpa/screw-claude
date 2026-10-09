/* UI only. Refines C's centered layout with D's copy and one clear start action.
 * DESIGN_VARIANCE: 4, MOTION_INTENSITY: 1, VISUAL_DENSITY: 2.
 * Observations, progress, and scores remain static presentation specimens.
 */
window.FocusVariant = (() => {
  const copy = () => TasteVariants.copy();
  const glyph = name => TasteVariants.glyph(name);
  const clean = value => escapeHtml(String(value).replace(/[—–]/g, '-'));
  const copyFeedbackTimers = new WeakMap();
  const pendingCopies = new WeakSet();
  const signalGlyphs = ['world', 'language', 'typography', 'map-pin', 'clock', 'browser', 'device-desktop', 'mood-smile'];
  const sectionTitle = (id, text, name) => `<h2 id="${id}">${glyph(name)}<span>${text}</span></h2>`;
  const hasStateControls = () => !showReview && params.get('review') !== '0';

  function applyTheme() {
    const choice = new URLSearchParams(location.search).get('theme');
    document.body.dataset.focusTheme = ['light', 'dark'].includes(choice) ? choice : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function header() {
    const query = location.search;
    return `<header class="site-header focus-header"><a class="brand" href="${localePath}${query}" aria-label="screw/claude"><span class="brand-mark">${icon('mark')}</span><span>screw<span class="brand-slash">/</span>claude</span></a><nav class="languages" aria-label="${t.languageLabel}">${languageLinks()}</nav></header>`;
  }

  function check() {
    const c = copy();
    if (state === 'idle') return `<section id="check" class="scan-panel focus-check focus-ready" aria-label="${t.environment}"><button class="button primary focus-start" data-action="start">${t.start}${glyph('arrow-right')}</button><p class="focus-duration">${c.duration}</p></section>`;
    if (state === 'running') return `<section id="check" class="scan-panel focus-check focus-running" aria-live="polite" aria-label="${t.environment}"><h2>${glyph('refresh')}<span>${c.inProgress}</span></h2><div class="focus-progress"><span></span></div><div class="focus-progress-text"><span>${t.currentCheck}</span><span>${t.progress}</span></div></section>`;
    if (state === 'error') return `<section id="check" class="scan-panel focus-check focus-error" aria-live="polite" aria-label="${t.environment}"><h2>${glyph('alert-triangle')}<span>${t.errorTitle}</span></h2><p>${t.errorBody}</p><button class="button primary focus-start" data-action="start">${t.retry}${glyph('refresh')}</button></section>`;
    const result = fixtures[state];
    return `<section id="check" class="scan-panel focus-check focus-result" aria-live="polite" aria-label="${t.environment}"><div class="focus-result-top"><span>${c.sampleResult}</span><span>${t[result.band]}</span></div><div class="focus-result-score"><strong>${result.score}</strong><span>/ 100</span></div><p class="focus-result-description">${state === 'partial' ? t.partialBody : t[result.band + 'Body']}</p><div class="focus-result-actions"><button class="button primary" data-action="reset">${t.again}${glyph('refresh')}</button><button class="focus-text-button" data-action="share">${t.share}${glyph('upload')}</button></div></section>`;
  }

  function signalDetails() {
    const c = copy();
    const result = fixtures[state];
    const heading = result ? t.signals : t.scopeHeading;
    if (!result && state !== 'running') return `<section id="signals" class="focus-section" aria-labelledby="focus-signals-title">${sectionTitle('focus-signals-title', heading, 'list-check')}<ul class="focus-scope-list">${t.signalNames.map((name, index) => `<li>${glyph(signalGlyphs[index])}<span>${name}</span></li>`).join('')}</ul></section>`;
    return `<section id="signals" class="focus-section" aria-labelledby="focus-signals-title">${sectionTitle('focus-signals-title', heading, 'list-check')}<dl class="focus-signals">${weights.map((weight, index) => {
      const completed = !!result || (state === 'running' && index < 3);
      const active = state === 'running' && index === 3;
      const value = result ? result.values[index] : completed ? fixtures.low.values[index] : active ? t.currentCheck : t.signalDetails[index];
      return `<div class="focus-signal" data-signal="${index}"><dt>${glyph(signalGlyphs[index])}<span>${t.signalNames[index]}</span></dt><dd class="focus-signal-value ${completed ? 'is-observed' : ''}">${clean(value)}</dd><dd class="focus-signal-points">${result ? `<strong>+${result.points[index]}</strong><span>${c.from} ${weight}</span>` : `<strong>${weight}</strong><span>${c.maxShort}</span>`}</dd></div>`;
    }).join('')}</dl>${result ? `<p class="focus-signal-note">${t.limitBody}</p>` : ''}</section>`;
  }

  function explanation() {
    const c = copy();
    return `<section id="how" class="focus-section focus-prose" aria-labelledby="focus-how-title">${sectionTitle('focus-how-title', t.how, 'info-circle')}<p>${c.howBody}</p><p>${c.readyNote}</p></section>`;
  }

  function terminal() {
    const c = copy();
    return `<section id="terminal" class="focus-section focus-prose" aria-labelledby="focus-terminal-title">${sectionTitle('focus-terminal-title', t.terminalToggle, 'terminal-2')}<p>${c.termsBody}</p>${commands.map((command, index) => `<article class="focus-command"><div class="focus-command-heading"><h3>${t.commandTitles[index]}</h3><button type="button" class="focus-copy-button" data-focus-copy="${index}" aria-label="${t.copy}: ${t.commandTitles[index]}" title="${t.copy}">${glyph('copy')}</button></div><pre tabindex="0"><code>${clean(command)}</code></pre></article>`).join('')}<span id="focus-copy-status" class="taste-sr-only" role="status" aria-atomic="true"></span></section>`;
  }

  function faq() {
    return `<section id="faq" class="focus-section focus-prose" aria-labelledby="focus-faq-title">${sectionTitle('focus-faq-title', t.faq, 'help-circle')}${t.faqs.map(([question, answer]) => `<article class="focus-question"><h3>${question}</h3><p>${clean(answer)}</p></article>`).join('')}<a class="focus-support" href="https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals" target="_blank" rel="noopener noreferrer">${t.support}${glyph('external-link')}</a></section>`;
  }

  function stateControls() {
    if (!hasStateControls()) return '';
    const index = states.indexOf(state);
    const previous = (index + states.length - 1) % states.length;
    const next = (index + 1) % states.length;
    return `<aside class="focus-state-controls" aria-label="${t.preview}"><button data-focus-state-control="previous" aria-label="${t.preview}: ${t.states[previous]}" title="${t.states[previous]}">${glyph('chevron-left')}</button><span class="focus-state-label" aria-live="polite" aria-atomic="true">${t.states[index]}</span><button data-focus-state-control="next" aria-label="${t.preview}: ${t.states[next]}" title="${t.states[next]}">${glyph('chevron-right')}</button></aside>`;
  }

  function render() {
    const c = copy();
    const parts = c.headline.split(', ');
    const title = parts.length === 2 ? `${clean(parts[0])},<br><span>${clean(parts[1])}</span>` : clean(c.headline);
    return `${header()}<main class="main-content focus-main"><section class="focus-introduction" aria-labelledby="focus-title"><h1 id="focus-title">${title}</h1><p class="focus-intro">${c.intro}</p>${check()}</section><section class="focus-information" aria-label="${t.checkDetails}">${signalDetails()}${explanation()}${terminal()}${faq()}</section></main><footer class="focus-footer">${t.footerNote}</footer>${stateControls()}`;
  }

  function shareDialog() {
    const c = copy();
    const result = fixtures[state] || fixtures.low;
    return `<dialog id="share-dialog" class="focus-share" aria-labelledby="share-title"><div class="focus-share-heading"><h2 id="share-title">${c.shareTitle}</h2><button class="icon-button" data-action="close" aria-label="${t.close}">${glyph('x')}</button></div><p>${c.shareBody}</p><div class="focus-share-preview"><span>screw/claude</span><div class="focus-result-score"><strong>${result.score}</strong><span>/ 100</span></div><span>${t[result.band]}</span><p>${result.matched.map(index => t.signalNames[index]).join(' · ')}</p></div><button class="button primary focus-save" disabled>${glyph('download')}${c.save}</button>${[[c.shareTo, ['X', 'Facebook', 'Telegram', 'Weibo']], [c.copyFor, ['RED', 'Douyin', 'Jike']]].map(([label, platforms]) => `<section class="focus-share-options" aria-label="${label}"><h3>${label}</h3><div class="focus-share-platforms">${platforms.map(platform => `<button class="button secondary" disabled>${platform}</button>`).join('')}</div></section>`).join('')}</dialog>`;
  }

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (variant === 'C') applyTheme();
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-focus-copy]');
    if (!button || pendingCopies.has(button)) return;
    const index = Number(button.dataset.focusCopy);
    const label = `${t.copy}: ${t.commandTitles[index]}`;
    clearTimeout(copyFeedbackTimers.get(button));
    pendingCopies.add(button);
    let feedback, message;
    try {
      await navigator.clipboard.writeText(commands[index]);
      feedback = 'check';
      message = t.copied;
    } catch {
      feedback = 'alert-triangle';
      message = t.copyFailed;
    }
    pendingCopies.delete(button);
    if (!button.isConnected) return;
    button.innerHTML = glyph(feedback);
    button.dataset.focusCopyFeedback = feedback;
    button.title = message;
    button.setAttribute('aria-label', `${message}: ${t.commandTitles[index]}`);
    document.getElementById('focus-copy-status').textContent = `${message}: ${t.commandTitles[index]}`;
    copyFeedbackTimers.set(button, setTimeout(() => {
      button.innerHTML = glyph('copy');
      delete button.dataset.focusCopyFeedback;
      button.title = t.copy;
      button.setAttribute('aria-label', label);
      copyFeedbackTimers.delete(button);
    }, 1600));
  });
  document.addEventListener('click', event => {
    const control = event.target.closest('[data-focus-state-control]');
    if (!control) return;
    const direction = control.dataset.focusStateControl;
    const next = (states.indexOf(state) + (direction === 'next' ? 1 : -1) + states.length) % states.length;
    setState(states[next]);
    const restored = document.querySelector(`[data-focus-state-control="${direction}"]`);
    restored?.focus({preventScroll: true});
    const panel = document.getElementById('check');
    const bounds = panel.getBoundingClientRect();
    const controlsTop = restored.closest('.focus-state-controls').getBoundingClientRect().top;
    if (bounds.top < 0 || bounds.bottom > controlsTop - 12) panel.scrollIntoView({block: 'center', behavior: 'instant'});
  });
  return {render, applyTheme, shareDialog, hasStateControls};
})();
