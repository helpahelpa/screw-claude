<img src="assets/icon.svg" width="64" height="64" alt="">

# screw-claude

Created in [T3 Code](https://t3.codes).

## Browser environment diagnostic

A static, dependency-free web app that explains what a browser reveals about its
environment. Nine checks read settings the browser already exposes — time zone,
language order, installed fonts, local speech voices, default locale, UTC
offset, browser family, device family and emoji style — score them from 0 to 100
with documented weights, and show exactly where every point came from.

Everything runs on the device. There is no server, database, account or API
call: the app is plain files served statically, and detection, scoring, sharing
text and the result image are all produced in the browser. The functionality
plan lives in [docs/functionality-plan.md](docs/functionality-plan.md).

## Run it

```sh
python3 ui-prototype/server.py
```

Open `http://127.0.0.1:4173` for the live application (English). Simplified
Chinese is at `/zh/` and Russian at `/ru/`. The bottom arrows cycle through
design-review previews of every screen — those previews run the real detection
pipeline over injected sample environments, so they never drift from the shipped
arithmetic. Add `?review=1` to show the review controls, `?review=0` to hide
them, or `?theme=light` / `?theme=dark` to force an appearance. A (Paper),
B (Console), D (Overview) and E (Report) remain available as frozen design
specimens at their `?variant=` URLs.

## Build and test

From `ui-prototype/`:

```sh
npm run build       # compile src/ into the committed dist/ and regenerate metadata
npm run typecheck   # tsc --noEmit
npm test            # 307 unit tests (node:test)
npm run smoke       # headless-Chrome smoke check over the DevTools protocol
npm run check       # all of the above
```

The build has no runtime dependencies: Node's own type stripping compiles the
TypeScript core, and `build.mjs` also generates the per-route metadata,
`sitemap.xml`, `robots.txt` and `site.webmanifest`. Output is deterministic and
committed, so the test suite fails when `dist/` or the metadata is stale.

## Deployment

Publish the `ui-prototype/` directory as static files. Before going live, set
`SITE.origin` in `ui-prototype/src/content/site.ts` to the real origin, run
`npm run build`, and confirm `npm run check` passes. Analytics are disabled
(`provider: 'none'`) and receive page events only; they never carry scan data.

See [prototype notes](ui-prototype/NOTES.md) for the module layout, the review
URLs, the scoring decisions, and the temporary tailnet preview command.
