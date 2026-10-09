/* THROWAWAY UI: original layouts plus additive Taste variants; no diagnostic logic. */
const locale = /^\/(zh|ru)(?:\/|$)/.exec(location.pathname)?.[1] || 'en';
const localePath = locale === 'en' ? '/' : `/${locale}/`;
const messages = {
  en: {
    languageLabel: 'Language', mainNavigation: 'Main navigation', sectionNavigation: 'Section navigation',
    checkDetails: 'Check details', scopeHeading: 'What gets checked', checking: 'Checking…',
    copied: 'Copied', copyFailed: 'Copy failed', pointsShort: 'pts', other: 'other',
    title: 'screw/claude — Browser clarity', check: 'Check', how: 'How it works', faq: 'FAQ',
    eyebrow: 'A LITTLE CLARITY FOR YOUR BROWSER', headline: 'What does your browser', headlineEm: 'give away?',
    intro: 'Timezone, language, fonts. Small signals tell a story. See what yours says in one simple check.',
    local: 'Stays on your device', private: 'No account needed', section: 'Your browser, at a glance',
    sectionNote: 'Eight signals. One clearer picture.', environment: 'BROWSER ENVIRONMENT',
    ready: 'Ready when you are.', readyBody: 'Take a closer look at the everyday settings your browser makes visible.',
    start: 'Check my browser', runtime: '8 checks · about 5 seconds', awaiting: 'Waiting to check',
    signals: 'The signals', weight: 'WEIGHT', findings: 'YOUR OBSERVATIONS', points: 'POINTS',
    running: 'Taking a closer look.', runningBody: 'Checking the settings that make up your browser environment.',
    runningLabel: 'CHECK IN PROGRESS', progress: '3 of 8 checks', currentCheck: 'Checking your default locale…',
    completed: 'Check complete', resultLabel: 'ENVIRONMENT SCORE', outOf: '/ 100', low: 'Low signal', medium: 'Medium signal', high: 'High signal',
    lowHeading: 'A pretty quiet footprint.', mediumHeading: 'A few signals stand out.', highHeading: 'A more distinct footprint.',
    lowBody: 'Few of the weighted signals appear in this example. Your browser environment leaves a light footprint.',
    mediumBody: 'Several settings contribute to this example score. The details show exactly where those points come from.',
    highBody: 'Multiple settings contribute to this example score. A higher score does not mean your account is restricted.',
    partial: 'Partial result', partialBody: 'Font rendering was unavailable. The other seven checks are shown; the missing check adds no points.',
    sample: 'Example result', sampleRunning: 'Example progress', again: 'Check again', share: 'Share result',
    errorTitle: 'That check didn’t finish.', errorBody: 'Something interrupted the check. You can start over whenever you’re ready.', retry: 'Try again',
    unavailable: 'Unavailable', noFonts: 'No matching fonts', checked: 'Checked', pending: 'Pending',
    limit: 'A signal score, not an account verdict.', limitBody: 'Browser settings can’t tell you whether an account will be restricted.',
    aboutEyebrow: 'UNDERSTAND THE CHECK', aboutTitle: 'A check,', aboutEm: 'not a verdict.',
    aboutBody: 'This is a weighted snapshot of browser settings. It helps you understand what’s visible, without guessing what happens inside Claude.',
    method: 'How the score works', methodBody: 'Each signal contributes up to its weight. The contributions add to a score from 0 to 100. Low: 0–30. Medium: 31–60. High: 61–100. A signal is counted as a match from a strength of 0.25. These bands describe the heuristic, not a probability.',
    scope: 'What it can see', scopeBody: 'The check covers your timezone, language preferences, available font rendering, locale, UTC offset, browser family, device family, and estimated OS emoji style. Browser and device labels are estimates.',
    privacyTitle: 'What stays private', privacyBody: 'The planned check runs locally. It does not need your Claude account, API key, or conversations. Observations stay on the device unless you choose to share a summary. This UI preview collects no observations.',
    terminalEyebrow: 'LOOK A LITTLE DEEPER', terminalTitle: 'Beyond the browser.', terminalBody: 'Your shell can tell a different story. These optional commands help you inspect the settings a browser can’t see.',
    terminalToggle: 'Terminal checks', unix: 'For a Unix-like shell. Run only the commands you want to inspect.', copy: 'Copy command',
    commandTitles: ['Endpoint & proxy', 'Time & locale', 'DNS resolution'],
    commandDescriptions: ['See the endpoint and proxy variables set in your shell.', 'Compare your shell clock, Intl settings, and system locale.', 'Inspect the DNS response for the API hostname.'],
    faqEyebrow: 'A FEW GOOD QUESTIONS', faqTitle: 'The details, without the guesswork.',
    faqs: [
      ['Why look at my timezone?', 'Timezone is one browser-visible setting discussed in reports about environment checks. This tool makes that setting easy to inspect. It cannot verify whether or how a service uses it.'],
      ['Is this the same check Claude uses?', 'No. This is an independent heuristic built from visible browser settings. It does not access Claude’s internal systems, and its score cannot reproduce an internal decision.'],
      ['Can a high score still mean normal access?', 'Yes. A score describes a collection of browser signals, not the status of your account. A high score can coexist with normal access.'],
      ['Which settings affect the result?', 'Your system timezone, browser language order, installed fonts, default locale, browser, and operating system can affect observations. Privacy protections or modified user agents can make some observations incomplete.'],
      ['Why are terminal checks separate?', 'A webpage cannot read your shell’s proxy variables or DNS setup. The terminal commands let you inspect those yourself; the page does not execute them or receive their output.'],
      ['What if my account is restricted?', 'Only the service can explain an account restriction. Follow Anthropic’s official guidance on safeguards, warnings, and appeals rather than drawing a conclusion from this score.'],
      ['Does any of my data leave my device?', 'The planned scan keeps observations in memory on your device. Choosing to share sends a summary to the destination you select. Loading the page still makes normal requests to its host. This prototype performs no scan and uses no analytics.']
    ],
    support: 'Official account support', footer: 'A little more understanding. A little less guesswork.', prototype: 'UI PROTOTYPE',
    designNames: ['Paper', 'Console', 'Focus', 'Overview', 'Report'], preview: 'Preview state', states: ['Ready', 'Checking', 'Low result', 'Medium result', 'High result', 'Partial result', 'Error'],
    prev: 'Previous design', next: 'Next design', shareTitle: 'A little clarity, shared.', shareBody: 'A summary of your score. Your raw browser details stay with you.',
    sharePlatforms: 'Share to', copyText: 'Copy text for', saveImage: 'Save result image', close: 'Close', shareSample: 'SAMPLE SHARE CARD', matched: 'Matched signal', matchedPlural: 'Matched signals',
    unavailableNotice: 'One check was unavailable', railTitle: 'BROWSER / INSPECTOR', railStatus: 'Local environment', railCaption: 'Know what’s visible.',
    weightsNote: 'Weights add up to 100 points.', footerNote: 'Independent of Anthropic.', fixtureNote: 'Sample data · no scan runs',
    scanSteps: ['Read browser settings', 'Review the eight signals', 'Understand your score'],
    signalNames: ['Timezone', 'Languages', 'Font rendering', 'Default locale', 'UTC offset', 'Browser family', 'Device family', 'Emoji style'],
    signalDetails: ['The timezone exposed by your browser', 'Your preferred browser languages', 'Available regional font rendering', 'Your browser’s default Intl locale', 'The clock’s offset from UTC', 'An estimate from the user agent', 'An estimate of your device or OS', 'An estimate of OS rendering style']
  },
  zh: {
    languageLabel: '语言', mainNavigation: '主导航', sectionNavigation: '章节导航',
    checkDetails: '检测详情', scopeHeading: '检测信号', checking: '检查中…',
    copied: '已复制', copyFailed: '复制失败', pointsShort: 'pts', other: 'other',
    title: 'screw/claude — 看清浏览器环境', check: '检测', how: '检测原理', faq: '常见问题',
    eyebrow: '让浏览器环境更清晰', headline: '你的浏览器，', headlineEm: '透露了什么？',
    intro: '时区、语言、字体。细小的信号也能勾勒出环境特征。一次简单检测，看清你的浏览器。',
    local: '数据留在本机', private: '无需登录', section: '一眼看清浏览器环境', sectionNote: '八项信号，一份清晰的结果。', environment: '浏览器环境',
    ready: '准备好了，就开始。', readyBody: '看看浏览器向网页提供了哪些日常设置。', start: '检测我的浏览器', runtime: '8 项检测 · 约 5 秒', awaiting: '等待检测',
    signals: '检测信号', weight: '权重', findings: '观察结果', points: '分数', running: '正在仔细看看。', runningBody: '正在检查构成浏览器环境的各项设置。',
    runningLabel: '正在检测', progress: '已完成 3 / 8 项', currentCheck: '正在检查默认区域设置…', completed: '检测完成', resultLabel: '环境信号分数', outOf: '/ 100', low: '低信号', medium: '中等信号', high: '高信号',
    lowHeading: '信号比较少。', mediumHeading: '有几项值得留意。', highHeading: '环境特征比较明显。',
    lowBody: '此示例中，仅少数加权信号有所匹配，整体环境特征较弱。', mediumBody: '此示例中，多项设置产生了分数。每项贡献都在详情中清楚列出。', highBody: '此示例中，多项设置产生了较高分数。高分不代表你的账号受到限制。',
    partial: '部分结果', partialBody: '无法读取字体渲染。其余七项已显示，缺失项目不计分。', sample: '示例结果', sampleRunning: '示例进度', again: '重新检测', share: '分享结果',
    errorTitle: '这次检测未完成。', errorBody: '检测过程被中断。你可以随时重新开始。', retry: '重试', unavailable: '无法读取', noFonts: '无匹配字体', checked: '已检查', pending: '等待中',
    limit: '这是信号分数，不是账号判断。', limitBody: '浏览器设置无法告诉你账号是否会受到限制。',
    aboutEyebrow: '理解这份检测', aboutTitle: '了解环境，', aboutEm: '不做定论。', aboutBody: '这是浏览器设置的加权快照。它帮你看清可见信息，但无法推测 Claude 内部如何做出决定。',
    method: '分数怎么算', methodBody: '每项信号最多贡献其权重对应的分数，合计范围为 0–100。低：0–30；中：31–60；高：61–100。信号强度达到 0.25 时视为匹配。这些等级描述的是启发式规则，不是概率。',
    scope: '能看到哪些信息', scopeBody: '检测包括时区、语言偏好、字体渲染、默认区域、UTC 偏移、浏览器类型、设备类型和估计的系统表情风格。浏览器与设备标签属于推断。',
    privacyTitle: '隐私如何保护', privacyBody: '计划中的检测在本机运行，不需要 Claude 账号、API 密钥或对话。除非你主动分享摘要，观察数据不会离开设备。此界面原型不收集任何观察数据。',
    terminalEyebrow: '再深入一点', terminalTitle: '浏览器之外。', terminalBody: '终端环境可能有所不同。这些可选命令帮助你检查网页无法读取的设置。', terminalToggle: '终端检查', unix: '适用于类 Unix 终端。只运行你想查看的命令。', copy: '复制命令',
    commandTitles: ['端点与代理', '时间与区域', 'DNS 解析'], commandDescriptions: ['查看终端中的端点与代理环境变量。', '对比终端时间、Intl 设置和系统区域。', '查看 API 域名的 DNS 响应。'],
    faqEyebrow: '几个常见问题', faqTitle: '看清细节，不靠猜测。',
    faqs: [
      ['为什么检查时区？', '时区是网页可见的设置，也出现在有关环境检查的讨论中。此工具帮助你查看这个设置，但无法验证服务是否或如何使用它。'],
      ['这和 Claude 的内部检测一样吗？', '不一样。这是基于可见浏览器设置的独立启发式规则，不访问 Claude 内部系统，也无法复现内部决策。'],
      ['高分也可能正常使用吗？', '可以。分数描述浏览器信号，不代表账号状态。高分与正常使用并不矛盾。'],
      ['哪些设置会影响结果？', '系统时区、浏览器语言顺序、字体、默认区域、浏览器和操作系统都可能影响观察结果。隐私保护或修改过的用户代理可能让部分信息不完整。'],
      ['为什么单独提供终端检查？', '网页无法读取终端的代理变量和 DNS 配置。命令供你自行查看，网页不会执行命令，也不会接收输出。'],
      ['账号受限了怎么办？', '只有服务方能解释账号限制。请查看 Anthropic 官方的安全措施、警告与申诉指引，不要仅凭此分数得出结论。'],
      ['数据会离开设备吗？', '计划中的检测把观察数据保存在设备内存中。主动分享时，摘要会发送到你选定的平台。加载网页仍会向托管服务器发出正常请求。此原型不进行检测，也没有分析追踪。']
    ],
    support: '官方账号支持', footer: '多一点理解，少一点猜测。', prototype: '界面原型', designNames: ['纸页', '控制台', '聚焦', '概览', '报告'], preview: '预览状态', states: ['待检测', '检测中', '低分结果', '中等结果', '高分结果', '部分结果', '错误'],
    prev: '上一种设计', next: '下一种设计', shareTitle: '把清晰的结果分享出去。', shareBody: '只分享分数摘要。原始浏览器信息留在你的设备上。', sharePlatforms: '分享到', copyText: '复制文案', saveImage: '保存结果图片', close: '关闭', shareSample: '分享卡片示例', matched: '匹配信号', matchedPlural: '匹配信号', unavailableNotice: '有一项无法读取',
    railTitle: '浏览器 / 检查器', railStatus: '本机环境', railCaption: '看清可见信息。', weightsNote: '权重合计为 100 分。', footerNote: '与 Anthropic 无关联。', fixtureNote: '示例数据 · 不执行检测',
    scanSteps: ['读取浏览器设置', '查看八项信号', '理解你的分数'], signalNames: ['时区', '语言偏好', '字体渲染', '默认区域', 'UTC 偏移', '浏览器类型', '设备类型', '表情风格'],
    signalDetails: ['浏览器提供的时区', '浏览器的首选语言', '区域字体的可用渲染', '浏览器默认的 Intl 区域', '本地时间与 UTC 的差值', '根据用户代理估计', '估计的设备或系统类型', '估计的系统渲染风格']
  },
  ru: {
    languageLabel: 'Язык', mainNavigation: 'Основная навигация', sectionNavigation: 'Навигация по разделам',
    checkDetails: 'Подробности проверки', scopeHeading: 'Что проверяется', checking: 'Проверяется…',
    copied: 'Скопировано', copyFailed: 'Не удалось скопировать', pointsShort: 'бал.', other: 'другое',
    title: 'screw/claude — Настройки браузера', check: 'Проверка', how: 'Как это работает', faq: 'Вопросы и ответы',
    eyebrow: 'ЧУТЬ БОЛЬШЕ ЯСНОСТИ О ВАШЕМ БРАУЗЕРЕ', headline: 'Что раскрывает', headlineEm: 'ваш браузер?',
    intro: 'Часовой пояс, языки, шрифты. Небольшие признаки складываются в общую картину. Посмотрите на неё за одну простую проверку.',
    local: 'Данные остаются на устройстве', private: 'Аккаунт не нужен', section: 'Ваш браузер с первого взгляда',
    sectionNote: 'Восемь признаков. Более ясная картина.', environment: 'СРЕДА БРАУЗЕРА',
    ready: 'Можно начинать.', readyBody: 'Посмотрите, какие обычные настройки ваш браузер делает видимыми для сайтов.',
    start: 'Проверить браузер', runtime: '8 проверок · около 5 секунд', awaiting: 'Ожидание проверки',
    signals: 'Признаки', weight: 'ВЕС', findings: 'НАБЛЮДЕНИЯ', points: 'БАЛЛЫ',
    running: 'Смотрим внимательнее.', runningBody: 'Проверяем настройки, из которых складывается среда браузера.',
    runningLabel: 'ИДЁТ ПРОВЕРКА', progress: '3 из 8 проверок', currentCheck: 'Проверяем региональные настройки…',
    completed: 'Проверка завершена', resultLabel: 'ОЦЕНКА СРЕДЫ', outOf: '/ 100', low: 'Низкий уровень', medium: 'Средний уровень', high: 'Высокий уровень',
    lowHeading: 'Признаков немного.', mediumHeading: 'Несколько признаков выделяются.', highHeading: 'Более заметный набор признаков.',
    lowBody: 'В этом примере совпало лишь несколько признаков с весом. Настройки браузера дают мало баллов.',
    mediumBody: 'Несколько настроек влияют на оценку в этом примере. В подробностях видно, откуда взялся каждый балл.',
    highBody: 'Несколько настроек дают высокий балл в этом примере. Высокая оценка не означает, что ваш аккаунт ограничен.',
    partial: 'Частичный результат', partialBody: 'Отрисовка шрифтов недоступна. Показаны остальные семь проверок; пропущенная проверка не добавляет баллов.',
    sample: 'Пример результата', sampleRunning: 'Пример прогресса', again: 'Проверить снова', share: 'Поделиться',
    errorTitle: 'Проверка не завершилась.', errorBody: 'Проверка была прервана. Вы можете начать заново в любое время.', retry: 'Повторить',
    unavailable: 'Недоступно', noFonts: 'Нет подходящих шрифтов', checked: 'Проверено', pending: 'Ожидание',
    limit: 'Оценка признаков, а не вердикт об аккаунте.', limitBody: 'Настройки браузера не позволяют узнать, будет ли ограничен аккаунт.',
    aboutEyebrow: 'РАЗБЕРИТЕСЬ В ПРОВЕРКЕ', aboutTitle: 'Проверка,', aboutEm: 'а не вердикт.',
    aboutBody: 'Это снимок настроек браузера с учётом их веса. Он помогает понять, что видно сайтам, без догадок о внутренних решениях Claude.',
    method: 'Как считается оценка', methodBody: 'Каждый признак добавляет баллы в пределах своего веса. Сумма составляет от 0 до 100. Низкий уровень: 0–30. Средний: 31–60. Высокий: 61–100. Признак считается совпавшим при силе от 0,25. Эти уровни описывают эвристические правила, а не вероятность.',
    scope: 'Что видно при проверке', scopeBody: 'Проверяются часовой пояс, языки, отрисовка доступных шрифтов, региональные настройки, смещение UTC, тип браузера, тип устройства и предполагаемый стиль эмодзи ОС. Тип браузера и устройства определяется приблизительно.',
    privacyTitle: 'Что остаётся приватным', privacyBody: 'Запланированная проверка выполняется на устройстве. Ей не нужны ваш аккаунт Claude, ключ API или переписки. Наблюдения остаются на устройстве, пока вы не решите поделиться сводкой. Этот прототип не собирает наблюдения.',
    terminalEyebrow: 'ПОСМОТРИТЕ ЧУТЬ ГЛУБЖЕ', terminalTitle: 'За пределами браузера.', terminalBody: 'Настройки терминала могут отличаться. Эти необязательные команды помогут проверить то, что недоступно браузеру.',
    terminalToggle: 'Проверки в терминале', unix: 'Для Unix-подобной оболочки. Выполняйте только те команды, которые хотите проверить.', copy: 'Копировать команду',
    commandTitles: ['Адрес API и прокси', 'Время и локаль', 'Разрешение DNS'],
    commandDescriptions: ['Посмотрите переменные адреса API и прокси в вашей оболочке.', 'Сравните время в оболочке, настройки Intl и системную локаль.', 'Посмотрите ответ DNS для домена API.'],
    faqEyebrow: 'НЕСКОЛЬКО ВОПРОСОВ', faqTitle: 'Подробности без догадок.',
    faqs: [
      ['Зачем проверять часовой пояс?', 'Часовой пояс — одна из видимых браузеру настроек, которую обсуждают в сообщениях о проверках среды. Этот инструмент помогает её посмотреть. Он не может подтвердить, использует ли её сервис и каким образом.'],
      ['Это та же проверка, что использует Claude?', 'Нет. Это независимые эвристические правила на основе видимых настроек браузера. Инструмент не обращается к внутренним системам Claude, а его оценка не воспроизводит внутренние решения сервиса.'],
      ['Может ли доступ работать при высокой оценке?', 'Да. Оценка описывает набор признаков браузера, а не статус аккаунта. Высокая оценка совместима с обычным доступом.'],
      ['Какие настройки влияют на результат?', 'Часовой пояс системы, порядок языков браузера, установленные шрифты, региональные настройки, браузер и операционная система могут влиять на наблюдения. Защита приватности или изменённая строка User-Agent могут сделать часть наблюдений неполной.'],
      ['Почему проверки в терминале отдельно?', 'Веб-страница не может прочитать переменные прокси или настройки DNS вашей оболочки. Команды позволяют посмотреть их самостоятельно; страница не выполняет команды и не получает их вывод.'],
      ['Что делать, если аккаунт ограничен?', 'Только сам сервис может объяснить ограничение аккаунта. Следуйте официальным рекомендациям Anthropic о мерах защиты, предупреждениях и обжаловании, а не делайте выводы по этой оценке.'],
      ['Покидают ли данные моё устройство?', 'Запланированная проверка хранит наблюдения в памяти вашего устройства. Если вы решите поделиться, сводка отправится в выбранное место. Загрузка страницы всё равно создаёт обычные запросы к её серверу. Этот прототип не выполняет проверку и не использует аналитику.']
    ],
    support: 'Официальная поддержка', footer: 'Больше понимания. Меньше догадок.', prototype: 'ПРОТОТИП ИНТЕРФЕЙСА',
    designNames: ['Бумага', 'Консоль', 'Фокус', 'Обзор', 'Отчёт'], preview: 'Состояние', states: ['Готово', 'Проверка', 'Низкая оценка', 'Средняя оценка', 'Высокая оценка', 'Частичный результат', 'Ошибка'],
    prev: 'Предыдущий дизайн', next: 'Следующий дизайн', shareTitle: 'Поделитесь ясной картиной.', shareBody: 'Сводка вашей оценки. Исходные данные браузера остаются у вас.',
    sharePlatforms: 'Поделиться в', copyText: 'Копировать текст для', saveImage: 'Сохранить изображение', close: 'Закрыть', shareSample: 'ПРИМЕР КАРТОЧКИ', matched: 'Совпавший признак', matchedPlural: 'Совпавших признаков',
    unavailableNotice: 'Одна проверка недоступна', railTitle: 'БРАУЗЕР / ПРОВЕРКА', railStatus: 'Локальная среда', railCaption: 'Знайте, что видно.',
    weightsNote: 'Сумма весов — 100 баллов.', footerNote: 'Не связано с Anthropic.', fixtureNote: 'Пример данных · проверка не выполняется',
    scanSteps: ['Посмотрите настройки браузера', 'Изучите восемь признаков', 'Разберитесь в оценке'],
    signalNames: ['Часовой пояс', 'Языки', 'Отрисовка шрифтов', 'Региональные настройки', 'Смещение UTC', 'Тип браузера', 'Тип устройства', 'Стиль эмодзи'],
    signalDetails: ['Часовой пояс, который сообщает браузер', 'Предпочитаемые языки браузера', 'Отрисовка доступных региональных шрифтов', 'Региональные настройки Intl браузера', 'Смещение времени относительно UTC', 'Оценка по строке User-Agent', 'Предполагаемый тип устройства или ОС', 'Предполагаемый стиль отрисовки ОС']
  }
};
const t = messages[locale];
const params = new URLSearchParams(location.search);
const variants = ['A', 'B', 'C', 'D', 'E'];
const states = ['idle', 'running', 'low', 'medium', 'high', 'partial', 'error'];
let variant = variants.includes(params.get('variant')) ? params.get('variant') : 'C';
let state = states.includes(params.get('state')) ? params.get('state') : 'idle';
const showReview = params.has('review') ? params.get('review') !== '0' : variant !== 'C';
const weights = [26, 20, 18, 9, 7, 7, 8, 5];
const iconPaths = {
  mark: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="2.5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  left: '<path d="m14 6-6 6 6 6"/>', right: '<path d="m10 6 6 6-6 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  language: '<path d="M3 5h12M9 3v2M5 5c1 6 4 9 9 11M13 5c-1 5-4 8-9 11m10 5 4-11 4 11m-6-4h4"/>',
  font: '<path d="m5 20 7-16 7 16M8 14h8"/>',
  locale: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h8m-8 4h5m-5 4h8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  browser: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18m-13-3h.01m3 0h.01"/>',
  device: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M9 21h6m-3-4v4"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 9h.01m8 0h.01M8 14s1 3 4 3 4-3 4-3"/>',
  refresh: '<path d="M20 8a8 8 0 1 0 0 8m0-13v5h-5"/>',
  share: '<path d="M12 16V3m-5 5 5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  terminal: '<path d="m5 7 5 5-5 5m8 0h6"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  down: '<path d="m6 9 6 6 6-6"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  warning: '<path d="m10.3 4-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>'
};
const signalIcons = ['globe', 'language', 'font', 'locale', 'clock', 'browser', 'device', 'smile'];
const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const fixtures = {
  low: { score: 3, band: 'low', points: [0, 0, 0, 0, 0, 0, 0, 3], widths: [0, 0, 0, 0, 0, 0, 0, 60], values: ['Europe/London', 'en-GB, en', t.noFonts, 'en-GB', 'UTC+01:00', 'Chrome', 'Linux', `Linux / ${t.other}`], matched: [7] },
  medium: { score: 46, band: 'medium', points: [16, 10, 9, 5, 5, 0, 0, 1], widths: [62, 50, 50, 56, 71, 0, 0, 20], values: ['Asia/Taipei', 'zh-TW, en', 'PingFang TC', 'zh-TW', 'UTC+08:00', 'Safari', 'macOS', 'Apple'], matched: [0, 1, 2, 3, 4, 7] },
  high: { score: 77, band: 'high', points: [26, 20, 15, 9, 5, 0, 0, 2], widths: [100, 100, 83, 100, 71, 0, 0, 40], values: ['Asia/Shanghai', 'zh-CN, en', 'Microsoft YaHei', 'zh-CN', 'UTC+08:00', 'Chrome', 'Windows', 'Microsoft'], matched: [0, 1, 2, 3, 4, 7] },
  partial: { score: 3, band: 'low', points: [0, 0, 0, 0, 0, 0, 0, 3], widths: [0, 0, 0, 0, 0, 0, 0, 60], values: ['Europe/London', 'en-GB, en', t.unavailable, 'en-GB', 'UTC+01:00', 'Chrome', 'Linux', `Linux / ${t.other}`], matched: [7] }
};

