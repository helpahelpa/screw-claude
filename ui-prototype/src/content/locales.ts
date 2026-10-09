/* Locale dictionaries.
 *
 * Every human-readable string lives here: result explanations, detector names,
 * error messages, copy outcomes, share text, image text, command descriptions,
 * FAQ answers, privacy text and page metadata. The content language comes from
 * the route and never from the detected browser locale.
 */

import { basePathFrom } from './paths.ts';

export type LocaleId = 'en' | 'zh' | 'ru';

export interface Messages {
  /* metadata */
  title: string;
  description: string;
  languageLabel: string;

  /* introduction */
  skipToContent: string;
  headline: string;
  headlineAccent: string;
  intro: string;
  start: string;
  duration: string;

  /* checks */
  scopeHeading: string;
  signalNames: string[];
  signalDetails: string[];
  checking: string;
  currentCheck: string;
  progress: string;
  inProgress: string;

  /* result */
  resultLabel: string;
  outOf: string;
  bandLow: string;
  bandMedium: string;
  bandHigh: string;
  bodyLow: string;
  bodyMedium: string;
  bodyHigh: string;
  partialLabel: string;
  partialBody: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  again: string;
  share: string;
  sampleNotice: string;

  /* observations */
  observationsHeading: string;
  findingsHeading: string;
  findingsNone: string;
  regionsHeading: string;
  regionsNone: string;
  observedLabel: string;
  weightLabel: string;
  pointsLabel: string;
  pointsOfWeight: string;
  severityLabel: string;
  statusAvailable: string;
  errorFallback: string;
  statusUnavailable: string;
  statusError: string;
  statusPending: string;
  statusRunning: string;
  severityLow: string;
  severityMedium: string;
  severityHigh: string;
  noMatchingFonts: string;
  noneMatched: string;

  /* education */
  methodHeading: string;
  methodBody: string;
  profilesHeading: string;
  profilesBody: string;
  profileCn: string;
  profileRu: string;
  limitsHeading: string;
  limitsBody: string;
  privacyHeading: string;
  privacyBody: string;

  /* terminal */
  terminalHeading: string;
  terminalBody: string;
  terminalUnix: string;
  commandEndpoint: string;
  commandTime: string;
  commandDns: string;
  commandEndpointNote: string;
  commandTimeNote: string;
  commandDnsNote: string;
  copyCommand: string;
  copied: string;
  copyFailed: string;

  /* faq and support */
  faqHeading: string;
  faqs: [string, string][];
  support: string;
  footer: string;
  footerNote: string;

  /* sharing */
  shareHeading: string;
  shareBody: string;
  shareNative: string;
  shareNativeUnavailable: string;
  shareTo: string;
  copyFor: string;
  saveImage: string;
  shareScoreLabel: string;
  shareMatchedLabel: string;
  shareUrlLabel: string;
  shareGeneratedNote: string;
  shareSummary: string;
  shareSummaryNoSignals: string;
  copyTextDone: string;
  copyTextFailed: string;
  nativeShareDone: string;
  nativeShareCanceled: string;
  nativeShareFailed: string;
  imagePreparing: string;
  imageSaved: string;
  imageCopied: string;
  imageCanceled: string;
  imageFailed: string;
  platformNames: Record<'x' | 'facebook' | 'telegram' | 'weibo' | 'red' | 'douyin' | 'jike', string>;
  hashtags: Record<'red' | 'douyin' | 'jike', string[]>;

  /* detector labels */
  labels: Record<string, string>;

  /* review-only presentation */
  reviewLabel: string;
  reviewStates: string[];
  reviewPrevious: string;
  reviewNext: string;
  close: string;
}

export const LOCALE_ROUTES: Record<LocaleId, string> = { en: '/', zh: '/zh/', ru: '/ru/' };
export const HTML_LANG: Record<LocaleId, string> = { en: 'en', zh: 'zh-CN', ru: 'ru' };
export const DEFAULT_LOCALE: LocaleId = 'en';

export const LANGUAGE_LINKS: { id: LocaleId; label: string; name: string }[] = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'zh', label: '中文', name: '简体中文' },
  { id: 'ru', label: 'RU', name: 'Русский' },
];

const LABELS_EN: Record<string, string> = {
  wechat: 'WeChat',
  qq: 'QQ Browser',
  quark: 'Quark',
  uc: 'UC Browser',
  baidu: 'Baidu Browser',
  sogou: 'Sogou Explorer',
  threeSixty: '360 Browser',
  twoThreeFourFive: '2345 Explorer',
  miBrowser: 'Mi Browser',
  huawei: 'Huawei Browser',
  oppo: 'OPPO Browser',
  vivo: 'vivo Browser',
  yandex: 'Yandex Browser',
  chromiumGost: 'Chromium GOST',
  sber: 'SberBrowser',
  atom: 'Atom / Mail.ru (Chromium)',
  vkWebview: 'VK or OK in-app view',
  edge: 'Edge',
  chrome: 'Chrome',
  safari: 'Safari',
  firefox: 'Firefox',
  unknown: 'Not recognised',
  harmonyos: 'HarmonyOS',
  huaweiHonor: 'Huawei or Honor',
  xiaomi: 'Xiaomi or Redmi',
  oppoFamily: 'OPPO, OnePlus or realme',
  vivoIqoo: 'vivo or iQOO',
  meizu: 'Meizu',
  russianBrands: 'Russian-market brand',
  transsion: 'Transsion (Tecno, Infinix, itel)',
  unavailable: 'Not exposed',
  apple: 'Apple',
  microsoft: 'Microsoft',
  google: 'Google',
  linux: 'Linux or other',
};

