# UI prototype — throwaway

Question: How can an eight-signal browser diagnostic feel simple, transparent, and calm?

The three initial layouts share the same static specimen content:

- `/?variant=A`: Paper — a spacious editorial introduction above a split diagnostic workspace.
- `/?variant=B`: Console — a compact dark inspector with a persistent section rail.
- `/?variant=C`: Focus - the preferred, refined default. A centered introduction using D's copy, one primary scan button, and plain open content sections.

Two additive variants use Taste Skill v2. They originally preserved A/B/C; C was subsequently refined in response to user feedback. The original `styles.css` is still unchanged:

- `/?variant=D`: Overview - a sans-serif introduction beside the actual check controls, followed by two groups of four signal observations.
- `/?variant=E`: Report - a compact heading, a horizontal score summary, and a continuous report with three meaningful signal groups.

Taste design read: a browser diagnostic for technical users, with a calm, functional aesthetic implemented in native CSS. The existing brand, locale routes, navigation labels, eight signals, sample data, and UI states are preserved. Original brand tokens include the blue accent, scan mark, and `screw/claude` wordmark. A/B/C had editorial, inspector, and centered layouts; D/E explore grouped observations and a report, without revising those originals.

The new variants use local Geist/Geist Mono fonts and Tabler outline icons. D uses `DESIGN_VARIANCE: 6`, `MOTION_INTENSITY: 3`, `VISUAL_DENSITY: 3`; E uses `5 / 2 / 4`. Hover/active feedback is the only motion. One blue accent runs throughout both appearances. Surfaces/dialogs use 16px corners and controls use 8px. The diagnostic itself is the visual focus; decorative photography would not serve this minimal tool. The new CSS and templates are separate files, scoped to D/E. Both follow the system appearance and offer a header toggle; `?theme=dark` or `?theme=light` also previews either appearance. Original A/B/C appearance behavior is unchanged.

Focus has a compact bottom control with previous/next arrows and the current state name. It cycles through ready, checking, low, medium, high, partial, and error screens using the existing localized state labels. Add `?review=1` to compare designs using the full bottom switcher or left/right arrow keys; this replaces the compact state control. `?state=low`, for example, opens a shareable sample result. `?review=0` hides all preview controls for a clean view. English is at `/`; Simplified Chinese is at `/zh/`; Russian is at `/ru/`. All five variants use the same three language links, which preserve query parameters and the current section. Russian covers page content, all sample states, sharing previews, command descriptions, clipboard feedback, accessible labels, and page metadata. Content language does not change the sample observations or scores.

Run from the repository root:

```sh
python3 ui-prototype/server.py
```

No dependencies, detection, scoring, social posting, image generation, analytics, persistence, or API calls. Every observation and score is hard-coded sample content. JavaScript changes presentation, opens dialogs, and copies the selected terminal command to the clipboard when requested. Focus has an icon-only copy button for each command, with a brief checkmark and an accessible status announcement after copying. A/B/D/E retain their visual specimen controls. Commands are never executed. A small local CJK font subset ensures the Chinese UI renders on machines without system CJK fonts; its license is included in `fonts/OFL.txt`.

Design direction chosen by the user: C's Focus layout with D's Overview copy. D/E felt crowded and the primary scan action was unclear. C's original slogan and ornamental text were unnecessary. The refinement preserves the centered white/blue design, puts "Check my browser" immediately below the plain headline and intro, and removes the duplicate ready card, numbered sections, privacy badges, and steps. The ready screen lists the eight check names without empty readings or weights. Running/result screens show their observations in an open list. Explanations, terminal commands, and all FAQ answers appear in plain sections; sharing choices are also visible without expandable groups. The user rejected both the original clutter and the subsequent accordion approach, so C contains no accordions or nested disclosures. Results have one primary "Check again" action and a quieter sharing action. The UI remains a static prototype; A/B/D/E are retained for comparison.

The C refinement uses native CSS with `DESIGN_VARIANCE: 4`, `MOTION_INTENSITY: 1`, `VISUAL_DENSITY: 2`. Its text comes directly from D's shared locale copy. It respects system light/dark appearance and accepts `?theme=light` / `?theme=dark`. The logo, color, locale routes, sample fixtures, weights, and eight signals are preserved. C's templates and CSS are isolated in `focus-variant.js` and `focus-variant.css`.