function languageLinks(separator = '') {
  return [['en', '/', 'EN', 'English'], ['zh', '/zh/', '中文', '简体中文'], ['ru', '/ru/', 'RU', 'Русский']].map(([code, path, label, name]) => `<a href="${path}${location.search}${location.hash}" lang="${code === 'zh' ? 'zh-CN' : code}" hreflang="${code === 'zh' ? 'zh-CN' : code}" aria-label="${label}: ${name}" ${locale === code ? 'aria-current="page"' : ''}>${label}</a>`).join(separator);
}

function header() {
  const languageQuery = location.search;
  return `<header class="site-header"><a class="brand" href="${localePath}${languageQuery}" aria-label="screw/claude ${t.check}"><span class="brand-mark">${icon('mark')}</span><span>screw<span class="brand-slash">/</span>claude</span></a><nav class="top-nav" aria-label="${t.mainNavigation}"><a class="active" href="#check">${t.check}</a><a href="#how">${t.how}</a><a href="#faq">${t.faq}</a></nav><div class="header-end"><span class="prototype-tag">${t.prototype}</span><nav class="languages" aria-label="${t.languageLabel}">${languageLinks('<span>/</span>')}</nav></div></header>`;
}

function hero() {
  return `<section class="hero"><div class="hero-title"><p class="eyebrow"><span class="tiny-line"></span>${t.eyebrow}</p><h1>${t.headline}<br><em>${t.headlineEm}</em></h1></div><div class="hero-aside"><p class="hero-intro">${t.intro}</p><div class="privacy-inline"><span>${icon('lock')}${t.local}</span><span>${icon('check')}${t.private}</span></div></div></section>`;
}

