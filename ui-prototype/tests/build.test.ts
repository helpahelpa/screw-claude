/* Build integrity: deterministic output, committed artifacts in sync, metadata,
 * no external requests, and a light style floor. */

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const ROUTES = ['index.html', 'zh/index.html', 'ru/index.html'];
const ARTIFACTS = [...ROUTES, 'sitemap.xml', 'robots.txt', 'site.webmanifest'];

/** The deployment the committed metadata describes (GitHub Pages project page). */
const ORIGIN = 'https://helpahelpa.github.io';
const BASE = '/screw-claude/';
const HOME = `${ORIGIN}${BASE}`;

function sha(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

async function walk(directory: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await walk(path.join(directory, entry.name), relative)));
    else files.push(relative);
  }
  return files.sort();
}

async function snapshot(directory: string): Promise<Record<string, string>> {
  const files = await walk(directory);
  const result: Record<string, string> = {};
  for (const file of files) result[file] = sha(await readFile(path.join(directory, file)));
  return result;
}

/* Rebuild in a disposable copy so the repository is never modified. */
let buildDir = '';
let firstBuild: Record<string, string> = {};
let secondBuild: Record<string, string> = {};

before(async () => {
  buildDir = await mkdtemp(path.join(tmpdir(), 'screw-claude-build-'));
  await cp(path.join(ROOT, 'src'), path.join(buildDir, 'src'), { recursive: true });
  await cp(path.join(ROOT, 'build.mjs'), path.join(buildDir, 'build.mjs'));
  for (const route of ROUTES) {
    await cp(path.join(ROOT, route), path.join(buildDir, route));
  }
  execFileSync(process.execPath, ['build.mjs'], { cwd: buildDir, stdio: 'pipe' });
  firstBuild = await snapshot(buildDir);
  execFileSync(process.execPath, ['build.mjs'], { cwd: buildDir, stdio: 'pipe' });
  secondBuild = await snapshot(buildDir);
});

after(async () => {
  if (buildDir) await rm(buildDir, { recursive: true, force: true, maxRetries: 5 });
});

describe('compiled modules', () => {
  it('emits one module per source file', async () => {
    const sources = (await walk(path.join(ROOT, 'src'))).filter(file => file.endsWith('.ts'));
    const compiled = (await walk(path.join(buildDir, 'dist'))).filter(file => file.endsWith('.js'));
    assert.equal(compiled.length, sources.length);
    for (const source of sources) {
      assert.ok(compiled.includes(source.replace(/\.ts$/, '.js')), `missing build output for ${source}`);
    }
  });

  it('leaves no TypeScript import specifier or type-only syntax behind', async () => {
    for (const file of await walk(path.join(buildDir, 'dist'))) {
      if (!file.endsWith('.js')) continue;
      const source = await readFile(path.join(buildDir, 'dist', file), 'utf8');
      assert.equal(/from\s*['"][^'"]*\.ts['"]/.test(source), false, `${file} imports a .ts path`);
      assert.equal(/^\s*import\s+type\b/m.test(source), false, `${file} kept a type-only import`);
      assert.equal(/^\s*(interface|type)\s+\w+/m.test(source), false, `${file} kept a type declaration`);
      assert.equal(source.trim().length > 0, true, `${file} is empty`);
    }
  });

  it('keeps the live entry importing the compiled core', async () => {
    const entry = await readFile(path.join(buildDir, 'dist/ui/main.js'), 'utf8');
    assert.match(entry, /from '\.\.\/core\/rules\.js'/);
    assert.match(entry, /window\.ScrewClaude/);
  });

  it('is byte-for-byte deterministic', () => {
    assert.deepEqual(secondBuild, firstBuild);
  });
});