The latest polish adds small Tabler outline icons beside signal names and section headings, increases body text to 15px (16px for the desktop introduction), and adds the compact state control requested by the user. All page, header, footer, and share-dialog text matches the 14 saved English/Chinese state specimens exactly. The state switcher reuses existing labels, updates the URL, preserves keyboard focus, and brings the state panel into view when needed. It changes only presentation. All 42 layout checks passed at 320px, 390px, and 1440px across both locales and all states; the 16 A/B/D/E comparison screens still match. Checked mouse clicks, backwards/forwards wraparound, Enter/Space/Tab, clean/comparison views, sharing, and dark appearance. No JavaScript exceptions, missing assets, horizontal overflow, or accordions.

The icon/type/state-control revision also scored 99 for performance and 100 for accessibility in Lighthouse's mobile audit, with LCP 1.7s, total blocking time 0ms, and CLS 0. Introduction lines are balanced with CSS without modifying the copy.

The terminal copy buttons were checked at 320px, 390px, and 1440px in both locales and appearances. All three raw command strings copied exactly on localhost and through tailnet HTTPS. Keyboard activation preserves focus; repeated copies, feedback reset, and clipboard-denial feedback work. No JavaScript exceptions or horizontal overflow. Lighthouse scored 99 for performance and 100 for accessibility, with LCP 1.7s and CLS 0.

The Russian addition passed 105 layout checks across all five variants, all seven states, and 320px/390px/1440px widths, plus all seven Focus states in dark appearance. The 30 saved English/Chinese content specimens match exactly. Checked Russian metadata, complete message keys, language links retaining query parameters and section, sharing and Escape dismissal, state controls, and the scan preview. All three commands copied exactly through tailnet HTTPS with Russian feedback. No JavaScript exceptions or horizontal overflow. Lighthouse scored 99 for performance and 100 for accessibility, with LCP 1.8s and CLS 0; the language links' accessible names include their visible labels.

Before removing accordions, verified the refined C in 112 combinations of four widths (320px, 390px, 768px, 1440px), both locales, both appearances, and all seven sample states. The start action fits without scrolling, each screen has at most one primary action, and there is no horizontal overflow. Checked the disclosures, share dialog and Escape dismissal, reset, comparison controls, system appearance changes, explicit appearance overrides, and Chinese glyph coverage. All 16 saved A/B/D/E comparison screens still match. No JavaScript exceptions or missing assets. Lighthouse's mobile audit scored 99 for performance and 100 for accessibility (LCP 1.7s, total blocking time 0ms, CLS 0). Both locale routes and new assets return HTTP 200 through the existing tailnet endpoint.

After the user rejected the accordion approach, checked 25 updated screens covering all seven states, 320px/390px/1440px widths, Chinese, and dark appearance. C has zero `details` or `summary` elements in either the page or share dialog. All seven FAQ answers and three terminal commands are directly visible. The 16 A/B/D/E comparison snapshots still match; scan preview, reset, sharing, and Escape dismissal work. No overflow, missing assets, or JavaScript exceptions. Lighthouse remains 99 for performance / 100 for accessibility, with LCP 1.7s and CLS 0. The tailnet preview serves the changes immediately.

Verified in headless Chrome at 320px, 768px, and 1440px for all seven sample states across all three designs, plus the Chinese result screens. No horizontal overflow or JavaScript exceptions. Checked design and keyboard switching, the state picker, reset, modal opening and Escape dismissal, terminal and FAQ disclosures, hidden review controls, and page loading over tailnet HTTPS. Page assets are served locally; no third-party requests are made.

Before the C refinement, the Taste additions were checked at 320px, 390px, 768px, and 1440px in light and dark appearances, across every sample state, with additional Chinese screens. At that point the 42 saved original A/B/C content and layout snapshots still matched; the original stylesheet was byte-identical. Both new layouts scored 100 for performance and 100 for accessibility in Lighthouse's simulated mobile audit: LCP 1.5s, total blocking time 0ms, and CLS 0.013 for D / 0 for E. Their fonts use small local WOFF2 subsets; the preview server compresses HTML, CSS, JavaScript, and SVG responses without changing their decoded contents.

The preview initially used foreground tool sessions. Both processes ended after the chat turn, removing the endpoint and causing `ERR_CONNECTION_TIMED_OUT`. The server now runs as a transient systemd user service; Tailscale manages the dedicated background endpoint. Both outlive a chat turn. Existing services are left in place.

Start the temporary preview from the repository root:

```sh
systemd-run --user --unit=screw-claude-ui-preview --collect \
  --working-directory="$PWD" --property=Restart=on-failure \
  /usr/bin/python3 "$PWD/ui-prototype/server.py"
tailscale serve --bg --https=9445 http://127.0.0.1:4173
```