function scoreDial(result, small = false) {
  // The ring is a visual sample, not a score calculation.
  const arcs = {low: '15.1 502.7', medium: '231.2 502.7', high: '387.1 502.7', partial: '15.1 502.7'};
  return `<div class="score-dial ${small ? 'small' : ''} band-${result.band}" role="img" aria-label="${t.resultLabel}: ${result.score} ${t.outOf}"><svg viewBox="0 0 180 180" aria-hidden="true"><circle class="dial-track" cx="90" cy="90" r="80"/><circle class="dial-value" cx="90" cy="90" r="80" stroke-dasharray="${arcs[state] || arcs.low}"/></svg><div class="dial-text"><strong>${result.score}</strong><span>${t.outOf}</span></div></div>`;
}

function scanPanel() {
  if (state === 'idle') return `<div class="scan-panel idle"><div class="panel-meta"><span class="eyebrow">01 / ${t.environment}</span><span class="status-dot"></span></div><div class="panel-main"><div class="scan-symbol">${icon('mark')}</div><h3>${t.ready}</h3><p>${t.readyBody}</p></div><div class="panel-actions"><button class="button primary" data-action="start">${t.start}${icon('arrow')}</button><span class="action-note">${t.runtime}</span></div></div>`;
  if (state === 'running') return `<div class="scan-panel running"><div class="panel-meta"><span class="eyebrow">01 / ${t.runningLabel}</span><span class="sample-label">${t.sampleRunning}</span></div><div class="panel-main"><div class="scan-symbol scanning">${icon('mark')}</div><h3>${t.running}</h3><p>${t.runningBody}</p><div class="progress-track"><span></span></div><div class="progress-caption"><span>${t.progress}</span><span>38%</span></div></div><div class="panel-actions"><span class="current-check"><span class="busy-dot"></span>${t.currentCheck}</span></div></div>`;
  if (state === 'error') return `<div class="scan-panel error"><div class="panel-meta"><span class="eyebrow">01 / ${t.environment}</span><span class="sample-label">${t.sample}</span></div><div class="panel-main"><div class="scan-symbol">${icon('warning')}</div><h3>${t.errorTitle}</h3><p>${t.errorBody}</p></div><div class="panel-actions"><button class="button primary" data-action="start">${t.retry}${icon('refresh')}</button></div></div>`;
  const result = fixtures[state];
  return `<div class="scan-panel result band-${result.band}"><div class="panel-meta"><span class="eyebrow">01 / ${t.resultLabel}</span><span class="sample-label">${t.sample}</span></div><div class="panel-main">${scoreDial(result)}<span class="band-label"><span class="tiny-dot"></span>${t[result.band]}</span><h3>${t[result.band + 'Heading']}</h3><p>${state === 'partial' ? t.partialBody : t[result.band + 'Body']}</p>${state === 'partial' ? `<span class="partial-note">${icon('warning')}${t.partial}</span>` : ''}</div><div class="panel-actions result-actions"><button class="button primary" data-action="share">${icon('share')}${t.share}</button><button class="button secondary" data-action="reset">${icon('refresh')}${t.again}</button></div></div>`;
}