describe('committed artifacts', () => {
  it('matches a fresh build from the current sources', async () => {
    const committed = new Set<string>();
    for (const file of await walk(path.join(ROOT, 'dist'))) committed.add(`dist/${file}`);
    for (const artifact of ARTIFACTS) committed.add(artifact);

    for (const file of committed) {
      const built = firstBuild[file];
      assert.ok(built, `${file} is not produced by the build`);
      const onDisk = await readFile(path.join(ROOT, file), 'utf8').catch(() => null);
      assert.ok(onDisk !== null, `${file} is missing from the repository`);
      assert.equal(sha(onDisk), built, `${file} is stale: run npm run build`);
    }

    assert.equal(secondBuild['sitemap.xml'], firstBuild['sitemap.xml']);
  });

  it('serves the live application from each route shell', async () => {
    for (const route of ROUTES) {
      const html = await readFile(path.join(ROOT, route), 'utf8');
      // Asset references are relative, so the site works at any mount point.
      assert.match(html, /<script type="module" src="(?:\.\.?\/)?dist\/ui\/main\.js"><\/script>/);
      assert.match(html, /<link rel="manifest" href="(?:\.\.?\/)?site\.webmanifest">/);
      assert.match(html, /<link rel="icon" href="(?:\.\.?\/)?favicon\.svg"/);
      assert.equal(/="\/(?:dist|styles|taste-variants|focus-|favicon|site\.webmanifest)/.test(html), false);
      assert.match(html, /focus-live\.css/);
      assert.equal(html.includes('focus-variant.js'), false, `${route} still loads the retired renderer`);
      // The markers stay in place so the build can be re-run; the block must be filled.
      assert.ok(html.includes('<!-- meta:start -->') && html.includes('<!-- meta:end -->'), `${route} markers`);
      assert.match(html, new RegExp(`<link rel="canonical" href="${HOME.replace(/[/.]/g, '\\$&')}[^"]*">`));
    }
  });

  it('keeps the retired specimen renderer deleted', async () => {
    await assert.rejects(() => stat(path.join(ROOT, 'focus-variant.js')));
    await assert.rejects(() => stat(path.join(ROOT, 'src', 'ui', 'focus-variant.ts')));
  });
});

describe('metadata artifacts', () => {
  it('writes localized canonical, alternate and social tags per route', async () => {
    const expectations: [string, string, string][] = [
      ['index.html', HOME, 'en'],
      ['zh/index.html', `${HOME}zh/`, 'zh-CN'],
      ['ru/index.html', `${HOME}ru/`, 'ru'],
    ];
    for (const [route, canonical, hreflang] of expectations) {
      const html = await readFile(path.join(ROOT, route), 'utf8');
      assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`), `${route} canonical`);
      assert.ok(html.includes(`<meta property="og:url" content="${canonical}">`), `${route} og:url`);
      assert.ok(html.includes(`<link rel="alternate" hreflang="${hreflang}"`), `${route} hreflang`);
      for (const locale of ['en', 'zh-CN', 'ru']) {
        assert.ok(html.includes(`hreflang="${locale}"`), `${route} missing ${locale} alternate`);
      }
      assert.ok(html.includes('hreflang="x-default"'), `${route} missing x-default`);
      assert.ok(html.includes('assets/social-preview.svg'), `${route} missing preview image`);
      assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'), `${route} twitter card`);
      assert.ok(html.includes('<meta name="description"'), `${route} description`);
    }
  });

  it('embeds parseable structured data covering the FAQ', async () => {
    for (const route of ROUTES) {
      const html = await readFile(path.join(ROOT, route), 'utf8');
      const match = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
      assert.ok(match, `${route} has no structured data`);
      const data = JSON.parse(match[1]);
      const types = data['@graph'].map((node: { '@type': string }) => node['@type']);
      assert.ok(types.includes('WebApplication'));
      assert.ok(types.includes('FAQPage'));
      assert.ok(data['@graph'].length >= 3);
    }
  });

  it('lists every route in the sitemap with alternates', async () => {
    const sitemap = await readFile(path.join(ROOT, 'sitemap.xml'), 'utf8');
    for (const url of [HOME, `${HOME}zh/`, `${HOME}ru/`]) {
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), `sitemap missing ${url}`);
    }
    assert.equal((sitemap.match(/<url>/g) ?? []).length, 3);
    assert.ok(sitemap.includes('xmlns:xhtml='));
    assert.ok(sitemap.includes('hreflang="zh-CN"'));
    assert.ok(sitemap.startsWith('<?xml'));
  });

  it('allows crawling and points at the sitemap', async () => {
    const robots = await readFile(path.join(ROOT, 'robots.txt'), 'utf8');
    assert.match(robots, /User-agent: \*/);
    assert.equal(/Disallow: \/\S/.test(robots), false);
    assert.ok(robots.includes(`${HOME}sitemap.xml`));
  });

  it('ships a web app manifest with maskable icons', async () => {
    const manifest = JSON.parse(await readFile(path.join(ROOT, 'site.webmanifest'), 'utf8'));
    // Relative manifest URLs resolve against the manifest, so one file works at
    // the domain root and under a project subdirectory.
    assert.equal(manifest.start_url, './');
    assert.equal(manifest.scope, './');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.theme_color, '#3457c9');
    assert.ok(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable'));
    assert.ok(manifest.icons.some((icon: { src: string }) => icon.src === 'assets/icon.svg'));
    assert.equal(manifest.icons.every((icon: { src: string }) => !icon.src.startsWith('/')), true);
    assert.equal(manifest.lang, 'en');
  });

  it('ships a .nojekyll marker so Pages serves every file verbatim', async () => {
    const marker = await stat(path.join(ROOT, '.nojekyll'));
    assert.equal(marker.isFile(), true);
  });

  it('has the referenced icons on disk', async () => {
    for (const file of ['assets/icon.svg', 'assets/social-preview.svg', 'favicon.svg']) {
      const content = await readFile(path.join(ROOT, file), 'utf8');
      assert.match(content, /<svg[^>]*viewBox="0 0 512 512"|<svg[^>]*viewBox="0 0 1200 630"|<svg[^>]*viewBox="0 0 40 40"/);
    }
  });
});

describe('static hosting boundaries', () => {
  const ALLOWED_HOSTS = new Set([
    'helpahelpa.github.io',
    'screw-claude.example',
    'twitter.com',
    'www.facebook.com',
    't.me',
    'service.weibo.com',
    'support.claude.com',
    'schema.org',
    'www.w3.org',
    // XML namespace declarations are identifiers, not loads.
    'www.sitemaps.org',
  ]);

  async function servedFiles(): Promise<string[]> {
    const files = (await walk(path.join(ROOT, 'dist'))).map(file => path.join('dist', file));
    for (const route of [...ROUTES, 'sitemap.xml', 'robots.txt', 'site.webmanifest', 'styles.css', 'taste-variants.css', 'focus-variant.css', 'focus-live.css', 'app.js', 'taste-variants.js', 'assets/icon.svg', 'assets/social-preview.svg', 'favicon.svg']) {
      files.push(route);
    }
    return files;
  }

  it('references no host outside the allowlist', async () => {
    const offenders: string[] = [];
    for (const file of await servedFiles()) {
      const content = await readFile(path.join(ROOT, file), 'utf8');
      for (const match of content.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
        const host = match[1].toLowerCase();
        if (!ALLOWED_HOSTS.has(host) && !host.endsWith('.example')) offenders.push(`${file}: ${host}`);
      }
    }
    assert.deepEqual(offenders, []);
  });

  it('loads every asset from the same origin', async () => {
    for (const route of ROUTES) {
      const html = await readFile(path.join(ROOT, route), 'utf8');
      // Canonical and og:url are metadata, not loads.
      const loads = [...html.matchAll(/<script[^>]*src="([^"]+)"|<link[^>]*rel="(?:stylesheet|icon|manifest|apple-touch-icon)"[^>]*href="([^"]+)"/g)];
      assert.ok(loads.length >= 5, `${route} should load its assets explicitly`);
      for (const match of loads) {
        const value = match[1] ?? match[2];
        assert.equal(/^(https?:)?\/\//.test(value), false, `${route} loads a remote asset: ${value}`);
        assert.equal(value.startsWith('data:'), false);
      }
    }
  });

  it('uses only local font files', async () => {
    for (const file of ['styles.css', 'taste-variants.css', 'focus-variant.css', 'focus-live.css']) {
      const css = await readFile(path.join(ROOT, file), 'utf8');
      for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
        assert.equal(/^url\(['"]?(https?:)?\/\//.test(match[0]), false, `${file} loads ${match[1]}`);
      }
    }
  });

  it('keeps the prototype server a static file server', async () => {
    const server = await readFile(path.join(ROOT, 'server.py'), 'utf8');
    assert.equal(/do_POST|do_PUT|do_DELETE|cgi|subprocess/.test(server), false);
  });
});

describe('style floor', () => {
  async function sourceFiles(): Promise<string[]> {
    const files = await walk(path.join(ROOT, 'src'));
    return [
      ...files.map(file => path.join('src', file)),
      'build.mjs',
      'app.js',
      'taste-variants.js',
      'server.py',
      'tests/fixtures.ts',
      'tools/browser-check.mjs',
      'package.json',
    ];
  }

  it('keeps sources tidy: LF endings, no tabs, no trailing whitespace, final newline', async () => {
    for (const file of await sourceFiles()) {
      const content = await readFile(path.join(ROOT, file), 'utf8');
      assert.equal(content.includes('\r'), false, `${file} has CRLF endings`);
      assert.equal(content.includes('\t'), false, `${file} contains a tab`);
      assert.equal(/[ \t]+\n/.test(content), false, `${file} has trailing whitespace`);
      assert.equal(content.endsWith('\n'), true, `${file} has no final newline`);
      if (file.endsWith('.ts') || file.endsWith('.mjs') || file.endsWith('.js')) {
        assert.equal(content.includes('\n\n\n'), false, `${file} has double blank lines`);
      }
    }
  });

  it('keeps indentation consistent with two spaces', async () => {
    for (const file of await sourceFiles()) {
      if (file.endsWith('.json')) continue;
      const content = await readFile(path.join(ROOT, file), 'utf8');
      for (const [index, line] of content.split('\n').entries()) {
        const indent = /^ +/.exec(line)?.[0]?.length ?? 0;
        const trimmed = line.trimStart();
        // Comment continuations, template literals and Python are aligned freely.
        if (file.endsWith('.py') || trimmed.startsWith('*') || line.includes('`') || trimmed === '') continue;
        assert.equal(indent % 4 === 0 || indent % 2 === 0, true, `${file}:${index + 1} has odd indentation`);
      }
    }
  });
});