Preview: `https://<tailnet-host>:9445/` (tailnet only; the host name is kept out of this repository).

Stop the temporary preview and remove only its forwarding endpoint:

```sh
tailscale serve --https=9445 off
systemctl --user stop screw-claude-ui-preview.service
```

Do not use `tailscale serve reset`. The systemd service is transient and is not enabled at boot. After the lifecycle fix, both language routes returned HTTP 200 over tailnet HTTPS from a separate tool invocation, and the server unit remained active.

## The live application (plan implementation)

The Focus presentation (`?variant=C`, the default route) is no longer a static specimen: it implements [the functionality plan](../docs/functionality-plan.md) with real local detection, weighted scoring and a working share flow. A (Paper), B (Console), D (Overview) and E (Report) stay frozen as design specimens.

### What runs

- **Nine local checks**, each with a fixed weight: timezone 26, language 20, font rendering 5, speech voices 13, default locale 9, UTC offset 7, browser family 7, device family 8, emoji style 5. Weights total 100 and the score is clamped to 0–100. Contributions are `Math.round(strength × weight)`.
- **Region profiles** for China and Russia. Every check is evaluated inside each profile and the strongest result wins (ties keep profile order); within a profile the first matching table row wins. Signal strength is independent of the route language, and content language comes from the URL alone.
- **Statuses**: `available`, `unavailable` (missing API, empty voice list), `error` (a check threw). Missing checks add no points and mark the overall result `partial`; they are never reported as absence.
- **Bands**: low 0–30, medium 31–60, high 61–100. A *matched* signal has strength ≥ 0.25; individual severities are low < 0.25, medium 0.25–< 0.6, high ≥ 0.6. Matched signals stay in detector order.
- **Sharing** offers a localized summary (score, band, matched signal names, page URL — no raw observations), four social destinations (X, Facebook, Telegram, Weibo), three copy platforms (小红书, 抖音, 即刻) and a locally rendered 1200×630 PNG delivered in the documented order: native file share → image clipboard → PNG download. A canceled share stays canceled; other failures fall through.
- **Terminal commands** are copied verbatim and never executed. Nothing is uploaded, and analytics are off unless a deployment enables them.

### Layout

```
ui-prototype/
  index.html  zh/  ru/        route shells (meta injected between <!-- meta:start --> and <!-- meta:end -->)
  app.js                      shell/router plus the frozen A/B/D/E specimens
  build.mjs                   zero-dependency build: type-strip src → dist, inject metadata
  src/core/                   types, rules (tables and weights), scoring, detectors
  src/browser/                observation source, canvas card, download adapter
  src/scan/controller.ts      sequential checks, progress events, fresh reruns, abort
  src/content/                en/zh/ru dictionaries, commands, site config
  src/sharing/                summary text, links, clipboard, image generation and delivery
  src/ui/                     render layer, live entry (main.ts), review previews
  assets/                     social preview and maskable icon
  dist/                       committed build output (loaded by the three shells)
  tests/                      node:test suites (307 cases)
  tools/browser-check.mjs     dependency-free CDP smoke check
  tools/subset-cjk.py         maintenance: regenerate the bundled CJK subsets
```

### Commands

Run from `ui-prototype/`:

```sh
npm run build       # type-strip src/ into dist/ and regenerate metadata artifacts
npm run typecheck   # tsc --noEmit
npm test            # node --test (307 cases)
npm run smoke       # headless Chrome check over the DevTools protocol
npm run check       # typecheck + build + test + smoke
```

`npm test` and `npm run smoke` need the static server on `http://127.0.0.1:4173` (the smoke check drives a real browser). `npm run build` output is deterministic and committed, and the build suite fails if `dist/` or the generated metadata is stale. `npm test` runs 316 cases.

### Review URLs

| URL | What it shows |
| --- | --- |
| `/` | the live application (English) |
| `/zh/`, `/ru/` | the same application in Simplified Chinese and Russian |
| `/?review=1&state=high` | design review: a real high-score result (76) over an injected environment |
| `/?review=1&state=medium` | 36 points, China profile, partial-match language list |
| `/?review=1&state=low` | 3 points, no profile |
| `/?review=1&state=partial` | 71 points with the font check unobservable |
| `/?review=1&state=running` | mid-scan progress snapshot |
| `/?review=1&state=error` | the terminal error screen |
| `/?variant=A|B|D|E` | the frozen design specimens |
| `?review=0` | hides the review controls |
| `?theme=light|dark` | forces an appearance |