function signals() {
  const result = fixtures[state];
  return `<div class="signals-panel"><div class="signals-heading"><h3>${t.signals}<span> / 08</span></h3><span class="column-caption">${result ? t.points : t.weight}</span></div><div class="signal-list">${weights.map((weight, i) => {
    const completed = !!result || (state === 'running' && i < 3);
    const active = state === 'running' && i === 3;
    const unavailable = state === 'partial' && i === 2;
    const hit = result && result.matched.includes(i);
    const value = result ? result.values[i] : completed ? fixtures.low.values[i] : active ? t.checking : t.signalDetails[i];
    return `<div class="signal-row ${completed ? 'is-complete' : ''} ${active ? 'is-active' : ''} ${hit ? 'is-hit' : ''} ${unavailable ? 'is-unavailable' : ''}"><span class="signal-icon">${icon(signalIcons[i])}</span><div class="signal-text"><span class="signal-name">${t.signalNames[i]}</span><span class="signal-value" title="${escapeHtml(value)}">${escapeHtml(value)}</span></div><div class="signal-weight">${result ? `<span class="contribution ${hit ? 'has-points' : ''}">+${result.points[i]}</span><span class="max-weight">/ ${weight}</span><div class="mini-track"><span style="width:${result.widths[i]}%"></span></div>` : `<span>${weight}<small> ${t.pointsShort}</small></span>`}</div><span class="row-status">${unavailable ? icon('warning') : completed ? icon('check') : active ? '<span class="busy-dot"></span>' : '<span class="pending-dot"></span>'}</span></div>`;
  }).join('')}</div><div class="signals-footer"><span>${result ? `${result.matched.length} ${result.matched.length === 1 ? t.matched.toLowerCase() : t.matchedPlural.toLowerCase()}` : t.weightsNote}</span><span>${result ? t.fixtureNote : t.awaiting}</span></div></div>`;
}

