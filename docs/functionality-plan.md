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
| Eight local checks | Collect the browser signals detailed below | Browser adapters and detector registry |
| Scan progress | Report each check starting and finishing and the running score | Controller events |
| Weighted score | Produce an integer in the 0–100 range | Pure scoring functions |
| Result classification | Report low, medium, or high, with an explanation | Scoring and localized content |
| Individual findings | Return observed values, severity, and point contributions | Structured detector results |
| Matched findings | Return the qualifying signals and their contributions | Result aggregation |
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

Each detector returns an observation and a normalized signal strength from 0 to 1. Preserve the reference weights and rules initially so the score is reproducible. Keep the rules in a versioned configuration, rather than scattering constants through the UI.

| Signal ID | Weight | Browser observation | Reference scoring rule |
| --- | ---: | --- | --- |
| `timezone` | 26 | `Intl.DateTimeFormat().resolvedOptions().timeZone` | Mainland zone or historical alias: `1`; Hong Kong, Macau, or Taipei: `0.6`; otherwise `0` |
| `language` | 20 | `navigator.languages`, falling back to `navigator.language` | Primary Simplified Chinese: `1`; primary Traditional Chinese: `0.5`; Simplified Chinese later in the list: `0.7`; another Chinese language later: `0.4`; otherwise `0` |
| `fonts` | 18 | Canvas text width comparisons for configured font families | Any Simplified Chinese candidate: `min(1, 0.75 + 0.08 × matched count)`; only Traditional Chinese candidates: `0.5`; none: `0` |
| `intlLocale` | 9 | `Intl.DateTimeFormat().resolvedOptions().locale` | Simplified Chinese: `1`; another Chinese locale: `0.5`; otherwise `0` |
| `timezoneOffset` | 7 | `new Date().getTimezoneOffset()` | `-480` minutes, corresponding to UTC+8: `0.7`; otherwise `0` |
| `browserVendor` | 7 | Ordered matching against `navigator.userAgent` | Identified browser/WebView: `1` or `0.9`, as specified below; otherwise `0` |
| `deviceBrand` | 8 | Ordered matching against user agent and platform | Identified device family: `0.75`–`0.9`, as specified below; otherwise `0` |
| `emoji` | 5 | OS family inferred from user agent and platform | Apple: `0.25`; Microsoft: `0.4`; Google: `0.35`; Linux/other: `0.5`; unknown: `0.4` |