const LABELS_ZH: Record<string, string> = {
  wechat: '微信',
  qq: 'QQ 浏览器',
  quark: '夸克浏览器',
  uc: 'UC 浏览器',
  baidu: '百度浏览器',
  sogou: '搜狗浏览器',
  threeSixty: '360 浏览器',
  twoThreeFourFive: '2345 浏览器',
  miBrowser: '小米浏览器',
  huawei: '华为浏览器',
  oppo: 'OPPO 浏览器',
  vivo: 'vivo 浏览器',
  yandex: 'Yandex 浏览器',
  chromiumGost: 'Chromium GOST',
  sber: 'SberBrowser',
  atom: 'Atom / Mail.ru (Chromium)',
  vkWebview: 'VK 或 OK 应用内视图',
  edge: 'Edge',
  chrome: 'Chrome',
  safari: 'Safari',
  firefox: 'Firefox',
  unknown: '未能识别',
  harmonyos: 'HarmonyOS',
  huaweiHonor: '华为或荣耀',
  xiaomi: '小米或 Redmi',
  oppoFamily: 'OPPO、一加或 realme',
  vivoIqoo: 'vivo 或 iQOO',
  meizu: '魅族',
  russianBrands: '俄罗斯市场品牌',
  transsion: '传音（Tecno、Infinix、itel）',
  unavailable: '未公开',
  apple: '苹果',
  microsoft: '微软',
  google: '谷歌',
  linux: 'Linux 或其他',
};

const LABELS_RU: Record<string, string> = {
  wechat: 'WeChat',
  qq: 'QQ Browser',
  quark: 'Quark',
  uc: 'UC Browser',
  baidu: 'Baidu Browser',
  sogou: 'Sogou Explorer',
  threeSixty: '360 Browser',
  twoThreeFourFive: '2345 Explorer',
  miBrowser: 'Mi Browser',
  huawei: 'Huawei Browser',
  oppo: 'OPPO Browser',
  vivo: 'vivo Browser',
  yandex: 'Yandex Browser',
  chromiumGost: 'Chromium GOST',
  sber: 'SberBrowser',
  atom: 'Atom / Mail.ru (Chromium)',
  vkWebview: 'встроенный просмотр VK или OK',
  edge: 'Edge',
  chrome: 'Chrome',
  safari: 'Safari',
  firefox: 'Firefox',
  unknown: 'не распознан',
  harmonyos: 'HarmonyOS',
  huaweiHonor: 'Huawei или Honor',
  xiaomi: 'Xiaomi или Redmi',
  oppoFamily: 'OPPO, OnePlus или realme',
  vivoIqoo: 'vivo или iQOO',
  meizu: 'Meizu',
  russianBrands: 'бренд для рынка России',
  transsion: 'Transsion (Tecno, Infinix, itel)',
  unavailable: 'не сообщается',
  apple: 'Apple',
  microsoft: 'Microsoft',
  google: 'Google',
  linux: 'Linux или другая',
};