function workspace() {
  return `<section id="check" class="check-section" aria-labelledby="check-title"><div class="section-heading"><h2 id="check-title">${t.section}</h2><p>${t.sectionNote}</p></div><div class="workspace" aria-live="polite">${scanPanel()}${signals()}</div><div class="limitation">${icon('info')}<p><strong>${t.limit}</strong> ${t.limitBody}</p></div></section>`;
}

function about() {
  return `<section id="how" class="about-section"><div class="about-intro"><p class="eyebrow">02 / ${t.aboutEyebrow}</p><h2>${t.aboutTitle}<br><em>${t.aboutEm}</em></h2><p>${t.aboutBody}</p></div><div class="about-details">${[[t.method, t.methodBody], [t.scope, t.scopeBody], [t.privacyTitle, t.privacyBody]].map(([title, body], i) => `<details class="explanation" ${i === 0 ? 'open' : ''}><summary><span>${title}</span>${icon('down')}</summary><p>${body}</p></details>`).join('')}</div></section>`;
}

const commands = [
  "env | grep -E '^(ANTHROPIC_BASE_URL|HTTPS?_PROXY|ALL_PROXY|NO_PROXY)='",
  'date; node -e "console.log(Intl.DateTimeFormat().resolvedOptions())"; locale',
  'dig +short api.anthropic.com || nslookup api.anthropic.com'
];
function terminal() {
  return `<section class="terminal-section"><div class="terminal-intro"><p class="eyebrow">03 / ${t.terminalEyebrow}</p><h2>${t.terminalTitle}</h2><p>${t.terminalBody}</p></div><details class="terminal-disclosure"><summary><span>${icon('terminal')}${t.terminalToggle}<small>03</small></span>${icon('down')}</summary><div class="commands"><p class="terminal-note">${t.unix}</p>${commands.map((command, i) => `<article class="command"><div class="command-heading"><h3><span>0${i + 1}</span>${t.commandTitles[i]}</h3><button class="icon-button" aria-label="${t.copy}: ${t.commandTitles[i]}" title="${t.prototype}" disabled>${icon('copy')}</button></div><p>${t.commandDescriptions[i]}</p><pre tabindex="0"><code>${escapeHtml(command)}</code></pre></article>`).join('')}</div></details></section>`;
}