These are the rules in the [reference bundle](https://fuck-claude.com/_astro/Detector.astro_astro_type_script_index_0_lang.BjyUZeoD.js), rather than a validated measure of nationality or location. User agent hints can be absent or modified, as described in [MDN's user agent documentation](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent). Return uncertainty with observations instead of treating the inferred family as verified hardware.

### Timezone and locale matching

Use these explicit timezone sets:

- Mainland: `Asia/Shanghai`, `Asia/Urumqi`, `Asia/Chongqing`, `Asia/Chungking`, `Asia/Harbin`, `Asia/Kashgar`.
- Regional: `Asia/Hong_Kong`, `Asia/Macau`, `Asia/Taipei`.

Lowercase language tags before matching. Simplified matching means a tag starting with `zh-cn`, containing `hans`, or equal to `zh`. Traditional primary matching means a tag starting with `zh-tw`, `zh-hk`, or `zh-mo`, or containing `hant`. Evaluate language rules in the table's order: a primary Traditional Chinese language takes precedence over Simplified Chinese later in the list.

Read the browser's default Intl locale independently of the website's content language. Visiting the Chinese route must not make an English browser score as Chinese. The timezone is the value exposed to the browser; a separately configured shell or an emulated browser can expose a different value.

### Font probing

Use Canvas [`measureText`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText) to compare the sample `中文字体检测ABCabc012` with three generic fallback families: `monospace`, `sans-serif`, and `serif`. For each candidate, compare its width with the fallback-only width. The reference uses a 72px sample and treats a difference greater than 0.5px with any fallback as a match.

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

Retain the complete matched list in local result data. The reference shortens its human-readable summary to four names with an ellipsis; expose both the list and summary so your UI can decide how much to show. This measures available font rendering, which can be affected by fallback behavior, browser protections, and fonts loaded by the page. Avoid loading candidate font families as website fonts, which would contaminate the check. Do not request permission to enumerate local fonts.

### Browser and device matching

Use ordered, case-insensitive patterns and stop at the first match. Keep the patterns in configuration and cover overlaps with fixtures.

| Browser or WebView family | Markers | Strength |
| --- | --- | ---: |
| WeChat | `micromessenger` | 1 |
| QQ | `qqbrowser`, `mqqbrowser` | 1 |
| Quark | `quark` | 1 |
| UC | `ucbrowser`, `ucweb` | 1 |
| Baidu | `baidubrowser`, `baiduhd`, `baiduboxapp` | 1 |
| Sogou | `sogoumobilebrowser`, `metasr` | 0.9 |
| 360 | `360se`, `360ee`, `qhbrowser` | 0.9 |
| 2345 | `2345explorer` | 0.9 |
| Mi Browser | `miuibrowser` | 0.9 |
| Huawei | `huawei` with an optional `browser` suffix | 0.9 |
| OPPO | `heytapbrowser`, `hetapbrowser`, `oppobrowser` | 0.9 |
| vivo | `vivobrowser` | 0.9 |

For unmatched user agents, return a best-effort browser label, checking Edge before Chrome, then Safari and Firefox, while assigning zero points.

| Device family | Markers | Strength |
| --- | --- | ---: |
| HarmonyOS | `harmonyos`, `hmos` | 0.9 |
| Huawei or Honor | `huawei`, `honor` | 0.85 |
| Xiaomi or Redmi | `xiaomi`, `redmi`, `miui`, a standalone `mi` followed by whitespace, or an `m` plus four-digit model identifier | 0.8 |
| OPPO, OnePlus, or realme | `oppo`, `oneplus`, `realme`, `heytap` | 0.8 |
| vivo or iQOO | `vivo`, `iqoo` | 0.8 |
| Meizu | `meizu` | 0.75 |

If nothing matches, return the exposed platform label or an unavailable label and zero strength. In particular, keep the Huawei browser rule's broad matching visible in configuration; it can overlap with a device marker.

### Emoji signal

Preserve this signal for parity, but describe it as an OS style estimate. The reference does not inspect emoji pixels. Check Apple devices first, then Android, Windows, ChromeOS, and Linux; Android and ChromeOS map to Google.

Its nonzero values mean an otherwise neutral browser can still receive 1–3 points and an emoji hit. For example, the inspected Linux browser with Tokyo timezone, English language, and no detected candidate fonts scored `3`, classified as low. Do not silently change this behavior or present the score as a probability.

## Scoring and result data

Calculate each contribution independently:

```text
contribution = Math.round(strength × weight)
total = clamp(sum(contributions), 0, 100)
```

Do not round only after adding fractional contributions; that can produce a different result. The weights add up to 100, but several detectors have maximum strengths below 1, so the configured rules need not reach 100.

Classify the final score as low for 0–30, medium for 31–60, and high for 61–100. Classify individual signals as low below `0.25`, medium from `0.25` to below `0.6`, and high at `0.6` or above. A matched signal has strength at least `0.25`, independently of the overall classification. Preserve detector order in the matched list.

Return typed records along these lines:

```ts
type Band = 'low' | 'medium' | 'high';
type SignalId =
  | 'timezone' | 'language' | 'fonts' | 'intlLocale'
  | 'timezoneOffset' | 'browserVendor' | 'deviceBrand' | 'emoji';

interface SignalResult {
  id: SignalId;
  status: 'available' | 'unavailable' | 'error';
  observed: string | number | string[] | null;
  strength: number;
  weight: number;
  contribution: number;
  severity: Band | null;
}

interface ScanResult {
  rulesVersion: string;
  completedAt: string;
  total: number;
  band: Band;
  partial: boolean;
  signals: SignalResult[];
  hits: SignalId[];
}
```

The status, partial flag, and rules version are proposed improvements to make results explainable. For compatibility, an unavailable or failed detector contributes zero without redistributing its weight. Mark the overall result partial and do not label a failed check as a confirmed absence.

## Scan lifecycle and integration contract

Expose `runScan({ onEvent, signal })` and a reusable controller with `start()`, `getState()`, and `subscribe(listener)`. The optional abort signal allows a consuming UI to dispose of a run; it does not require adding a cancel feature to the website.

Use states `idle`, `running`, `complete`, and `error`. Each signal has a progress state of `pending`, `running`, or `complete`, separate from its detection status. Emit scan start, signal start, signal completion with the running total, and scan completion. A terminal controller failure emits an error and always releases the running lock.

On each new run, clear previous results and sharing payloads. Reject or ignore concurrent starts while a scan is running. Collect observations again for every run; do not reuse cached detector results. A failed individual check must allow the other checks to finish.

The reference processes the eight signals sequentially, with roughly five seconds of artificial delays. Preserve progress events without embedding presentation timing in the scoring functions. Optional pacing belongs in the controller configuration; your UI can choose when and how to animate progress. The initial result and sharing payload are absent until completion.

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

Create original content for these seven FAQ subjects: reported timezone checks; how the heuristic differs from any internal check; why a higher score can coexist with normal account access; which settings affect observations; terminal diagnostics; account restrictions; and what data leaves the device. Also explain the eight checks, weights, hit threshold, score bands, and limitations. These subjects are present on the [English reference](https://fuck-claude.com/) and [Chinese reference](https://fuck-claude.com/zh/).

Keep the official support destination configurable. The reference links to [Anthropic safeguards, warnings, and appeals](https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals). Opening that resource is the support feature; the application does not inspect or appeal an account on a visitor's behalf.

## Privacy and hosting behavior

Keep scan observations and results in memory. Do not send them through fetch, beacons, analytics events, error reporting, query strings, cookies, or persistent browser storage. Explicit sharing is the exception: the visitor chooses to send a summary to a sharing service or application.

The reference loads Google Analytics for page statistics. For this project, make analytics optional and disabled by default. If enabled, isolate it from detector and result objects and document the provider's actual collection rather than promising anonymity. Basic hosting and analytics requests should be distinguished from uploading scan results.

Serve static pages and assets over HTTPS. Include localized titles and descriptions, canonical URLs, language alternates, Open Graph and social preview metadata, robots rules, and a sitemap. Generate WebApplication and FAQ structured data from the same content definitions used by the pages. Generic social preview assets use your own artwork; they do not contain individual scan results.

Include a web manifest with app name, start URL, standalone display metadata, and icon references, like the [reference manifest](https://fuck-claude.com/site.webmanifest). This does not require adding a service worker or promising offline installation. Offline caching would be a separate feature if requested.

## Implementation sequence

1. **Define the core contracts and rules.** Create signal IDs, weights, ordered pattern tables, font candidate lists, result types, and a versioned rules configuration. Add pure strength evaluation, contribution calculation, classification, and hit selection. Completion means deterministic fixtures reproduce the reference arithmetic and threshold boundaries.
2. **Implement browser observation adapters.** Collect timezone, languages, font measurements, Intl locale, offset, user agent, and platform through an injectable environment interface. Completion means all eight detectors work without a UI and independently report unavailable observations.
3. **Implement the scan controller.** Add progress events, fresh reruns, concurrent-run protection, result aggregation, disposal, and isolated detector failures. Completion means a consumer can subscribe and run complete scans without inspecting the DOM.
4. **Add localized content and terminal checks.** Supply both language dictionaries, original educational content, FAQ definitions, support URL, and exact command strings. Completion means any result or command can be formatted in either language without affecting scoring.
5. **Add text sharing and clipboard adapters.** Implement social URLs, native share, platform text, and command copying. Completion means a finished result produces encoded localized payloads, and denied clipboard or share operations return usable outcomes.
6. **Add image export.** Implement local PNG generation with an injected renderer and native share, copy, and download delivery. Completion means the export pipeline works with your renderer and has recoverable fallbacks.
7. **Connect your UI and static routes.** Bind your own presentation to the controller, result data, and action adapters. Add metadata, manifest, sitemap, and HTTPS hosting configuration. Completion means both routes work on direct visits and the full application runs from static hosting.
8. **Verify functionality and privacy.** Run the checks below, then optionally configure page analytics. Completion means supported browsers can scan and rerun, sharing fallbacks work, and scanning produces no network requests carrying results.

Suggested module groups are `core/rules`, `core/scoring`, `core/types`, `browser/observations`, `scan/controller`, `content/locales`, `content/commands`, `sharing/text`, `sharing/links`, `sharing/clipboard`, and `sharing/image`. Page-specific DOM or framework code stays in your UI integration layer.

## Acceptance checks

- Detector fixtures cover Chinese and non-Chinese timezones, historical aliases, language ordering, script tags, UTC offset sign, ordered UA overlaps, and unknown platforms.
- Font fixtures cover zero matches, Traditional-only matches, one Simplified match, saturation, measurement tolerance, and unavailable Canvas.
- Scoring checks cover per-signal rounding, scores 30/31 and 60/61, strengths just below and at 0.25 and 0.6, and a low overall score with matched signals.
- Lifecycle checks cover the initial empty state, progress ordering, duplicate starts, detector exceptions, fresh reruns, disposal, and an error that releases the running lock.
- Localization checks ensure route language does not affect detected locale, all message keys exist, and Chinese share text encodes correctly.
- Sharing checks cover absent native sharing, cancellation, clipboard denial, Unicode payloads, image export errors, image copying, and PNG download fallback. Test native sharing on a supported device rather than relying only on mocks.
- Browser checks include current Chrome, Firefox, Safari, and Edge, plus iOS Safari and Android Chrome where available. Reduced or protected signals produce an explainable partial result.
- Network checks verify that completing and repeating scans upload no raw observations or results, with optional analytics both enabled and disabled.
- Hosting checks verify direct access to both locale routes, metadata, sitemap, manifest, and working clipboard and share behavior over HTTPS.

Use meaningful rule and lifecycle tests plus a small number of browser integration checks. Avoid snapshotting a visual design as part of this functionality plan. All future package manager operations in this repository must use Socket Firewall wrappers, such as `sfw npm ...` or `sfw pnpm ...`.