const EN: Messages = {
  title: 'screw/claude — What does your browser give away?',
  description:
    'Nine local checks read the settings your browser exposes, score them from 0 to 100, and explain every point. Everything runs on your device.',
  languageLabel: 'Language',

  skipToContent: 'Skip to the check',
  headline: 'Your browser,',
  headlineAccent: 'made visible.',
  intro:
    'Nine local checks read the settings this browser makes visible, score them from 0 to 100, and show where every point came from. Nothing leaves your device.',
  start: 'Check my browser',
  duration: '9 checks · about 5 seconds',

  scopeHeading: 'What gets checked',
  signalNames: [
    'Timezone',
    'Languages',
    'Font rendering',
    'Speech voices',
    'Default locale',
    'UTC offset',
    'Browser family',
    'Device family',
    'Emoji style',
  ],
  signalDetails: [
    'The timezone this browser reports',
    'Your preferred browser languages',
    'Regional font rendering available here',
    'Local speech voices installed',
    'The browser’s default Intl locale',
    'Your clock’s offset from UTC',
    'An estimate from the user agent',
    'An estimate of device or platform',
    'An estimate of OS emoji style',
  ],
  checking: 'Checking…',
  currentCheck: 'Checking {name}…',
  progress: '{done} of {total} checks',
  inProgress: 'Check in progress',

  resultLabel: 'Environment score',
  outOf: '/ 100',
  bandLow: 'Low signal',
  bandMedium: 'Medium signal',
  bandHigh: 'High signal',
  bodyLow:
    'Few weighted signals matched. In this heuristic, the browser environment leaves a light footprint.',
  bodyMedium:
    'Several settings contributed to the score. The findings below show exactly which ones, and how much each added.',
  bodyHigh:
    'Many weighted signals matched. A high score describes visible settings only; it is not a statement about your account.',
  partialLabel: 'Partial result',
  partialBody:
    'Not every check could be observed: {names}. Missing checks add no points, so read the total as a lower bound.',
  errorTitle: 'That check didn’t finish.',
  errorBody:
    'Something interrupted the run before it produced a result. Nothing was sent anywhere. You can start over whenever you like.',
  retry: 'Try again',
  again: 'Check again',
  share: 'Share result',
  sampleNotice: 'Sample result for review. No scan ran.',

  observationsHeading: 'All nine observations',
  findingsHeading: 'Matched findings',
  findingsNone: 'No weighted finding matched. The observations below still show what this browser exposes.',
  regionsHeading: 'Region profiles consistent with the result',
  regionsNone: 'No region profile matched a weighted signal.',
  observedLabel: 'Observation',
  weightLabel: 'Weight',
  pointsLabel: 'Points',
  pointsOfWeight: 'of {weight}',
  severityLabel: 'Severity',
  statusAvailable: 'Available',
  statusUnavailable: 'Unavailable',
  statusError: 'Failed',
  errorFallback: 'The scan could not start in this browser. Reload the page and try again.',
  statusPending: 'Pending',
  statusRunning: 'Running',
  severityLow: 'Low',
  severityMedium: 'Medium',
  severityHigh: 'High',
  noMatchingFonts: 'No matching fonts',
  noneMatched: 'Nothing matched',

  methodHeading: 'How the score works',
  methodBody:
    'Each check produces a strength from 0 to 1 and contributes Math.round(strength × weight) points. The weights add up to 100 and the total is clamped to the 0–100 range. Bands: low 0–30, medium 31–60, high 61–100. A check counts as a matched finding from a strength of 0.25, and individual checks are labelled low below 0.25, medium below 0.6, and high at 0.6 or above.',
  profilesHeading: 'Where the region profiles come from',
  profilesBody:
    'The rules compare observations with versioned region profiles: timezone sets, language trees, font candidates, voice languages, locale prefixes, browser markers, device markers and UTC offsets. Every profile is evaluated for every signal and the strongest match wins, so one observation never scores twice. Shipped profiles: {profiles}. A matched finding names the profile it is consistent with, which is why the same browser can match one profile strongly and another weakly.',
  profileCn: 'China profile',
  profileRu: 'Russia profile',
  limitsHeading: 'What this cannot tell you',
  limitsBody:
    'These are heuristics about browser signals. They are not a measurement of nationality, location, or account status. User agent hints can be missing, generic or modified; privacy protections and containerised browsers reduce what is visible. When a check cannot run it is reported as unavailable rather than as absence, and the overall result is marked partial. Reports about timezone checks inside a service may exist, but this page is independent of that service and cannot establish how it behaves.',
  privacyHeading: 'What stays on this device',
  privacyBody:
    'Observations and results live in memory in this page. They are not sent in requests, beacons, analytics events, error reports, query strings, cookies or browser storage. Sharing is the exception, and only when you choose it: a summary you can read first goes to the destination you pick. Loading the page still makes ordinary requests to its host, and page analytics stay off unless the deployment enables them.',

  terminalHeading: 'Check the shell separately',
  terminalBody:
    'A web page cannot read your shell’s proxy variables, clock or DNS configuration. These three optional commands run in your own terminal; this page never executes them and never receives their output.',
  terminalUnix: 'For a Unix-like shell. Copy only the commands you want to inspect.',
  commandEndpoint: 'Endpoint & proxy',
  commandTime: 'Time & locale',
  commandDns: 'DNS lookup',
  commandEndpointNote: 'See the endpoint and proxy variables set in your shell.',
  commandTimeNote: 'Compare your shell clock, Intl settings and system locale.',
  commandDnsNote: 'Inspect the DNS response for the API hostname.',
  copyCommand: 'Copy command',
  copied: 'Copied',
  copyFailed: 'Copy failed',

  faqHeading: 'Questions you might have',
  faqs: [
    [
      'Why look at my timezone?',
      'Timezone is one browser-visible setting discussed in reports about environment checks. This page makes it easy to inspect. It cannot establish whether, or how, a service uses that setting.',
    ],
    [
      'Is this the same check the service uses?',
      'No. This is an independent heuristic built from visible browser settings. It has no access to a service’s internal systems, and its score cannot reproduce an internal decision.',
    ],
    [
      'Can a high score still mean normal access?',
      'Yes. The score describes a collection of browser signals, not the status of an account. A high score can coexist with normal access.',
    ],
    [
      'Which settings affect the result?',
      'System timezone, browser language order, installed and renderable fonts, local speech voices, default locale, user agent, platform and operating system all feed the observations. Privacy protections, sandboxed browsers and modified user agents can leave some observations incomplete.',
    ],
    [
      'Why are the terminal checks separate?',
      'A web page cannot read your shell’s proxy variables, clock or DNS responses. The commands let you inspect those yourself. This page never executes them and never receives their output.',
    ],
    [
      'What if my account is restricted?',
      'Only the service can explain a restriction on an account. Follow the official guidance on safeguards, warnings and appeals rather than drawing a conclusion from this score.',
    ],
    [
      'Does any of this leave my device?',
      'Observations and results stay in memory on this device. If you choose to share, a summary goes to the destination you select. Loading the page makes ordinary requests to its host, and analytics are off by default and never receive scan data.',
    ],
  ],
  support: 'Official account support',
  footer: 'A little more understanding. A little less guesswork.',
  footerNote: 'Independent of Anthropic.',

  shareHeading: 'Share a simple summary',
  shareBody:
    'The summary carries your score, its band and the matched signal names, plus a link to this page. Raw observations, font lists and the user agent stay here.',
  shareNative: 'Share…',
  shareNativeUnavailable: 'This browser has no share sheet',
  shareTo: 'Share to',
  copyFor: 'Copy text for',
  saveImage: 'Save result image',
  shareScoreLabel: 'Score',
  shareMatchedLabel: 'Matched',
  shareUrlLabel: 'Link',
  shareGeneratedNote: 'Generated on your device.',
  shareSummary: 'My browser environment score: {score}/100 ({band}). Matched: {signals}.',
  shareSummaryNoSignals: 'My browser environment score: {score}/100 ({band}).',
  copyTextDone: 'Summary copied',
  copyTextFailed: 'Copying was blocked. Select the text to copy it manually.',
  nativeShareDone: 'Shared',
  nativeShareCanceled: 'Sharing was canceled',
  nativeShareFailed: 'Sharing failed',
  imagePreparing: 'Preparing the image…',
  imageSaved: 'Image downloaded',
  imageCopied: 'Image copied to the clipboard',
  imageCanceled: 'Sharing was canceled',
  imageFailed: 'The image could not be prepared. Your result is unchanged.',
  platformNames: {
    x: 'X',
    facebook: 'Facebook',
    telegram: 'Telegram',
    weibo: 'Weibo',
    red: 'RED / Xiaohongshu',
    douyin: 'Douyin',
    jike: 'Jike',
  },
  hashtags: {
    red: ['#browserprivacy', '#environmentcheck'],
    douyin: ['#browsercheck', '#privacy'],
    jike: ['#browser', '#privacy'],
  },
  labels: LABELS_EN,
  reviewLabel: 'Preview state',
  reviewStates: ['Ready', 'Checking', 'Low result', 'Medium result', 'High result', 'Partial result', 'Error'],
  reviewPrevious: 'Previous preview',
  reviewNext: 'Next preview',
  close: 'Close',
};