function faq() {
  return `<section id="faq" class="faq-section"><div class="faq-intro"><p class="eyebrow">04 / ${t.faqEyebrow}</p><h2>${t.faqTitle}</h2><a class="text-link" href="https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals" target="_blank" rel="noopener noreferrer">${t.support}${icon('arrow')}</a></div><div class="faq-list">${t.faqs.map(([question, answer], i) => `<details class="faq-item"><summary><span class="faq-number">0${i + 1}</span><span>${question}</span><span class="plus" aria-hidden="true"></span></summary><p>${answer}</p></details>`).join('')}</div></section>`;
}

function footer() {
  return `<footer class="site-footer"><span class="footer-brand">screw<span>/</span>claude</span><p>${t.footer}</p><span>${t.footerNote}</span></footer>`;
}

function variantA() {
  return `${header()}<main class="main-content">${hero()}${workspace()}${about()}${terminal()}${faq()}</main>${footer()}`;
}
function variantB() {
  return `${header()}<div class="console-shell"><aside class="console-rail"><p class="eyebrow">${t.railTitle}</p><div class="rail-title">${t.railCaption}</div><nav aria-label="${t.sectionNavigation}"><a href="#check" class="active"><span>01</span>${t.check}${icon('right')}</a><a href="#how"><span>02</span>${t.how}</a><a href="#faq"><span>03</span>${t.faq}</a></nav><div class="rail-bottom"><span class="tiny-dot"></span>${t.railStatus}<p>${t.local}<br>${t.private}</p></div></aside><main class="main-content"><div class="console-intro"><p class="eyebrow">${t.eyebrow}</p><h1>${t.headline} <em>${t.headlineEm}</em></h1><p>${t.intro}</p></div>${workspace()}${about()}${terminal()}${faq()}</main></div>${footer()}`;
}
function reviewBar() {
  if (!showReview) return '';
  if (TasteVariants.isActive(variant)) return TasteVariants.reviewBar();
  return `<aside class="prototype-switcher" aria-label="${t.prototype}"><span class="review-badge">${t.prototype}</span><div class="design-switch"><button class="switch-arrow" data-action="previous" aria-label="${t.prev}">${icon('left')}</button><span class="variant-label">${variant} <span>— ${t.designNames[variants.indexOf(variant)]}</span></span><button class="switch-arrow" data-action="next" aria-label="${t.next}">${icon('right')}</button></div><div class="state-switch"><label for="preview-state">${t.preview}</label><select id="preview-state" aria-label="${t.preview}">${states.map((value, i) => `<option value="${value}" ${state === value ? 'selected' : ''}>${t.states[i]}</option>`).join('')}</select></div></aside>`;
}

