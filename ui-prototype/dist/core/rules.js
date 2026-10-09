/* Versioned rule configuration: weights, region profiles, ordered pattern tables.
 *
 * Everything the heuristic depends on lives here as data. Scoring, matching and
 * progress code never branch on a region identifier: a profile is described by
 * the sets and patterns below, and `PROFILES` order only decides tie-breaks.
 */

                                                     

/** Bump together with any change to weights, sets, tables or thresholds. */
export const RULES_VERSION = '2026-10-09.1';

/** A signal is a match, and gets a severity, from this strength upwards. */
export const MATCH_THRESHOLD = 0.25;

/** Individual-signal severity bands, by strength. */
export const SEVERITY_BANDS = {
  medium: 0.25,
  high: 0.6,
}         ;

/** Overall score bands, inclusive. */
export const SCORE_BANDS                                                                  = [
  { band: 'low', min: 0, max: 30 },
  { band: 'medium', min: 31, max: 60 },
  { band: 'high', min: 61, max: 100 },
];

export const SIGNAL_ORDER             = [
  'timezone',
  'language',
  'fonts',
  'speechVoices',
  'intlLocale',
  'timezoneOffset',
  'browserVendor',
  'deviceBrand',
  'emoji',
];

export const WEIGHTS                           = {
  timezone: 26,
  language: 20,
  fonts: 5,
  speechVoices: 13,
  intlLocale: 9,
  timezoneOffset: 7,
  browserVendor: 7,
  deviceBrand: 8,
  emoji: 5,
};

/* --------------------------------------------------------------- matchers -- */

/** Tag matcher: any listed form matches. Compared against a lowercased value. */
                          
                    
                      
                      
                   
 

/** Language rules distinguish the visitor's first preference from later ones. */
                                               
                                
 

                           
                
                   
                
 

/** Font scoring: how a profile turns matched candidates into a strength. */
                           
                                                                    
                          
                                                                     
                                                          
  

                              
              
                   
 

                           
                                                                     
                 
                     
                                                                                  
                                 
                                                                  
                        
                                                                          
                             
 

                            
               
                   
 

/** Merged, ordered, case-insensitive browser and device tables. */
                             
                   
                                                          
                
                                      
                     
                                                                   
                      
                   
 

                            
             
                    
                   
 

                                
               
                                                                                    
                   
                        
                            
                  
                      
                         
                                                               
                          
 

/* ---------------------------------------------------------------- profiles -- */

const CN_TIMEZONES             = [
  {
    ids: ['Asia/Shanghai', 'Asia/Urumqi', 'Asia/Chongqing', 'Asia/Chungking', 'Asia/Harbin', 'Asia/Kashgar'],
    strength: 1,
    note: 'Mainland China, including legacy aliases for Chongqing and Harbin.',
  },
  {
    ids: ['Asia/Hong_Kong', 'Asia/Macau', 'Asia/Taipei'],
    strength: 0.6,
    note: 'Related zones: Hong Kong, Macau and Taiwan.',
  },
];

const CN_LANGUAGES                 = [
  {
    position: 'primary',
    prefixes: ['zh-cn'],
    contains: ['hans'],
    equals: ['zh'],
    strength: 1,
  },
  {
    position: 'primary',
    prefixes: ['zh-tw', 'zh-hk', 'zh-mo'],
    contains: ['hant'],
    strength: 0.5,
  },
  { position: 'later', prefixes: ['zh-cn'], contains: ['hans'], equals: ['zh'], strength: 0.7 },
  { position: 'later', prefixes: ['zh'], strength: 0.4 },
];