Review previews are not mock strings: each one runs the real controller over an injected environment, so the review screens cannot drift from the shipped arithmetic.

### Decisions worth knowing

- **Strongest-across-profiles** is deliberate: a Yandex user agent on Huawei hardware matches both tables at full strength, and the Russia profile's browser marker wins while the device stays China-flagged.
- **A zero-strength rule keeps its profile.** A Belarusian timezone is consistent with the Russia profile at 0.0 strength, so the observation shows the profile while adding no points. A signal where no profile rule applied at all stays neutral.
- **Bare `zh` counts as Simplified** in the primary and later positions, matching the reference; `zh-TW`/`zh-HK`/`zh-MO` and `hant` are Traditional.
- **Fonts saturate**: one Simplified match scores 0.83 and each further match adds 0.08 up to 1; a Traditional-only set scores 0.5. Russian candidate fonts use thresholds 1 → 0.5, 2 → 0.7, 3 → 1.
- **Presentation timing lives in the controller**, never in scoring: `PACING` only delays progress events.
- **`SITE.origin` is `https://screw-claude.example`**, a placeholder to configure before deployment. Runtime share URLs prefer the live HTTP(S) origin.
- **The bundled CJK subset must cover the shipped copy.** `tools/subset-cjk.py` collects the inventory from the sources and regenerates `fonts/ui-cjk.ttf` and `taste-assets/cjk.woff2` from Noto Sans SC (OFL). The smoke check verifies every rendered CJK character is inside that subset, on the page and on the canvas card, because a missing glyph is an unreadable box on machines without system CJK fonts.

### Verification

- 316 unit tests: rule tables and fixtures (Chinese, Russian, aliases, lowercase zones, script tags, overlapping browser/device markers, unknown platforms), font and voice permutations, weight rounding and the 30/31 and 60/61 boundaries, controller lifecycle (duplicate starts, detector exceptions, fresh reruns, abort, disposal, lock release), content parity across the three dictionaries, sharing (summary, links, clipboard denial, PNG generation, delivery order, canceled share), privacy (no network during scans with analytics on or off), the deterministic build against the committed artifacts, and a source-hygiene scan for network or storage calls.
- A dependency-free CDP smoke check (261 checks) drives a real headless Chrome through all three routes: it runs an actual scan, verifies that the nine observations and the score agree with the sum of contributions, opens the share dialog, checks the four social links and three copy platforms, copies a terminal command, renders review previews, inspects the generated 1200×630 card, confirms zero third-party requests, and verifies the CJK subset covers every rendered character.

### Not verified here

- **Native sharing on a real device.** The share-sheet path is covered by unit tests with injected environments and by the browser check confirming the "no system sharing" fallback; an actual iOS/Android share sheet needs a real device.
- **HTTPS hosting.** Routes, metadata, sitemap, manifest and clipboard behaviour are verified over `http://127.0.0.1:4173`; the tailnet endpoint above serves the same files over HTTPS.
- **Browsers other than Chromium.** The smoke check drives ten user agents through the real detectors, but only Chromium renders them; engine-specific font metrics or clipboard differences are not exercised.

## GitHub Pages deployment

The site is published from this directory by `.github/workflows/deploy-pages.yml` on every push to `main`:

```sh
gh workflow run deploy-pages.yml     # or just push to main
gh run watch                          # follow the build and deploy
```

Published at **https://helpahelpa.github.io/screw-claude/** (`/zh/` and `/ru/` for the other languages).

Two rules make one build work both locally and under a project subdirectory:

- **Runtime URLs are mount-relative.** `src/content/paths.ts` derives the mount point from the page's own pathname, so `/zh/`, `/screw-claude/zh/` and any future subdirectory agree. Shell asset references are `./`- and `../`-relative, sprite references are origin-relative, and share payloads use the live origin plus mount point. Nothing about the running page needs to know it is on Pages.
- **The manifest is mount-agnostic.** `start_url`, `scope` and the icon sources are relative, so they resolve against the manifest itself at either mount point.

`SITE.origin` and `SITE.basePath` describe the *deployment* and are used only for absolute metadata: canonical and alternate links, Open Graph and Twitter images, structured data, `sitemap.xml` and `robots.txt`. Change both together if the site moves, then run `npm run build`.

`npm run smoke` drives a real headless Chrome; add `-- --url <deployment>` to run the same 261 checks against a published site (this is how the live deployment was verified). It includes a `mounted` pass: it serves the built output under `/screw-claude/` from a throwaway in-process server and repeats the page, scan, sharing, metadata and asset checks there, which is exactly the Pages layout.