function shareDialog() {
  const result = fixtures[state] || fixtures.low;
  return `<dialog id="share-dialog" aria-labelledby="share-title"><div class="dialog-heading"><span class="eyebrow">${t.shareSample}</span><button class="icon-button" data-action="close" aria-label="${t.close}">${icon('close')}</button></div><h2 id="share-title">${t.shareTitle}</h2><p class="dialog-description">${t.shareBody}</p><div class="share-card band-${result.band}"><div class="share-card-brand">${icon('mark')}<span>screw/claude</span><span class="sample-label">${t.sample}</span></div><div class="share-card-result"><div><strong>${result.score}<small> / 100</small></strong><span class="band-label">${t[result.band]}</span></div><p>${t[result.band + 'Heading']}</p></div><div class="share-card-bottom">${result.matched.map(i => t.signalNames[i]).join(' · ')}<span>${t.limit}</span></div></div><div class="share-options"><p class="eyebrow">${t.sharePlatforms}</p><div class="platforms">${['X', 'Facebook', 'Telegram', 'Weibo'].map(platform => `<button class="button secondary" disabled>${platform}</button>`).join('')}</div><p class="eyebrow">${t.copyText}</p><div class="platforms">${['RED', 'Douyin', 'Jike'].map(platform => `<button class="button secondary" disabled>${platform}</button>`).join('')}</div></div><button class="button primary save-image" disabled>${icon('download')}${t.saveImage}</button></dialog>`;
}