const RU_TIMEZONES             = [
  {
    ids: [
      'Europe/Kaliningrad',
      'Europe/Moscow',
      'Europe/Kirov',
      'Europe/Volgograd',
      'Europe/Astrakhan',
      'Europe/Saratov',
      'Europe/Ulyanovsk',
      'Europe/Samara',
      'Asia/Yekaterinburg',
      'Asia/Omsk',
      'Asia/Novosibirsk',
      'Asia/Barnaul',
      'Asia/Tomsk',
      'Asia/Novokuznetsk',
      'Asia/Krasnoyarsk',
      'Asia/Irkutsk',
      'Asia/Chita',
      'Asia/Yakutsk',
      'Asia/Khandyga',
      'Asia/Vladivostok',
      'Asia/Ust-Nera',
      'Asia/Magadan',
      'Asia/Sakhalin',
      'Asia/Srednekolymsk',
      'Asia/Kamchatka',
      'Asia/Anadyr',
      'W-SU',
      'Europe/Simferopol',
    ],
    strength: 1,
    note: 'Russia across its time zones, the legacy W-SU alias, and Simferopol.',
  },
  {
    ids: [
      'Europe/Minsk',
      'Asia/Almaty',
      'Asia/Aqtobe',
      'Asia/Tashkent',
      'Asia/Tbilisi',
      'Asia/Yerevan',
      'Asia/Baku',
      'Asia/Bishkek',
      'Asia/Ashgabat',
    ],
    strength: 0,
    note: 'Neighbouring zones stay at zero unless a build models the wider Russian-speaking space.',
  },
];

const RU_LANGUAGES                 = [
  { position: 'primary', prefixes: ['ru'], strength: 1 },
  { position: 'primary', prefixes: ['uk'], strength: 0.7 },
  { position: 'later', prefixes: ['ru'], strength: 0.6 },
  { position: 'later', prefixes: ['uk'], strength: 0.4 },
];

/**
 * Candidate font families. China keeps the reference list of 31 Simplified
 * candidates plus 8 Traditional ones; Russia probes Cyrillic families that
 * stock Windows, macOS and Android installations do not ship.
 */
const CN_FONT_FAMILIES = [
  'Alibaba PuHuiTi',
  'Baidu Number',
  'DingTalk JinBuTi',
  'Douyin Sans',
  'FZLanTingHeiS-R-GB',
  'HarmonyOS Sans',
  'HONOR Sans',
  'MiSans',
  'Microsoft YaHei',
  'Microsoft YaHei UI',
  'OPPO Sans',
  'SimSun',
  'NSimSun',
  'SimHei',
  'KaiTi',
  'FangSong',
  'DengXian',
  'PingFang SC',
  'Hiragino Sans GB',
  'STHeiti',
  'STSong',
  'Songti SC',
  'Source Han Sans CN',
  'Source Han Sans SC',
  'Noto Sans CJK SC',
  'Noto Serif CJK SC',
  'Source Han Serif SC',
  'vivo Sans',
  'WPS Office',
  'WenQuanYi Micro Hei',
  'WenQuanYi Zen Hei',
];

const CN_TRADITIONAL_FAMILIES = [
  'Microsoft JhengHei',
  'PMingLiU',
  'MingLiU',
  'DFKai-SB',
  'PingFang TC',
  'PingFang HK',
  'Source Han Sans TW',
  'Noto Sans CJK TC',
];

const RU_FONT_FAMILIES = [
  'PT Sans',
  'PT Serif',
  'PT Mono',
  'PT Sans Narrow',
  'PT Astra Sans',
  'PT Astra Serif',
  'GOST Type A',
  'GOST Type B',
];