const ZH: Messages = {
  title: 'screw/claude — 你的浏览器透露了什么？',
  description:
    '九项本机检查读取浏览器公开的设置，给出 0 到 100 的分数，并说明每一分的来源。全部过程都在你的设备上完成。',
  languageLabel: '语言',

  skipToContent: '跳到检测',
  headline: '看清你的浏览器，',
  headlineAccent: '它透露了什么。',
  intro:
    '九项本机检查读取浏览器公开的设置，给出 0 到 100 的分数，并说明每一分的来源。数据不会离开你的设备。',
  start: '检测我的浏览器',
  duration: '9 项检查 · 约 5 秒',

  scopeHeading: '检测内容',
  signalNames: [
    '时区',
    '语言偏好',
    '字体渲染',
    '语音合成',
    '默认区域',
    'UTC 偏移',
    '浏览器类型',
    '设备类型',
    '表情风格',
  ],
  signalDetails: [
    '浏览器报告的时区',
    '浏览器的首选语言顺序',
    '本机可渲染的区域字体',
    '本机安装的语音合成声音',
    '浏览器默认的 Intl 区域',
    '本地时间与 UTC 的差值',
    '根据用户代理估计',
    '估计的设备或平台',
    '估计的系统表情风格',
  ],
  checking: '检查中…',
  currentCheck: '正在检查{name}…',
  progress: '已完成 {done} / {total} 项',
  inProgress: '正在检测',

  resultLabel: '环境信号分数',
  outOf: '/ 100',
  bandLow: '低信号',
  bandMedium: '中等信号',
  bandHigh: '高信号',
  bodyLow: '匹配到的加权信号很少。在这套启发式规则中，该浏览器环境的特征较弱。',
  bodyMedium: '有若干设置产生了分数。下方的观察结果会说明每个匹配项以及各自贡献的分数。',
  bodyHigh: '匹配到的加权信号较多。高分只描述可见的设置，并不代表你的账号状态。',
  partialLabel: '部分结果',
  partialBody: '有项目无法读取：{names}。缺失项目不计分，因此总分应视为下限。',
  errorTitle: '这次检测未完成。',
  errorBody: '检测在给出结果前被中断。数据没有发送到任何地方。你可以随时重新开始。',
  retry: '重试',
  again: '重新检测',
  share: '分享结果',
  sampleNotice: '这是用于查看设计效果的示例结果，未执行检测。',

  observationsHeading: '九项观察结果',
  findingsHeading: '匹配到的信号',
  findingsNone: '没有加权信号匹配。下面的观察结果仍会展示该浏览器公开的信息。',
  regionsHeading: '与结果相符的区域画像',
  regionsNone: '没有区域画像与加权信号匹配。',
  observedLabel: '观察结果',
  weightLabel: '权重',
  pointsLabel: '分数',
  pointsOfWeight: '共 {weight}',
  severityLabel: '强度',
  statusAvailable: '已读取',
  statusUnavailable: '无法读取',
  statusError: '读取失败',
  errorFallback: '浏览器无法启动本次检查。请刷新页面后重试。',
  statusPending: '等待中',
  statusRunning: '读取中',
  severityLow: '低',
  severityMedium: '中',
  severityHigh: '高',
  noMatchingFonts: '无匹配字体',
  noneMatched: '无匹配',

  methodHeading: '分数怎么算',
  methodBody:
    '每项检查会给出 0 到 1 之间的信号强度，贡献 Math.round(强度 × 权重) 分。各项权重合计 100 分，总分限制在 0–100。等级划分：低 0–30，中 31–60，高 61–100。信号强度达到 0.25 时视为匹配；单项强度低于 0.25 记为低，低于 0.6 记为中，0.6 及以上记为高。',
  profilesHeading: '区域画像的来源',
  profilesBody:
    '规则会把观察结果与带版本的区域画像比对：时区集合、语言树、字体候选、语音语言、区域前缀、浏览器标记、设备标记和 UTC 偏移。每项信号都会在每个画像中单独评估，取最强匹配，因此同一观察不会被重复计分。当前提供：{profiles}。匹配到的信号会标注与其相符的画像，所以同一个浏览器可能在不同画像下得到不同强度。',
  profileCn: '中国大陆画像',
  profileRu: '俄罗斯画像',
  limitsHeading: '这套规则无法告诉你的事',
  limitsBody:
    '这些是关于浏览器信号的启发式规则，不用于判断国籍、所在地或账号状态。用户代理信息可能缺失、通用或被修改；隐私保护和沙箱浏览器会减少可见信息。检查无法执行时会标为「无法读取」，不会当作「没有该特征」，整体结果会标为部分结果。关于服务内部时区检查的讨论可能存在，但本页面与该服务相互独立，无法判断其行为。',
  privacyHeading: '哪些数据留在本机',
  privacyBody:
    '观察结果和分数只保存在本页面内存中，不会出现在请求、埋点、分析事件、错误上报、查询参数、Cookie 或浏览器存储里。只有你主动分享时例外：可先查看的摘要会发送到你选择的平台。加载页面仍会向托管服务器发出正常请求；除非部署时开启，页面分析默认关闭。',

  terminalHeading: '单独检查终端环境',
  terminalBody:
    '网页无法读取终端的代理变量、时间或 DNS 配置。以下三条命令为可选项，请在你自己的终端中执行；本页面不会执行命令，也不会接收输出。',
  terminalUnix: '适用于类 Unix 终端。只复制你想查看的命令。',
  commandEndpoint: '端点与代理',
  commandTime: '时间与区域',
  commandDns: 'DNS 查询',
  commandEndpointNote: '查看终端中设置的端点与代理环境变量。',
  commandTimeNote: '对比终端时间、Intl 设置和系统区域。',
  commandDnsNote: '查看 API 域名的 DNS 响应。',
  copyCommand: '复制命令',
  copied: '已复制',
  copyFailed: '复制失败',

  faqHeading: '你可能想知道',
  faqs: [
    [
      '为什么检查时区？',
      '时区是浏览器公开的设置之一，也常出现在关于环境检查的讨论中。本页面让你方便地查看这一项，但无法确定服务是否使用它、如何使用它。',
    ],
    [
      '这和服务内部的检查一样吗？',
      '不一样。这是基于浏览器可见设置的独立启发式规则，无法访问服务内部系统，分数也不能复现内部决策。',
    ],
    [
      '高分也可能正常使用吗？',
      '可以。分数描述的是浏览器信号的集合，不代表账号状态。高分与正常使用并不矛盾。',
    ],
    [
      '哪些设置会影响结果？',
      '系统时区、浏览器语言顺序、已安装且可渲染的字体、本机语音合成声音、默认区域、用户代理、平台和操作系统都会影响观察结果。隐私保护、沙箱浏览器或修改过的用户代理可能让部分信息不完整。',
    ],
    [
      '为什么终端检查是单独提供的？',
      '网页无法读取终端的代理变量、时间或 DNS 响应。命令供你自行查看；本页面不会执行命令，也不会接收输出。',
    ],
    [
      '账号受限了怎么办？',
      '只有服务方能够解释账号受到的限制。请查看官方的安全措施、警告与申诉指引，不要仅凭此分数下结论。',
    ],
    [
      '数据会离开设备吗？',
      '观察结果和分数只保存在本机内存中。主动分享时，摘要会发送到你选择的平台。加载页面仍会向托管服务器发出正常请求；分析统计默认关闭，且不会接收检测数据。',
    ],
  ],
  support: '官方账号支持',
  footer: '多一点理解，少一点猜测。',
  footerNote: '与 Anthropic 无关联。',

  shareHeading: '分享一份简单摘要',
  shareBody:
    '摘要包含分数、等级、匹配到的信号名称，以及本页链接。原始观察结果、字体列表和用户代理都会留在本机。',
  shareNative: '分享…',
  shareNativeUnavailable: '此浏览器不支持系统分享',
  shareTo: '分享到',
  copyFor: '复制文案到',
  saveImage: '保存结果图片',
  shareScoreLabel: '分数',
  shareMatchedLabel: '匹配信号',
  shareUrlLabel: '链接',
  shareGeneratedNote: '在本机生成。',
  shareSummary: '我的浏览器环境分数：{score}/100（{band}）。匹配信号：{signals}。',
  shareSummaryNoSignals: '我的浏览器环境分数：{score}/100（{band}）。',
  copyTextDone: '摘要已复制',
  copyTextFailed: '复制被阻止，可手动选择文本复制。',
  nativeShareDone: '已分享',
  nativeShareCanceled: '已取消分享',
  nativeShareFailed: '分享失败',
  imagePreparing: '正在生成图片…',
  imageSaved: '图片已下载',
  imageCopied: '图片已复制到剪贴板',
  imageCanceled: '已取消分享',
  imageFailed: '图片生成失败，检测结果不受影响。',
  platformNames: {
    x: 'X',
    facebook: 'Facebook',
    telegram: 'Telegram',
    weibo: '微博',
    red: '小红书',
    douyin: '抖音',
    jike: '即刻',
  },
  hashtags: {
    red: ['#浏览器环境', '#隐私自查'],
    douyin: ['#浏览器检测', '#隐私'],
    jike: ['#浏览器', '#环境检测'],
  },
  labels: LABELS_ZH,
  reviewLabel: '预览状态',
  reviewStates: ['待检测', '检测中', '低分结果', '中等结果', '高分结果', '部分结果', '错误'],
  reviewPrevious: '上一个预览',
  reviewNext: '下一个预览',
  close: '关闭',
};