function render() {
  const taste = TasteVariants.isActive(variant);
  document.body.dataset.variant = variant;
  document.body.dataset.state = state;
  if (taste) TasteVariants.applyTheme();
  else delete document.body.dataset.tasteTheme;
  delete document.body.dataset.focusTheme;
  document.body.classList.toggle('has-review', showReview);
  document.body.classList.remove('has-focus-state-controls');
  // Variant C is the live application: the functional core renders it.
  if (variant === 'C' && window.ScrewClaude) {
    window.ScrewClaude.mount({locale, query: location.search, hash: location.hash, preview: showReview ? previewFromUrl() : null});
    return;
  }
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale;
  document.title = t.title;
  document.getElementById('app').innerHTML = ({A: variantA, B: variantB, D: TasteVariants.overview, E: TasteVariants.report}[variant])() + (taste ? TasteVariants.shareDialog() : shareDialog()) + reviewBar();
}

/** Review-mode sample state taken from the URL, so the live app restores it. */
function previewFromUrl() {
  const value = new URLSearchParams(location.search).get('state');
  return ['idle', 'running', 'low', 'medium', 'high', 'partial', 'error'].includes(value) ? value : 'idle';
}

function updateUrl() {
  const url = new URL(location.href);
  url.searchParams.set('variant', variant);
  if (state === 'idle') url.searchParams.delete('state');
  else url.searchParams.set('state', state);
  history.replaceState(null, '', url);
}

function setState(nextState) {
  const focused = document.activeElement;
  const fromPicker = focused?.id === 'preview-state';
  state = nextState;
  updateUrl();
  render();
  if (fromPicker) document.getElementById('preview-state')?.focus({preventScroll: true});
  else {
    const button = document.querySelector('.scan-panel .button, .taste-state .taste-button');
    const panel = document.querySelector('.scan-panel');
    if (button) button.focus({preventScroll: true});
    else { panel.setAttribute('tabindex', '-1'); panel.focus({preventScroll: true}); }
  }
}

function cycleVariant(direction) {
  variant = variants[(variants.indexOf(variant) + direction + variants.length) % variants.length];
  // Keep comparison controls across reloads when switching into clean Focus.
  const url = new URL(location.href);
  url.searchParams.set('review', '1');
  history.replaceState(null, '', url);
  updateUrl();
  render();
  document.querySelector(`[data-action="${direction > 0 ? 'next' : 'previous'}"]`)?.focus({preventScroll: true});
}

document.addEventListener('click', event => {
  if (variant === 'C') return;
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'start') setState('running');
  if (action === 'reset') setState('idle');
  if (action === 'previous') cycleVariant(-1);
  if (action === 'next') cycleVariant(1);
  if (action === 'share') document.getElementById('share-dialog').showModal();
  if (action === 'close') document.getElementById('share-dialog').close();
  if (event.target.id === 'share-dialog') {
    const rect = event.target.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
  }
});
document.addEventListener('change', event => {
  if (variant === 'C') return;
  if (event.target.id === 'preview-state') setState(event.target.value);
});
document.addEventListener('keydown', event => {
  if (variant === 'C' || !showReview || document.querySelector('dialog[open]') || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    cycleVariant(event.key === 'ArrowRight' ? 1 : -1);
  }
});
addEventListener('popstate', () => {
  const query = new URLSearchParams(location.search);
  variant = variants.includes(query.get('variant')) ? query.get('variant') : 'C';
  state = states.includes(query.get('state')) ? query.get('state') : 'idle';
  render();
});
render();