export const PROFILES                  = [
  {
    id: 'cn',
    labelKey: 'profileCn',
    timezones: CN_TIMEZONES,
    languages: CN_LANGUAGES,
    fonts: {
      sample: '中文字体检测ABCabc012',
      families: [...CN_FONT_FAMILIES, ...CN_TRADITIONAL_FAMILIES],
      traditionalFamilies: CN_TRADITIONAL_FAMILIES,
      scoring: { traditionalOnly: 0.5, simplified: { base: 0.75, step: 0.08, max: 1 } },
    },
    voices: [{ lang: 'zh', strength: 1 }],
    intlLocales: [
      { prefixes: ['zh-cn', 'zh-hans'], contains: ['hans'], equals: ['zh'], strength: 1 },
      { prefixes: ['zh'], strength: 0.5 },
    ],
    offsetMinutes: [-480],
  },
  {
    id: 'ru',
    labelKey: 'profileRu',
    timezones: RU_TIMEZONES,
    languages: RU_LANGUAGES,
    fonts: {
      sample: 'Проверка шрифта ABCabc012',
      families: RU_FONT_FAMILIES,
      thresholds: [
        { min: 1, strength: 0.5 },
        { min: 2, strength: 0.7 },
        { min: 3, strength: 1 },
      ],
    },
    voices: [
      { lang: 'ru', strength: 1 },
      { lang: 'uk', strength: 0.6 },
    ],
    intlLocales: [
      { prefixes: ['ru'], strength: 1 },
      { prefixes: ['uk'], strength: 0.5 },
    ],
    offsetMinutes: [-120, -180, -240, -300, -360, -420, -480, -540, -600, -660, -720],
  },
];

/* --------------------------------------------------------- ordered tables -- */

export const BROWSER_RULES               = [
  { region: 'cn', label: 'wechat', markers: ['micromessenger'], strength: 1 },
  { region: 'cn', label: 'qq', markers: ['qqbrowser', 'mqqbrowser'], strength: 1 },
  { region: 'cn', label: 'quark', markers: ['quark'], strength: 1 },
  { region: 'cn', label: 'uc', markers: ['ucbrowser', 'ucweb'], strength: 1 },
  { region: 'cn', label: 'baidu', markers: ['baidubrowser', 'baiduhd', 'baiduboxapp'], strength: 1 },
  { region: 'cn', label: 'sogou', markers: ['sogoumobilebrowser', 'metasr'], strength: 0.9 },
  { region: 'cn', label: 'threeSixty', markers: ['360se', '360ee', 'qhbrowser'], strength: 0.9 },
  { region: 'cn', label: 'twoThreeFourFive', markers: ['2345explorer'], strength: 0.9 },
  { region: 'cn', label: 'miBrowser', markers: ['miuibrowser'], strength: 0.9 },
  // Broad on purpose: the optional "browser" suffix is covered by the substring.
  { region: 'cn', label: 'huawei', markers: ['huawei'], strength: 0.9 },
  { region: 'cn', label: 'oppo', markers: ['heytapbrowser', 'hetapbrowser', 'oppobrowser'], strength: 0.9 },
  { region: 'cn', label: 'vivo', markers: ['vivobrowser'], strength: 0.9 },
  { region: 'ru', label: 'yandex', markers: ['yabrowser', 'yowser'], strength: 1 },
  { region: 'ru', label: 'chromiumGost', markers: ['chromium gost'], strength: 1 },
  { region: 'ru', label: 'sber', markers: ['sberbrowser'], strength: 0.95 },
  { region: 'ru', label: 'atom', markers: ['atom', 'mrchrome'], strength: 0.9 },
  { region: 'ru', label: 'vkWebview', markers: ['vkandroidapp', 'okandroidapp'], strength: 0.9 },
];

export const DEVICE_RULES               = [
  { region: 'cn', label: 'harmonyos', markers: ['harmonyos', 'hmos'], strength: 0.9 },
  { region: 'cn', label: 'huaweiHonor', markers: ['huawei', 'honor'], strength: 0.85 },
  {
    region: 'cn',
    label: 'xiaomi',
    markers: ['xiaomi', 'redmi', 'miui'],
    // A standalone "mi" token, or an "m" plus a four-digit model identifier.
    patterns: ['(^|[^a-z])mi([^a-z]|$)', '(^|[^a-z0-9])m\\d{4}([^0-9]|$)'],
    strength: 0.8,
  },
  { region: 'cn', label: 'oppoFamily', markers: ['oppo', 'oneplus', 'realme', 'heytap'], strength: 0.8 },
  { region: 'cn', label: 'vivoIqoo', markers: ['vivo', 'iqoo'], strength: 0.8 },
  { region: 'cn', label: 'meizu', markers: ['meizu'], strength: 0.75 },
  {
    region: 'ru',
    label: 'russianBrands',
    markers: ['bq-', 'dexp', 'inoi', 'digma', 'texet', 'irbis', 'prestigio'],
    strength: 0.75,
  },
  { region: 'ru', label: 'transsion', markers: ['tecno', 'infinix', 'itel'], strength: 0.4 },
];