const RU: Messages = {
  title: 'screw/claude — что выдаёт ваш браузер',
  description:
    'Девять локальных проверок читают настройки, которые браузер делает видимыми, оценивают их от 0 до 100 и объясняют каждый балл. Всё выполняется на вашем устройстве.',
  languageLabel: 'Язык',

  skipToContent: 'Перейти к проверке',
  headline: 'Что раскрывает',
  headlineAccent: 'ваш браузер.',
  intro:
    'Девять локальных проверок читают настройки, которые этот браузер делает видимыми, оценивают их от 0 до 100 и показывают, откуда взялся каждый балл. Данные не покидают устройство.',
  start: 'Проверить браузер',
  duration: '9 проверок · около 5 секунд',

  scopeHeading: 'Что проверяется',
  signalNames: [
    'Часовой пояс',
    'Языки',
    'Отрисовка шрифтов',
    'Голоса синтеза речи',
    'Язык по умолчанию',
    'Смещение UTC',
    'Семейство браузера',
    'Семейство устройства',
    'Стиль эмодзи',
  ],
  signalDetails: [
    'Часовой пояс, который сообщает браузер',
    'Порядок языков в браузере',
    'Доступная отрисовка региональных шрифтов',
    'Локальные голоса синтеза речи',
    'Региональные настройки Intl по умолчанию',
    'Смещение часов относительно UTC',
    'Оценка по строке User-Agent',
    'Предполагаемое устройство или платформа',
    'Оценка стиля эмодзи операционной системы',
  ],
  checking: 'Проверяется…',
  currentCheck: 'Проверяем: {name}…',
  progress: 'Проверок завершено: {done} из {total}',
  inProgress: 'Идёт проверка',

  resultLabel: 'Оценка среды',
  outOf: '/ 100',
  bandLow: 'Низкий уровень',
  bandMedium: 'Средний уровень',
  bandHigh: 'Высокий уровень',
  bodyLow: 'Совпало мало взвешенных признаков. В этих эвристических правилах среда браузера оставляет слабый след.',
  bodyMedium: 'Несколько настроек повлияли на оценку. Ниже видно, какие именно и сколько баллов дала каждая.',
  bodyHigh: 'Совпало много взвешенных признаков. Высокая оценка описывает только видимые настройки и ничего не говорит о состоянии аккаунта.',
  partialLabel: 'Частичный результат',
  partialBody:
    'Не все проверки удалось выполнить: {names}. Пропущенные проверки не добавляют баллов, поэтому считайте сумму нижней границей.',
  errorTitle: 'Проверка не завершилась.',
  errorBody:
    'Что-то прервало запуск до получения результата. Данные никуда не отправлялись. Можно начать заново в любой момент.',
  retry: 'Повторить',
  again: 'Проверить снова',
  share: 'Поделиться результатом',
  sampleNotice: 'Пример результата для просмотра. Проверка не выполнялась.',

  observationsHeading: 'Все девять наблюдений',
  findingsHeading: 'Совпавшие признаки',
  findingsNone: 'Ни один взвешенный признак не совпал. Наблюдения ниже всё равно показывают, что раскрывает этот браузер.',
  regionsHeading: 'Региональные профили, согласующиеся с результатом',
  regionsNone: 'Ни один региональный профиль не совпал со взвешенным признаком.',
  observedLabel: 'Наблюдение',
  weightLabel: 'Вес',
  pointsLabel: 'Баллы',
  pointsOfWeight: 'из {weight}',
  severityLabel: 'Выраженность',
  statusAvailable: 'Доступно',
  statusUnavailable: 'Недоступно',
  statusError: 'Ошибка',
  errorFallback: 'Браузер не смог запустить проверку. Обновите страницу и попробуйте ещё раз.',
  statusPending: 'Ожидание',
  statusRunning: 'Идёт чтение',
  severityLow: 'Низкая',
  severityMedium: 'Средняя',
  severityHigh: 'Высокая',
  noMatchingFonts: 'Подходящих шрифтов нет',
  noneMatched: 'Совпадений нет',

  methodHeading: 'Как считается оценка',
  methodBody:
    'Каждая проверка даёт силу признака от 0 до 1 и добавляет Math.round(сила × вес) баллов. Сумма весов — 100, итог ограничен диапазоном 0–100. Уровни: низкий 0–30, средний 31–60, высокий 61–100. Признак считается совпавшим при силе от 0,25; отдельная проверка помечается как низкая ниже 0,25, средняя ниже 0,6 и высокая от 0,6.',
  profilesHeading: 'Откуда берутся региональные профили',
  profilesBody:
    'Правила сравнивают наблюдения с версионированными региональными профилями: наборами часовых поясов, языковыми деревьями, кандидатами в шрифты, языками голосов, префиксами локалей, маркерами браузеров и устройств, смещениями UTC. Каждый признак оценивается внутри каждого профиля, и побеждает сильнейшее совпадение, поэтому одно наблюдение не даёт баллов дважды. Доступные профили: {profiles}. У совпавшего признака указан профиль, с которым он согласуется: поэтому один и тот же браузер может сильно совпасть с одним профилем и слабо — с другим.',
  profileCn: 'Профиль Китая',
  profileRu: 'Профиль России',
  limitsHeading: 'Чего это не показывает',
  limitsBody:
    'Это эвристические правила о признаках браузера. Они не определяют гражданство, местоположение или состояние аккаунта. Данные User-Agent могут отсутствовать, быть общими или изменёнными; защита приватности и изолированные браузеры уменьшают объём доступных сведений. Если проверку невозможно выполнить, она помечается как недоступная, а не как отсутствующая, и весь результат помечается частичным. Обсуждения внутренних проверок часового пояса могут существовать, но эта страница не связана с сервисом и не может судить о его работе.',
  privacyHeading: 'Что остаётся на устройстве',
  privacyBody:
    'Наблюдения и результаты живут в памяти страницы. Они не уходят в запросах, маячках, событиях аналитики, отчётах об ошибках, параметрах адреса, cookie или хранилище браузера. Исключение — ваш выбор поделиться: сначала доступная для просмотра сводка, затем выбранный вами сервис. Загрузка страницы по-прежнему создаёт обычные запросы к её серверу, а аналитика остаётся выключенной, если её не включит владелец сайта.',

  terminalHeading: 'Проверьте оболочку отдельно',
  terminalBody:
    'Веб-страница не может прочитать переменные прокси, время или настройки DNS вашей оболочки. Эти три необязательные команды выполняются в вашем терминале; страница их не запускает и не получает вывод.',
  terminalUnix: 'Для Unix-подобной оболочки. Копируйте только те команды, которые хотите проверить.',
  commandEndpoint: 'Адрес API и прокси',
  commandTime: 'Время и локаль',
  commandDns: 'Запрос DNS',
  commandEndpointNote: 'Посмотрите переменные адреса API и прокси в вашей оболочке.',
  commandTimeNote: 'Сравните время в оболочке, настройки Intl и системную локаль.',
  commandDnsNote: 'Посмотрите ответ DNS для домена API.',
  copyCommand: 'Копировать команду',
  copied: 'Скопировано',
  copyFailed: 'Не удалось скопировать',

  faqHeading: 'Возможные вопросы',
  faqs: [
    [
      'Зачем проверять часовой пояс?',
      'Часовой пояс — одна из видимых браузеру настроек, которую обсуждают в сообщениях о проверках среды. Эта страница помогает её посмотреть, но не может установить, использует ли её сервис и каким образом.',
    ],
    [
      'Это та же проверка, что и у сервиса?',
      'Нет. Это независимые эвристические правила на основе видимых настроек браузера. У них нет доступа к внутренним системам сервиса, и оценка не воспроизводит внутренние решения.',
    ],
    [
      'Может ли доступ работать при высокой оценке?',
      'Да. Оценка описывает набор признаков браузера, а не состояние аккаунта. Высокая оценка совместима с обычным доступом.',
    ],
    [
      'Какие настройки влияют на результат?',
      'Часовой пояс системы, порядок языков браузера, установленные и отрисовываемые шрифты, локальные голоса синтеза речи, язык по умолчанию, User-Agent, платформа и операционная система. Защита приватности, изолированные браузеры и изменённые User-Agent могут сделать часть наблюдений неполной.',
    ],
    [
      'Почему проверки в терминале отдельно?',
      'Веб-страница не может прочитать переменные прокси, время или ответы DNS вашей оболочки. Команды позволяют посмотреть это самостоятельно; страница их не выполняет и не получает вывод.',
    ],
    [
      'Что делать, если аккаунт ограничен?',
      'Только сам сервис может объяснить ограничение аккаунта. Обратитесь к официальным рекомендациям о мерах защиты, предупреждениях и обжаловании, а не делайте выводы по этой оценке.',
    ],
    [
      'Покидают ли эти данные устройство?',
      'Наблюдения и результаты остаются в памяти устройства. Если вы решите поделиться, сводка отправится в выбранное место. Загрузка страницы создаёт обычные запросы к её серверу, аналитика выключена по умолчанию и никогда не получает данные проверки.',
    ],
  ],
  support: 'Официальная поддержка аккаунта',
  footer: 'Больше понимания. Меньше догадок.',
  footerNote: 'Не связано с Anthropic.',

  shareHeading: 'Поделитесь краткой сводкой',
  shareBody:
    'В сводке есть оценка, уровень, названия совпавших признаков и ссылка на эту страницу. Исходные наблюдения, список шрифтов и User-Agent остаются здесь.',
  shareNative: 'Поделиться…',
  shareNativeUnavailable: 'В этом браузере нет системного меню «Поделиться»',
  shareTo: 'Поделиться в',
  copyFor: 'Копировать текст для',
  saveImage: 'Сохранить изображение',
  shareScoreLabel: 'Оценка',
  shareMatchedLabel: 'Совпадения',
  shareUrlLabel: 'Ссылка',
  shareGeneratedNote: 'Создано на вашем устройстве.',
  shareSummary: 'Моя оценка среды браузера: {score}/100 ({band}). Совпадения: {signals}.',
  shareSummaryNoSignals: 'Моя оценка среды браузера: {score}/100 ({band}).',
  copyTextDone: 'Сводка скопирована',
  copyTextFailed: 'Копирование заблокировано. Выделите текст и скопируйте его вручную.',
  nativeShareDone: 'Отправлено',
  nativeShareCanceled: 'Отправка отменена',
  nativeShareFailed: 'Не удалось поделиться',
  imagePreparing: 'Готовим изображение…',
  imageSaved: 'Изображение загружено',
  imageCopied: 'Изображение скопировано в буфер обмена',
  imageCanceled: 'Отправка отменена',
  imageFailed: 'Не удалось подготовить изображение. Результат не изменился.',
  platformNames: {
    x: 'X',
    facebook: 'Facebook',
    telegram: 'Telegram',
    weibo: 'Weibo',
    red: 'RED / Xiaohongshu',
    douyin: 'Douyin',
    jike: 'Jike',
  },
  hashtags: {
    red: ['#приватность', '#браузер'],
    douyin: ['#проверкабраузера', '#приватность'],
    jike: ['#браузер', '#приватность'],
  },
  labels: LABELS_RU,
  reviewLabel: 'Состояние',
  reviewStates: ['Готово', 'Проверка', 'Низкая оценка', 'Средняя оценка', 'Высокая оценка', 'Частичный результат', 'Ошибка'],
  reviewPrevious: 'Предыдущее состояние',
  reviewNext: 'Следующее состояние',
  close: 'Закрыть',
};

