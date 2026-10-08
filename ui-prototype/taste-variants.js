/* Additive Taste Skill v2 exploration. D/E remain available for comparison.
 * Native CSS utility UI, not a named design system or a marketing template.
 * D: DESIGN_VARIANCE 6, MOTION_INTENSITY 3, VISUAL_DENSITY 3.
 * E: DESIGN_VARIANCE 5, MOTION_INTENSITY 2, VISUAL_DENSITY 4.
 * Actual prototype controls are the visual focus; decorative images are unnecessary.
 * Tabler outline icons are vendored locally. The original brand mark is preserved.
 */
window.TasteVariants = (() => {
  let theme = new URLSearchParams(location.search).get('theme') || 'auto';
  const texts = {
    en: {
      overview: 'Overview', report: 'Report', headline: 'Your browser, made visible.',
      reportHeadline: 'Your settings, in plain sight.',
      intro: 'Inspect eight browser signals and understand what contributes to your environment score.',
      region: 'Language & region', system: 'Browser & system', rendering: 'Text rendering',
      regionBody: 'The preferences your browser uses for language, location, and text.',
      systemBody: 'The clock, browser, and operating system exposed to a webpage.',
      groupRegion: 'Regional settings', groupSystem: 'Browser & device',
      maximum: 'Maximum points', contribution: 'Points added', observed: 'Observation',
      checkCount: 'Eight local checks', points: 'points', maxShort: 'max', duration: 'About 5 seconds', from: 'out of',
      readyNote: 'A look at your browser settings. No account access required.',
      howHeading: 'Understand what the score means.',
      howBody: 'Each check has a different weight. A score describes visible settings, not the status of your Claude account.',
      terms: 'Check your shell separately.',
      termsBody: 'Proxy variables and DNS settings are outside a browser’s reach. Inspect them with these optional commands.',
      faqHeading: 'Questions you might have.',
      shareTitle: 'Share a simple summary.',
      shareBody: 'Your score and matched signals. Raw browser observations are excluded.',
      privacy: 'About privacy', inProgress: 'Check in progress', allDone: 'All eight checks complete',
      dark: 'Use dark appearance', light: 'Use light appearance',
      sampleProgress: 'Progress preview', sampleResult: 'Sample result', ui: 'UI preview',
      partial: 'Seven of eight checks available', footer: 'Independent browser diagnostic.',
      readyStatus: 'Not checked', checkedStatus: 'Checked', matchedStatus: 'Matched',
      reportNote: 'Every point, explained.', copyFor: 'Copy a summary for', shareTo: 'Share to',
      save: 'Save image', stateLabel: 'State'
    },
    zh: {
      overview: '概览', report: '报告', headline: '看清你的浏览器。', reportHeadline: '看清浏览器设置。',
      intro: '查看八项浏览器信号，了解环境分数来自哪些设置。',
      region: '语言与区域', system: '浏览器与系统', rendering: '文字渲染',
      regionBody: '浏览器中的语言、区域和文字渲染偏好。', systemBody: '网页可见的时间、浏览器和操作系统信息。',
      groupRegion: '区域设置', groupSystem: '浏览器与设备', maximum: '最高分数', contribution: '贡献分数', observed: '观察结果',
      checkCount: '八项本机检查', points: '分', maxShort: '最高', duration: '约 5 秒', from: '共', readyNote: '查看浏览器设置，无需访问账号。',
      howHeading: '理解分数的含义。', howBody: '每项检查的权重不同。分数描述的是可见设置，而不是你的 Claude 账号状态。',
      terms: '单独查看终端环境。', termsBody: '浏览器无法读取代理变量和 DNS 设置。你可以用这些可选命令自行检查。',
      faqHeading: '你可能想知道。', shareTitle: '分享一份简单摘要。', shareBody: '只分享分数和匹配信号，不包含原始浏览器信息。',
      privacy: '关于隐私', inProgress: '正在检查', allDone: '八项检查已完成', dark: '使用深色外观', light: '使用浅色外观',
      sampleProgress: '进度预览', sampleResult: '结果示例', ui: '界面预览', partial: '八项中有七项可用', footer: '独立的浏览器环境检查。',
      readyStatus: '未检查', checkedStatus: '已检查', matchedStatus: '已匹配', reportNote: '每一分，都有说明。',
      copyFor: '复制摘要文案', shareTo: '分享到', save: '保存图片', stateLabel: '状态'
    }
  };
  const copy = () => texts[zh ? 'zh' : 'en'];
  const clean = value => escapeHtml(String(value).replace(/[—–]/g, '-'));
  const glyph = name => `<svg class="taste-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="/taste-assets/tabler.svg#${name}"></use></svg>`;
  const isActive = key => key === 'D' || key === 'E';
  const effectiveTheme = () => theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;

  function applyTheme() {
    document.body.dataset.tasteTheme = effectiveTheme();
  }

  function header() {
    const c = copy();
    const query = location.search;
    const dark = effectiveTheme() === 'dark';
    return `<header class="taste-header"><a class="taste-brand" href="/${query}" aria-label="screw/claude"><span class="taste-brand-mark">${icon('mark')}</span><span>screw<span class="taste-brand-slash">/</span>claude</span></a><nav class="taste-nav" aria-label="${zh ? '主导航' : 'Main navigation'}"><a href="#check">${t.check}</a><a href="#how">${t.how}</a><a href="#faq">${t.faq}</a></nav><div class="taste-header-tools"><button class="taste-icon-button" data-taste-action="theme" aria-label="${dark ? c.light : c.dark}" title="${dark ? c.light : c.dark}">${glyph(dark ? 'sun' : 'moon')}</button><nav class="taste-languages" aria-label="${zh ? '语言' : 'Language'}"><a href="/${query}" ${!zh ? 'aria-current="page"' : ''}>EN</a><a href="/zh/${query}" ${zh ? 'aria-current="page"' : ''}>中文</a></nav></div></header>`;
  }

  function buttons() {
    if (state === 'idle' || state === 'error') return `<button class="taste-button taste-primary" data-action="start">${state === 'error' ? t.retry : t.start}${glyph('arrow-right')}</button>`;
    if (state === 'running') return `<span class="taste-progress-caption">${t.currentCheck}</span>`;
    return `<button class="taste-button taste-primary" data-action="share">${glyph('upload')}${t.share}</button><button class="taste-button taste-secondary" data-action="reset">${glyph('refresh')}${t.again}</button>`;
  }

  function statePanel(mode) {
    const c = copy();
    const result = fixtures[state];
    const ready = state === 'idle';
    const running = state === 'running';
    const error = state === 'error';
    const heading = ready ? t.ready : running ? t.running : error ? t.errorTitle : t[result.band + 'Heading'];
    const description = ready ? c.readyNote : running ? t.runningBody : error ? t.errorBody : state === 'partial' ? t.partialBody : t[result.band + 'Body'];
    const stateLabel = ready ? c.checkCount : running ? c.sampleProgress : error ? c.ui : c.sampleResult;
    const metric = result ? `<div class="taste-score"><strong>${result.score}</strong><span>/ 100</span></div>` : running ? `<div class="taste-score taste-progress-number"><strong>3</strong><span>/ 8</span></div>` : '';
    return `<section class="taste-state scan-panel ${result ? 'has-result' : ''} ${running ? 'is-running' : ''} ${error ? 'is-error' : ''} taste-${mode}-state" aria-label="${t.environment}" aria-live="polite"><div class="taste-state-top"><span>${stateLabel}</span>${result ? `<span class="taste-band">${t[result.band]}</span>` : running ? `<span>${c.inProgress}</span>` : ''}</div><div class="taste-state-body">${metric}<div class="taste-state-copy"><h2>${heading}</h2><p>${description}</p>${state === 'partial' ? `<span class="taste-partial">${glyph('alert-triangle')}${c.partial}</span>` : ''}</div></div><div class="taste-actions panel-actions">${buttons()}</div>${ready ? `<p class="taste-runtime">${c.duration}</p>` : ''}</section>`;
  }

  function reading(index) {
    const c = copy();
    const result = fixtures[state];
    const completed = !!result || (state === 'running' && index < 3);
    const active = state === 'running' && index === 3;
    const unavailable = state === 'partial' && index === 2;
    const matched = !!result && result.matched.includes(index);
    const value = result ? result.values[index] : completed ? fixtures.low.values[index] : active ? (zh ? '检查中…' : 'Checking…') : t.signalDetails[index];
    const points = result ? result.points[index] : weights[index];
    const status = unavailable ? t.unavailable : active ? c.inProgress : matched ? c.matchedStatus : completed ? c.checkedStatus : c.readyStatus;
    return `<div class="taste-reading ${matched ? 'has-match' : ''} ${active ? 'is-active' : ''} ${unavailable ? 'is-unavailable' : ''}" data-signal="${index}"><dt>${t.signalNames[index]}</dt><dd class="taste-reading-value ${completed ? 'is-observation' : ''}">${clean(value)}</dd><dd class="taste-reading-points"><strong>${result ? '+' : ''}${points}</strong><span>${result ? `${c.from} ${weights[index]}` : c.maxShort}</span><span class="taste-sr-only">${result ? c.contribution : c.maximum}</span></dd><dd class="taste-reading-status">${active ? glyph('refresh') : completed && !unavailable ? glyph('check') : ''}${status}</dd></div>`;
  }

  function overviewReadings() {
    const c = copy();
    return `<section class="taste-observations" aria-labelledby="taste-signals-title"><div class="taste-section-title"><h2 id="taste-signals-title">${t.signals}</h2></div><div class="taste-overview-groups">${[[c.region, c.regionBody, [0,1,2,3]], [c.system, c.systemBody, [4,5,6,7]]].map(([title, body, indices]) => `<section class="taste-overview-group"><h3>${title}</h3><p>${body}</p><dl class="taste-overview-readings">${indices.map(reading).join('')}</dl></section>`).join('')}</div></section>`;
  }

  function reportReadings() {
    const c = copy();
    return `<section class="taste-report-observations" aria-labelledby="taste-signals-title"><div class="taste-section-title"><h2 id="taste-signals-title">${t.signals}</h2></div>${[[c.groupRegion, [0,1,3,4]], [c.rendering, [2,7]], [c.groupSystem, [5,6]]].map(([title, indices]) => `<section class="taste-report-group"><h3>${title}</h3><dl class="taste-report-readings">${indices.map(reading).join('')}</dl></section>`).join('')}</section>`;
  }

  function explanation() {
    const c = copy();
    return `<section id="how" class="taste-how"><div class="taste-how-intro"><h2>${c.howHeading}</h2><p>${c.howBody}</p></div><div class="taste-how-content">${[[t.method, t.methodBody], [t.scope, t.scopeBody], [t.privacyTitle, t.privacyBody]].map(([heading, body], index) => `<details class="taste-details" ${index === 0 ? 'open' : ''}><summary>${heading}${glyph('chevron-down')}</summary><p>${clean(body)}</p></details>`).join('')}</div></section>`;
  }

  function terminal() {
    const c = copy();
    return `<section class="taste-terminal"><div><h2>${c.terms}</h2><p>${c.termsBody}</p></div><details class="taste-details taste-terminal-details"><summary>${t.terminalToggle}${glyph('chevron-down')}</summary><div class="taste-commands"><p class="taste-terminal-note">${t.unix}</p>${commands.map((command, index) => `<article class="taste-command"><div><h3>${t.commandTitles[index]}</h3><button class="taste-icon-button" aria-label="${t.copy}: ${t.commandTitles[index]}" title="${t.prototype}" disabled>${glyph('copy')}</button></div><p>${t.commandDescriptions[index]}</p><pre tabindex="0"><code>${clean(command)}</code></pre></article>`).join('')}</div></details></section>`;
  }

  function faq() {
    const c = copy();
    const item = ([question, answer]) => `<details class="taste-details taste-faq-item"><summary>${question}${glyph('chevron-down')}</summary><p>${clean(answer)}</p></details>`;
    return `<section id="faq" class="taste-faq"><h2>${c.faqHeading}</h2><div class="taste-faq-columns"><div>${t.faqs.slice(0, 4).map(item).join('')}</div><div>${t.faqs.slice(4).map(item).join('')}</div></div><a class="taste-support" href="https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals" target="_blank" rel="noopener noreferrer">${t.support}${glyph('external-link')}</a></section>`;
  }

  function footer() {
    return `<footer class="taste-footer"><span>${copy().footer}</span><span>${t.footerNote}</span></footer>`;
  }

  function overview() {
    const c = copy();
    return `<div class="taste-page taste-overview">${header()}<main class="taste-main"><section id="check" class="taste-overview-hero"><div class="taste-hero-copy"><h1>${c.headline}</h1><p>${c.intro}</p></div>${statePanel('overview')}</section>${overviewReadings()}<p class="taste-limit">${glyph('info-circle')}${t.limit} ${t.limitBody}</p>${explanation()}${terminal()}${faq()}</main>${footer()}</div>`;
  }

  function report() {
    const c = copy();
    return `<div class="taste-page taste-report">${header()}<main class="taste-main"><section id="check" class="taste-report-hero"><h1>${c.reportHeadline}</h1><p>${c.intro}</p>${statePanel('report')}</section>${reportReadings()}<p class="taste-limit">${glyph('info-circle')}${t.limit} ${t.limitBody}</p>${explanation()}${terminal()}${faq()}</main>${footer()}</div>`;
  }

  function reviewBar() {
    const c = copy();
    return `<aside class="prototype-switcher taste-review" aria-label="${t.prototype}"><span class="review-badge">${t.prototype}</span><div class="design-switch"><button class="switch-arrow" data-action="previous" aria-label="${t.prev}">${glyph('chevron-left')}</button><span class="variant-label">${variant}<span> ${variant === 'D' ? c.overview : c.report}</span></span><button class="switch-arrow" data-action="next" aria-label="${t.next}">${glyph('chevron-right')}</button></div><div class="state-switch"><label for="preview-state">${c.stateLabel}</label><select id="preview-state" aria-label="${t.preview}">${states.map((value, index) => `<option value="${value}" ${state === value ? 'selected' : ''}>${t.states[index]}</option>`).join('')}</select></div></aside>`;
  }

  function shareDialog() {
    const c = copy();
    const result = fixtures[state] || fixtures.low;
    return `<dialog id="share-dialog" class="taste-dialog" aria-labelledby="share-title"><div class="taste-dialog-heading"><span>${c.sampleResult}</span><button class="taste-icon-button" data-action="close" aria-label="${t.close}">${glyph('x')}</button></div><h2 id="share-title">${c.shareTitle}</h2><p>${c.shareBody}</p><div class="taste-share-card"><span class="taste-share-brand">screw/claude</span><div class="taste-share-score"><strong>${result.score}<small>/ 100</small></strong><span>${t[result.band]}</span></div><p>${t[result.band + 'Heading']}</p><ul>${result.matched.map(index => `<li>${t.signalNames[index]}</li>`).join('')}</ul><span class="taste-share-limit">${t.limit}</span></div><p class="taste-share-label">${c.shareTo}</p><div class="taste-share-platforms">${['X', 'Facebook', 'Telegram', 'Weibo'].map(platform => `<button class="taste-button taste-secondary" disabled>${platform}</button>`).join('')}</div><p class="taste-share-label">${c.copyFor}</p><div class="taste-share-platforms">${['RED', 'Douyin', 'Jike'].map(platform => `<button class="taste-button taste-secondary" disabled>${platform}</button>`).join('')}</div><button class="taste-button taste-primary taste-save" disabled>${glyph('download')}${c.save}</button></dialog>`;
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('[data-taste-action="theme"]')) return;
    theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
    const url = new URL(location.href);
    url.searchParams.set('theme', theme);
    history.replaceState(null, '', url);
    render();
    document.querySelector('[data-taste-action="theme"]')?.focus({preventScroll: true});
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme === 'auto' && isActive(variant)) render();
  });
  return {isActive, applyTheme, overview, report, reviewBar, shareDialog, copy, glyph};
})();