/** Checked in order: Apple devices first, then Android, Windows, ChromeOS, Linux. */
export const EMOJI_RULES              = [
  { os: 'apple', markers: ['iphone', 'ipad', 'ipod', 'macintosh', 'mac os x'], strength: 0.25 },
  { os: 'google', markers: ['android'], strength: 0.35 },
  { os: 'microsoft', markers: ['windows'], strength: 0.4 },
  { os: 'google', markers: ['cros', 'chromeos'], strength: 0.35 },
  { os: 'linux', markers: ['linux', 'x11', 'bsd'], strength: 0.5 },
];

export const EMOJI_UNKNOWN            = { os: 'unknown', markers: [], strength: 0.4 };

/** Best-effort labels for user agents that match no region table. */
export const BROWSER_FALLBACKS                                         = [
  { label: 'edge', markers: ['edg/', 'edga/', 'edgios/'] },
  { label: 'chrome', markers: ['chrome', 'crios'] },
  { label: 'safari', markers: ['safari'] },
  { label: 'firefox', markers: ['firefox', 'fxios'] },
];

/**
 * Offset strength by `getTimezoneOffset()` minutes, already scaled by how much
 * of each offset's population lives in a country where the service operates.
 * Offsets absent from the table score zero.
 */
export const OFFSET_STRENGTHS                         = {
  '-120': 0.1,
  '-180': 0.3,
  '-210': 1,
  '-240': 0.25,
  '-270': 1,
  '-300': 0.15,
  '-360': 0.2,
  '-390': 0.9,
  '-420': 0.15,
  '-480': 0.15,
  '-540': 0.1,
  '-600': 0.2,
  '-660': 0.8,
  '-720': 0.5,
  '240': 0.15,
  '300': 0.1,
};

/** Three generic fallbacks and the measurement tolerance for the font probe. */
export const FONT_FALLBACKS = ['monospace', 'sans-serif', 'serif'];
export const FONT_SAMPLE_SIZE = 72;
export const FONT_TOLERANCE_PX = 0.5;

/** How many matched font names the human-readable summary keeps. */
export const FONT_SUMMARY_LIMIT = 4;

/** How many matched signal names an exported image lists. */
export const IMAGE_HIT_LIMIT = 6;

                              
                  
                         
                                    
                          
                            
                             
                            
                          
                          
                                                           
                                          
                                 
                                       
                          
                          
                           
                        
 

export const RULES              = {
  version: RULES_VERSION,
  matchThreshold: MATCH_THRESHOLD,
  weights: WEIGHTS,
  signalOrder: SIGNAL_ORDER,
  profiles: PROFILES,
  browserRules: BROWSER_RULES,
  deviceRules: DEVICE_RULES,
  emojiRules: EMOJI_RULES,
  emojiUnknown: EMOJI_UNKNOWN,
  browserFallbacks: BROWSER_FALLBACKS,
  offsetStrengths: OFFSET_STRENGTHS,
  scoreBands: SCORE_BANDS,
  severityBands: SEVERITY_BANDS,
  fontFallbacks: FONT_FALLBACKS,
  fontTolerancePx: FONT_TOLERANCE_PX,
  fontSummaryLimit: FONT_SUMMARY_LIMIT,
  imageHitLimit: IMAGE_HIT_LIMIT,
};

export function profileById(rules             , id          )                {
  const profile = rules.profiles.find(candidate => candidate.id === id);
  if (!profile) throw new Error(`Unknown region profile: ${id}`);
  return profile;
}