export const LOCALES: Record<LocaleId, Messages> = { en: EN, zh: ZH, ru: RU };

/**
 * Content language from the route, independent of any browser preference.
 * The mount point is stripped first, so `/zh/` and `/screw-claude/zh/` agree.
 */
export function localeFromPath(pathname: string): LocaleId {
  const base = basePathFrom(pathname);
  const rest = `/${(pathname || '/').slice(base.length).replace(/^\/+/, '')}`;
  const match = /^\/(zh|ru)(?:\/|$)/.exec(rest);
  return (match?.[1] as LocaleId) ?? DEFAULT_LOCALE;
}

export function localePath(locale: LocaleId): string {
  return LOCALE_ROUTES[locale] ?? LOCALE_ROUTES[DEFAULT_LOCALE];
}

/** Dictionary for a locale, falling back to English for unknown locales. */
export function dictionary(locale: LocaleId | string): Messages {
  return LOCALES[locale as LocaleId] ?? LOCALES[DEFAULT_LOCALE];
}

/** Replace `{name}` placeholders in a localized template. */
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

/** Resolve a detector label key, falling back to the key itself. */
export function labelText(messages: Messages, key: string | undefined | null): string {
  if (!key) return messages.labels.unavailable;
  return messages.labels[key] ?? key;
}
