# screw-claude functionality implementation plan

Build a browser environment diagnostic with the functionality of [fuck-claude.com](https://fuck-claude.com/). Detection, scoring, and image generation run on the visitor's device. The functional core exposes data and events that your own UI can consume.

This plan covers behavior, detection rules, module boundaries, content, sharing, and deployment. Visual design, page layout, styling, icons, mascots, animation, and the appearance of exported images are yours to define. Planning does not include implementing or deploying the application.

The reference was inspected on October 9, 2026, including its [English page](https://fuck-claude.com/), [Chinese page](https://fuck-claude.com/zh/), and [public detector JavaScript](https://fuck-claude.com/_astro/Detector.astro_astro_type_script_index_0_lang.BjyUZeoD.js). Its score is a heuristic about browser signals. Claims about Claude's internal behavior should remain attributed to reports, with a source and version if published; these browser checks cannot establish account status or enforcement probability.

## Architecture

Use TypeScript for an independent functional core and small browser adapters. A static website can deliver the entire application; the core needs no application server, database, authentication, Claude API access, or paid API.

Astro is a suitable optional page shell, and the reference uses Astro. Its [client script support](https://docs.astro.build/en/guides/client-side-scripts/) can load the functional core into static pages. Keep the core compatible with plain JavaScript, React, Vue, or another UI framework so choosing the presentation does not require rewriting the functionality.

Browser adapters collect local observations. Pure rules turn observations into scores. A scan controller manages progress and results. Localization and sharing consume those results. Hosting serves files, while optional analytics receives only explicitly allowed page events.

## Feature inventory

| Feature | Required behavior | Implementation responsibility |
| --- | --- | --- |
| Start a scan | Begin only after a visitor requests it | Scan controller |
| Nine local checks | Collect the browser signals detailed below and match each against the configured region profiles | Browser adapters and detector registry |
| Scan progress | Report each check starting and finishing and the running score | Controller events |
| Weighted score | Produce an integer in the 0–100 range | Pure scoring functions |
| Result classification | Report low, medium, or high, with an explanation | Scoring and localized content |
| Individual findings | Return observed values, severity, and point contributions | Structured detector results |
| Matched findings | Return the qualifying signals, their contributions, and the region profiles consistent with them | Result aggregation |
| Run again | Clear the previous result and collect fresh observations | Scan controller |
| Native sharing | Offer the device share mechanism when supported | Sharing adapter |
| Social sharing | Prepare links for X, Facebook, Telegram, and Weibo | Pure link builders |
| Platform copy | Prepare localized text for RED/Xiaohongshu, Douyin, and Jike | Text formatter and clipboard adapter |
| Result image | Generate a PNG locally and share, copy, or download it | Export adapter with your renderer |
| Terminal checks | Provide three diagnostic commands that visitors can copy | Static command definitions and clipboard adapter |
| Two languages | Serve English and Simplified Chinese content | Locale dictionaries and routes |
| Educational content | Explain signals, scoring, limitations, terminal checks, and privacy | Localized content definitions |
| FAQ | Supply seven question and answer pairs | Content definitions |
| Official support | Link to Anthropic's warning and appeal information | External link configuration |
| Discoverability | Supply localized metadata, canonical URLs, alternates, and sitemap | Static page metadata |
| App metadata | Supply a web manifest and icon references | Static hosting assets |
| Page analytics | Support an optional page analytics integration without scan payloads | Isolated analytics module |

The scan, result, and sharing behavior follows the [public implementation](https://fuck-claude.com/_astro/Detector.astro_astro_type_script_index_0_lang.BjyUZeoD.js). Implement equivalent behavior with original code and original explanatory wording.

## Detector rules

Each detector returns an observation and a normalized signal strength from 0 to 1. Signals are evaluated against region profiles: versioned data describing the browser environment of an unsupported region. The China profile follows the [reference bundle](https://fuck-claude.com/_astro/Detector.astro_astro_type_script_index_0_lang.BjyUZeoD.js), and the Russia profile applies the same architecture to Russian- and Ukrainian-language signals. Evaluate the rules inside every profile and take the strongest match across profiles for each signal, so overlapping observations are not double-counted. Keep profiles, weights, and patterns in configuration rather than scattering constants through the UI.

| Signal ID | Weight | Browser observation | Scoring rule |
| --- | ---: | --- | --- |
| `timezone` | 26 | `Intl.DateTimeFormat().resolvedOptions().timeZone` | Strongest match across region zone sets: a profile's own zones `1`; related or neighbouring zones `0.3`–`0.6` where configured; otherwise `0` |
| `language` | 20 | `navigator.languages`, falling back to `navigator.language` | Strongest match across the per-region language trees below: a profile's primary language `1`; the same language later in the list lower; unrelated languages `0` |
| `fonts` | 5 | Canvas text width comparisons for the configured per-region families | Strongest per-region rule below: China saturation `min(1, 0.75 + 0.08 × matched count)` or Traditional-only `0.5`; Russia `0.5`, `0.7`, or `1`; none `0` |
| `speechVoices` | 13 | Local voices returned by `speechSynthesis.getVoices()` | Strongest per-region voice language below: China `zh`; Russia `ru` or `uk`; none `0` |
| `intlLocale` | 9 | `Intl.DateTimeFormat().resolvedOptions().locale` | Strongest per-region locale prefix below: a profile's primary locale `1`; a related locale `0.5`; otherwise `0` |
| `timezoneOffset` | 7 | `new Date().getTimezoneOffset()` | Offset strength from the shared-offset table below, scaled by how many supported countries share it; otherwise `0` |
| `browserVendor` | 7 | Ordered matching against `navigator.userAgent` | First match in the merged ordered table below: region-identifying browser or WebView `0.9`–`1`; otherwise `0` with a best-effort label |
| `deviceBrand` | 8 | Ordered matching against user agent and platform | First match in the merged device family table below: `0.4`–`0.9` where configured; otherwise `0` and the exposed platform label |
| `emoji` | 5 | OS family inferred from user agent and platform | Apple: `0.25`; Microsoft: `0.4`; Google: `0.35`; Linux/other: `0.5`; unknown: `0.4` |

A region profile defines timezone IDs, language rules, font candidates, voice languages, Intl locale prefixes, browser markers, and device markers. Ship `cn` and `ru` initially; the scoring, matching, progress, and UI code must not branch on a region identifier. The table below lists candidate profiles for other unsupported regions so the schema is exercised, but treat their rows as unverified until fixtures exist.

| Profile | Directly observable signals | Caveat |
| --- | --- | --- |
| `cn` | Mainland timezone set, Simplified/Traditional language tree, 39 font candidates, Chinese browsers | Reference profile |
| `ru` | Russia timezone set, `ru`/`uk` language tree, Russian font candidates, `ru`/`uk` voices | Ships initially; Belarus is excluded |
| `by` | `ru` language, `Europe/Minsk`, offset `-180` | Belarus is unsupported but its browser signals are almost identical to Russia's |
| `ir` | `fa` language, `Asia/Tehran`, `fa-IR` locale, `-210` offset | The UTC+3:30 offset is Iran-only; regional font and browser data still needs fixtures |
| `af` | `fa` or `ps` language, `Asia/Kabul`, `-270` offset | The UTC+4:30 offset is nearly unique to Afghanistan; sparse consumer web usage |
| `mm` | `my` language, `Asia/Yangon`, `-390` offset | The UTC+6:30 offset is shared only with Australia's Cocos Islands |
| `kp` | `ko` language, `Asia/Pyongyang` | No observable consumer web usage |
| `cu`, `ve` | Spanish language, `America/Havana` / `America/Caracas` timezones | Language and offsets are largely shared with supported countries |
| `sy` | Arabic language, `Asia/Damascus` | Signals are largely shared with supported countries |

These are heuristics, not a validated measure of nationality, location, or account status. User agent hints can be absent or modified, as described in [MDN's user agent documentation](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent). Return uncertainty with observations instead of treating the inferred family as verified hardware.

### Timezone and locale matching

Use explicit per-profile timezone sets and language trees. The China profile keeps the reference's sets:

- Mainland China: `Asia/Shanghai`, `Asia/Urumqi`, `Asia/Chongqing`, `Asia/Chungking`, `Asia/Harbin`, `Asia/Kashgar` → `1`.
- China regional: `Asia/Hong_Kong`, `Asia/Macau`, `Asia/Taipei` → `0.6`.

The Russia profile uses:

- Full strength `1`: `Europe/Kaliningrad`, `Europe/Moscow`, `Europe/Kirov`, `Europe/Volgograd`, `Europe/Astrakhan`, `Europe/Saratov`, `Europe/Ulyanovsk`, `Europe/Samara`, `Asia/Yekaterinburg`, `Asia/Omsk`, `Asia/Novosibirsk`, `Asia/Barnaul`, `Asia/Tomsk`, `Asia/Novokuznetsk`, `Asia/Krasnoyarsk`, `Asia/Irkutsk`, `Asia/Chita`, `Asia/Yakutsk`, `Asia/Khandyga`, `Asia/Vladivostok`, `Asia/Ust-Nera`, `Asia/Magadan`, `Asia/Sakhalin`, `Asia/Srednekolymsk`, `Asia/Kamchatka`, `Asia/Anadyr`, and the legacy alias `W-SU`.
- `Europe/Simferopol` → `1`; Crimea is excluded from supported Ukraine, and occupied Donetsk and Luhansk usually report `Europe/Moscow`, which the set already covers.
- Neighbouring zone IDs (Belarus, Kazakhstan, Uzbekistan, Georgia, Armenia, Azerbaijan, and the rest of the former Soviet space) → `0` by default. Raise them to `0.3`–`0.4` only if a build deliberately models the wider Russian-speaking space.

Lowercase language tags before matching, and evaluate each profile's tree independently before taking the strongest result. China's tree keeps the reference's rules: Simplified matching means a tag starting with `zh-cn`, containing `hans`, or equal to `zh`; Traditional primary matching means a tag starting with `zh-tw`, `zh-hk`, or `zh-mo`, or containing `hant`. In order: primary Simplified `1`, primary Traditional `0.5`, Simplified later in the list `0.7`, another Chinese language later `0.4`. Russia's tree, in order: primary `ru` `1`, primary `uk` `0.7`, `ru` later `0.6`, `uk` later `0.4`; any other language, including `be`, `kk`, `ky`, `hy`, `ka`, `az`, `tt`, `ba`, `cv`, `ce`, and `sah`, scores `0`. Primary-language rules take precedence over later-list matches within a profile. Keep `uk` below `ru` because mainland Ukraine is a supported region.

Match `intlLocale` by profile prefix: China Simplified `1` and other Chinese locales `0.5`; Russia `ru` `1` and `uk` `0.5`. Take the strongest match across profiles.

Read the browser's default Intl locale independently of the website's content language. Visiting a localized route must not make an English browser score as that profile's locale. The timezone is the value exposed to the browser; a separately configured shell or an emulated browser can expose a different value.

### Font and voice probing

Use Canvas [`measureText`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText) with a 72px sample and the three generic fallback families `monospace`, `sans-serif`, and `serif`; treat a width difference greater than 0.5px with any fallback as a match. Use a script-appropriate sample per profile: `中文字体检测ABCabc012` for China and `Проверка шрифта ABCabc012` for Russia.

Keep these 31 Simplified Chinese font candidates in configuration:

```text
Alibaba PuHuiTi, Baidu Number, DingTalk JinBuTi, Douyin Sans,
FZLanTingHeiS-R-GB, HarmonyOS Sans, HONOR Sans, MiSans,
Microsoft YaHei, Microsoft YaHei UI, OPPO Sans, SimSun,
NSimSun, SimHei, KaiTi, FangSong, DengXian, PingFang SC,
Hiragino Sans GB, STHeiti, STSong, Songti SC,
Source Han Sans CN, Source Han Sans SC, Noto Sans CJK SC,
Noto Serif CJK SC, Source Han Serif SC, vivo Sans, WPS Office,
WenQuanYi Micro Hei, WenQuanYi Zen Hei
```

Traditional candidates are `Microsoft JhengHei`, `PMingLiU`, `MingLiU`, `DFKai-SB`, `PingFang TC`, `PingFang HK`, `Source Han Sans TW`, and `Noto Sans CJK TC`.

China scores any Simplified candidate `min(1, 0.75 + 0.08 × matched count)`, only Traditional candidates `0.5`, and none `0`. Russia probes `PT Sans`, `PT Serif`, `PT Mono`, `PT Sans Narrow`, `PT Astra Sans`, `PT Astra Serif`, `GOST Type A`, and `GOST Type B`, scoring one match `0.5`, two `0.7`, three or more `1`, and none `0`. Stock Windows, macOS, and Android installations include no Russia-specific Cyrillic families, so expect Russian matches to be rare and mostly limited to Astra or ALT Linux, or engineering setups with GOST fonts; the reduced `fonts` weight reflects that. Take the strongest score across profiles.

Retain the complete matched list per profile in local result data. The reference shortens its human-readable summary to four names with an ellipsis; expose both the list and summary so your UI can decide how much to show. This measures available font rendering, which can be affected by fallback behavior, browser protections, and fonts loaded by the page. Avoid loading candidate font families as website fonts, which would contaminate the check. Do not request permission to enumerate local fonts.

Add the `speechVoices` detector: call `speechSynthesis.getVoices()`, wait for the `voiceschanged` event with a short timeout, and count only voices with `localService === true`, because network voices such as Chrome's Google voices would otherwise make the check universal. Score the strongest per-profile voice language: China `zh` `1`; Russia `ru` `1` and `uk` `0.6`; no matching voice `0`. An empty voice list or a missing API is `unavailable`, not a confirmed absence, and must not redistribute its weight. Firefox on Linux commonly returns an empty list, which produces an explainable partial result rather than a zero.

### Timezone offset

Keep the `new Date().getTimezoneOffset()` observation at 7 points, but scale strength by how much of the offset's population lives in countries where Anthropic operates. The `timezone` ID remains the primary discriminator; this table mostly separates offsets unique to unsupported regions from offsets shared with large supported populations.

| `getTimezoneOffset()` | UTC | Zones using it | Supported countries sharing it | Strength |
| --: | :--: | --- | --- | --: |
| `-120` | +2 | Russia (Kaliningrad) | Large: much of Europe, Israel, Egypt, South Africa, Ukraine in winter | 0.1 |
| `-180` | +3 | Russia (Moscow, Kirov, Volgograd, Simferopol), Belarus, Syria | Large: Turkey, Saudi Arabia, Kenya, Tanzania, Ethiopia, Iraq, Ukraine in summer | 0.3 |
| `-210` | +3:30 | Iran | None | 1 |
| `-240` | +4 | Russia (Samara, Astrakhan, Saratov, Ulyanovsk) | UAE, Oman, Georgia, Armenia, Azerbaijan, Mauritius, Seychelles | 0.25 |
| `-270` | +4:30 | Afghanistan | None | 1 |
| `-300` | +5 | Russia (Yekaterinburg) | Pakistan, Kazakhstan, Uzbekistan, Turkmenistan, Tajikistan, Maldives | 0.15 |
| `-360` | +6 | Russia (Omsk) | Bangladesh, Kyrgyzstan, Bhutan | 0.2 |
| `-390` | +6:30 | Myanmar | Australia's Cocos Islands only | 0.9 |
| `-420` | +7 | Russia (Novosibirsk, Krasnoyarsk, Barnaul, Tomsk, Novokuznetsk) | Vietnam, Thailand, Indonesia, Cambodia, Laos, Mongolia | 0.15 |
| `-480` | +8 | China (mainland), Russia (Irkutsk, Chita) | Philippines, Malaysia, Singapore, Taiwan, Australia, Brunei, Mongolia, Indonesia | 0.15 |
| `-540` | +9 | Russia (Yakutsk, Khandyga), North Korea | Japan, South Korea, Indonesia, Palau, Timor-Leste | 0.1 |
| `-600` | +10 | Russia (Vladivostok, Ust-Nera) | Australia, Papua New Guinea, Micronesia | 0.2 |
| `-660` | +11 | Russia (Magadan, Sakhalin, Srednekolymsk) | Small Pacific states: Solomon Islands, Vanuatu, Papua New Guinea, Micronesia, Australia | 0.8 |
| `-720` | +12 | Russia (Kamchatka, Anadyr) | New Zealand, Fiji, Kiribati, Marshall Islands, Nauru, Tuvalu | 0.5 |
| `+240` | −4 | Venezuela (Caracas) | Atlantic Canada, Caribbean islands, Chile in winter | 0.15 |
| `+300` | −5 | Cuba (Havana, winter) | United States and Canada Eastern, Colombia, Peru, Panama | 0.1 |

Offsets absent from this table score `0` by default. The Iran, Afghanistan, and Myanmar rows are effectively region-identifying because no supported country uses those offsets; the rest are deliberately low because large supported populations share them. Recheck the supported-country lists before changing them; the policy page changes over time.

### Browser and device matching

Use one merged, ordered, case-insensitive pattern table per detector, and stop at the first match. Keep the patterns in configuration and cover overlaps with fixtures. The China families come from the reference; verify the Russia markers against real user agents before shipping and record them in fixtures.

| Region | Browser or WebView family | Markers | Strength |
| --- | --- | --- | ---: |
| China | WeChat | `micromessenger` | 1 |
| China | QQ | `qqbrowser`, `mqqbrowser` | 1 |
| China | Quark | `quark` | 1 |
| China | UC | `ucbrowser`, `ucweb` | 1 |
| China | Baidu | `baidubrowser`, `baiduhd`, `baiduboxapp` | 1 |
| China | Sogou | `sogoumobilebrowser`, `metasr` | 0.9 |
| China | 360 | `360se`, `360ee`, `qhbrowser` | 0.9 |
| China | 2345 | `2345explorer` | 0.9 |
| China | Mi Browser | `miuibrowser` | 0.9 |
| China | Huawei | `huawei` with an optional `browser` suffix | 0.9 |
| China | OPPO | `heytapbrowser`, `hetapbrowser`, `oppobrowser` | 0.9 |
| China | vivo | `vivobrowser` | 0.9 |
| Russia | Yandex | `yabrowser`, `yowser` | 1 |
| Russia | Chromium GOST | `chromium gost` | 1 |
| Russia | SberBrowser | `sberbrowser` | 0.95 |
| Russia | Atom or Mail.ru | `atom`, `mrchrome` | 0.9 |
| Russia | VK or OK in-app WebView | `vkandroidapp`, `okandroidapp` | 0.9 |

For unmatched user agents, return a best-effort browser label, checking Edge before Chrome, then Safari and Firefox, while assigning zero points.

| Region | Device family | Markers | Strength |
| --- | --- | --- | ---: |
| China | HarmonyOS | `harmonyos`, `hmos` | 0.9 |
| China | Huawei or Honor | `huawei`, `honor` | 0.85 |
| China | Xiaomi or Redmi | `xiaomi`, `redmi`, `miui`, a standalone `mi` followed by whitespace, or an `m` plus four-digit model identifier | 0.8 |
| China | OPPO, OnePlus, or realme | `oppo`, `oneplus`, `realme`, `heytap` | 0.8 |
| China | vivo or iQOO | `vivo`, `iqoo` | 0.8 |
| China | Meizu | `meizu` | 0.75 |
| Russia | Russian-market brands | `bq-`, `dexp`, `inoi`, `digma`, `texet`, `irbis`, `prestigio` | 0.75 |
| Russia | Transsion | `tecno`, `infinix`, `itel` | 0.4 |

If nothing matches, return the exposed platform label or an unavailable label and zero strength. In particular, keep the Huawei browser rule's broad matching visible in configuration; it can overlap with a device marker. Chinese device families remain in the table for every profile because those devices are also common in Russia; the first match wins, so order still matters.

### Emoji signal

Preserve this signal for parity, but describe it as an OS style estimate. The reference does not inspect emoji pixels. Check Apple devices first, then Android, Windows, ChromeOS, and Linux; Android and ChromeOS map to Google.

Its nonzero values mean an otherwise neutral browser can still receive 1–3 points and an emoji hit. For example, the inspected Linux browser with Tokyo timezone, English language, and no detected candidate fonts scored `3`, classified as low. Do not silently change this behavior or present the score as a probability.

## Scoring and result data

Calculate each contribution independently:

```text
contribution = Math.round(strength × weight)
total = clamp(sum(contributions), 0, 100)
```

Do not round only after adding fractional contributions; that can produce a different result. A signal contributes at most once, using its strongest match across region profiles, so profiles do not add separate scores. The weights add up to 100, but several detectors have maximum strengths below 1, so the configured rules need not reach 100.

Classify the final score as low for 0–30, medium for 31–60, and high for 61–100. Classify individual signals as low below `0.25`, medium from `0.25` to below `0.6`, and high at `0.6` or above. A matched signal has strength at least `0.25`, independently of the overall classification. Preserve detector order in the matched list.

Return typed records along these lines:

```ts
type Band = 'low' | 'medium' | 'high';
type RegionId = 'cn' | 'ru';
type SignalId =
  | 'timezone' | 'language' | 'fonts' | 'speechVoices' | 'intlLocale'
  | 'timezoneOffset' | 'browserVendor' | 'deviceBrand' | 'emoji';

interface SignalResult {
  id: SignalId;
  status: 'available' | 'unavailable' | 'error';
  observed: string | number | string[] | null;
  strength: number;
  weight: number;
  contribution: number;
  severity: Band | null;
  region: RegionId | null;
}

interface ScanResult {
  rulesVersion: string;
  completedAt: string;
  total: number;
  band: Band;
  partial: boolean;
  signals: SignalResult[];
  hits: SignalId[];
  matchedRegions: RegionId[];
}
```

The status, partial flag, rules version, signal `region`, and `matchedRegions` are proposed improvements to make results explainable. Extend `RegionId` when a profile is added. For compatibility, an unavailable or failed detector contributes zero without redistributing its weight. Mark the overall result partial and do not label a failed check as a confirmed absence.

## Scan lifecycle and integration contract

Expose `runScan({ onEvent, signal })` and a reusable controller with `start()`, `getState()`, and `subscribe(listener)`. The optional abort signal allows a consuming UI to dispose of a run; it does not require adding a cancel feature to the website.

Use states `idle`, `running`, `complete`, and `error`. Each signal has a progress state of `pending`, `running`, or `complete`, separate from its detection status. Emit scan start, signal start, signal completion with the running total, and scan completion. A terminal controller failure emits an error and always releases the running lock.

On each new run, clear previous results and sharing payloads. Reject or ignore concurrent starts while a scan is running. Collect observations again for every run; do not reuse cached detector results. A failed individual check must allow the other checks to finish.

The scan processes the nine signals sequentially. The reference runs its eight sequential signals with roughly five seconds of artificial delays; preserve progress events without embedding presentation timing in the scoring functions. Optional pacing belongs in the controller configuration; your UI can choose when and how to animate progress. The initial result and sharing payload are absent until completion.

## Sharing and export

### Result text and social links

Build a localized summary containing the score, classification, matched signal names, and the current language's canonical site URL. Omit raw language lists, font lists, platform strings, and user agents from the default share payload. Use your product name and original wording.

Provide these adapters, based on the [reference's link builders](https://fuck-claude.com/_astro/Detector.astro_astro_type_script_index_0_lang.BjyUZeoD.js):

| Destination | Link base | Parameters |
| --- | --- | --- |
| X | `https://twitter.com/intent/tweet` | `text`, `url` |
| Facebook | `https://www.facebook.com/sharer/sharer.php` | `u`, `quote` |
| Telegram | `https://t.me/share/url` | `url`, `text` |
| Weibo | `https://service.weibo.com/share/share.php` | `url`, `title` |

Build URLs with proper parameter encoding and allow the visitor to open them. Posting and login happen on the destination service. Platforms may ignore prefilling fields, so verify their behavior before release.

For RED/Xiaohongshu, Douyin, and Jike, generate the summary plus site URL and localized platform-specific hashtags, then copy it to the clipboard. Keep hashtag sets in content configuration. These destinations have copy workflows rather than direct posting integrations.

Use `navigator.share({ title, text, url })` when supported, invoked from a visitor action. Treat cancellation as a normal outcome. HTTPS, capability checks, and user activation are required considerations in the [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share). Do not automatically open a share destination after a scan.

The shared URL points to the diagnostic page, where the recipient runs their own scan. The reference does not store individual results or provide a permalink that recreates a sender's scan.

### Clipboard behavior

Use one text-copy utility for terminal commands and platform summaries. Try `navigator.clipboard.writeText`, then a best-effort legacy copy fallback if needed. Return success, unsupported, or failure to the consumer so it can provide appropriate feedback. The reference resets copy feedback after about 1.2 seconds.

Use capability detection and handle browser restrictions; the modern [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) is the preferred interface, while the reference's `execCommand('copy')` fallback is deprecated. If copying is blocked, leave the text available for manual copying. Never read the clipboard for these features.

### Result PNG

Expose `createResultPng(result, locale, renderer): Promise<Blob>`. Your renderer defines the image's appearance; the functionality supplies localized score, classification, summary, matched names, and site URL. The reference exports 1200 × 630 pixels and includes up to six hit names.

Render locally using Canvas or an escaped SVG converted to Canvas, then export a PNG blob with [`toBlob`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob). Support wrapping or truncation of long localized text without prescribing its layout. Do not rely on a screenshot of the page or a server image endpoint. Release temporary object URLs after use.

Offer the reference's delivery order: supported native file sharing, then image clipboard copying with `ClipboardItem`, then PNG download. Cache a prepared blob after scan completion where practical, so lengthy image preparation does not consume the user activation required for sharing. Treat a canceled share as canceled; other failures may fall through to a supported delivery method. Catch rendering and export failures and return a recoverable error without changing the scan result.

## Terminal diagnostic commands

Provide these three command definitions from the reference. Copy them as plain text; the browser does not execute them or collect their output.

Endpoint and proxy variables:

```sh
env | grep -E '^(ANTHROPIC_BASE_URL|HTTPS?_PROXY|ALL_PROXY|NO_PROXY)='
```

Shell date, Intl settings, and locale:

```sh
date; node -e "console.log(Intl.DateTimeFormat().resolvedOptions())"; locale
```

DNS lookup:

```sh
dig +short api.anthropic.com || nslookup api.anthropic.com
```

The commands above target a Unix-like shell. Retain the site explanation that browser observations cannot inspect the shell's environment variables, proxy endpoint, or DNS configuration.

## Localization and educational content

Use explicit routes `/` for English and `/zh/` for Simplified Chinese, matching the reference. Store all human-readable messages in locale dictionaries, including result explanations, detector names, error messages, copy outcomes, share text, image text, commands' descriptions, FAQ answers, privacy text, and metadata.

Determine the content language from the route, independently of detected browser preferences. Allow explicit navigation between languages, use English as a dictionary fallback, and require a fresh scan after a full page navigation. Do not persist results to preserve them across routes.

Create original content for these seven FAQ subjects: reported timezone checks; how the heuristic differs from any internal check; why a higher score can coexist with normal account access; which settings affect observations; terminal diagnostics; account restrictions; and what data leaves the device. Also explain the nine checks, the region-profile model and which regions matched, weights, hit threshold, score bands, and limitations. These subjects are present on the [English reference](https://fuck-claude.com/) and [Chinese reference](https://fuck-claude.com/zh/).

Keep the official support destination configurable. The reference links to [Anthropic safeguards, warnings, and appeals](https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals). Opening that resource is the support feature; the application does not inspect or appeal an account on a visitor's behalf.

## Privacy and hosting behavior

Keep scan observations and results in memory. Do not send them through fetch, beacons, analytics events, error reporting, query strings, cookies, or persistent browser storage. Explicit sharing is the exception: the visitor chooses to send a summary to a sharing service or application.

The reference loads Google Analytics for page statistics. For this project, make analytics optional and disabled by default. If enabled, isolate it from detector and result objects and document the provider's actual collection rather than promising anonymity. Basic hosting and analytics requests should be distinguished from uploading scan results.

Serve static pages and assets over HTTPS. Include localized titles and descriptions, canonical URLs, language alternates, Open Graph and social preview metadata, robots rules, and a sitemap. Generate WebApplication and FAQ structured data from the same content definitions used by the pages. Generic social preview assets use your own artwork; they do not contain individual scan results.

Include a web manifest with app name, start URL, standalone display metadata, and icon references, like the [reference manifest](https://fuck-claude.com/site.webmanifest). This does not require adding a service worker or promising offline installation. Offline caching would be a separate feature if requested.

## Implementation sequence

1. **Define the core contracts and rules.** Create signal IDs, weights, region profiles, ordered pattern tables, font candidate lists, voice language sets, result types, and a versioned rules configuration. Add pure strength evaluation across profiles, contribution calculation, classification, and hit selection. Completion means deterministic fixtures reproduce the documented per-profile arithmetic and threshold boundaries.
2. **Implement browser observation adapters.** Collect timezone, languages, font measurements, speech voices, Intl locale, offset, user agent, and platform through an injectable environment interface. Completion means all nine detectors work without a UI and independently report unavailable observations.
3. **Implement the scan controller.** Add progress events, fresh reruns, concurrent-run protection, result aggregation, disposal, and isolated detector failures. Completion means a consumer can subscribe and run complete scans without inspecting the DOM.
4. **Add localized content and terminal checks.** Supply both language dictionaries, original educational content, FAQ definitions, support URL, and exact command strings. Completion means any result or command can be formatted in either language without affecting scoring.
5. **Add text sharing and clipboard adapters.** Implement social URLs, native share, platform text, and command copying. Completion means a finished result produces encoded localized payloads, and denied clipboard or share operations return usable outcomes.
6. **Add image export.** Implement local PNG generation with an injected renderer and native share, copy, and download delivery. Completion means the export pipeline works with your renderer and has recoverable fallbacks.
7. **Connect your UI and static routes.** Bind your own presentation to the controller, result data, and action adapters. Add metadata, manifest, sitemap, and HTTPS hosting configuration. Completion means both routes work on direct visits and the full application runs from static hosting.
8. **Verify functionality and privacy.** Run the checks below, then optionally configure page analytics. Completion means supported browsers can scan and rerun, sharing fallbacks work, and scanning produces no network requests carrying results.

Suggested module groups are `core/rules`, `core/scoring`, `core/types`, `browser/observations`, `scan/controller`, `content/locales`, `content/commands`, `sharing/text`, `sharing/links`, `sharing/clipboard`, and `sharing/image`. Page-specific DOM or framework code stays in your UI integration layer.

## Acceptance checks

- Detector fixtures cover Chinese, Russian, and non-target timezones, historical aliases, per-profile language ordering, script tags, UTC offset sign, ordered browser and device overlaps, unknown platforms, and region-profile selection.
- Font fixtures cover zero matches, Traditional-only matches, one Simplified match, Russian candidates, saturation where applicable, measurement tolerance, and unavailable Canvas. Voice fixtures cover Chinese and Russian voices, Ukrainian voices, network-only voices, empty lists, and missing APIs.
- Scoring checks cover per-signal rounding, strongest-match selection across profiles, scores 30/31 and 60/61, strengths just below and at 0.25 and 0.6, and a low overall score with matched signals.
- Lifecycle checks cover the initial empty state, progress ordering, duplicate starts, detector exceptions, fresh reruns, disposal, and an error that releases the running lock.
- Localization checks ensure route language does not affect detected locale, all message keys exist, and Chinese share text encodes correctly.
- Sharing checks cover absent native sharing, cancellation, clipboard denial, Unicode payloads, image export errors, image copying, and PNG download fallback. Test native sharing on a supported device rather than relying only on mocks.
- Browser checks include current Chrome, Firefox, Safari, and Edge, plus iOS Safari and Android Chrome where available. Reduced or protected signals produce an explainable partial result.
- Network checks verify that completing and repeating scans upload no raw observations or results, with optional analytics both enabled and disabled.
- Hosting checks verify direct access to both locale routes, metadata, sitemap, manifest, and working clipboard and share behavior over HTTPS.

Use meaningful rule and lifecycle tests plus a small number of browser integration checks. Avoid snapshotting a visual design as part of this functionality plan. All future package manager operations in this repository must use Socket Firewall wrappers, such as `sfw npm ...` or `sfw pnpm ...`.
