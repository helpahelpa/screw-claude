#!/usr/bin/env node
/**
 * Zero-dependency build.
 *
 * 1. Type-strips `src/**\/*.ts` into `dist/**\/*.js` with Node's own
 *    `stripTypeScriptTypes`, rewriting `.ts` import specifiers to `.js`.
 * 2. Generates metadata artifacts from the same content definitions the pages
 *    use: per-route meta blocks (title, description, canonical, alternates,
 *    Open Graph, structured data), `sitemap.xml`, `robots.txt` and
 *    `site.webmanifest`.
 *
 * The output is deterministic, so the committed `dist/` can be compared.
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(root, 'src');
const DIST = path.join(root, 'dist');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.endsWith('.ts')) files.push(full);
  }
  return files.sort();
}

/** Compile the TypeScript sources to plain ESM. */
export async function buildModules() {
  const files = await walk(SRC);
  await rm(DIST, { recursive: true, force: true });
  const written = [];
  for (const file of files) {
    const relative = path.relative(SRC, file);
    const target = path.join(DIST, relative.replace(/\.ts$/, '.js'));
    const source = await readFile(file, 'utf8');
    const stripped = stripTypeScriptTypes(source, { mode: 'strip' });
    const compiled = stripped.replace(/(from\s*['"])((?:\.\.?\/)[^'"]+)\.ts(['"])/g, '$1$2.js$3');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, compiled);
    written.push(path.relative(root, target));
  }
  return written;
}

async function contentModules() {
  const locales = await import(pathToFileURL(path.join(DIST, 'content/locales.js')).href);
  const site = await import(pathToFileURL(path.join(DIST, 'content/site.js')).href);
  return { locales, site };
}

const OG_LOCALES = { en: 'en_US', zh: 'zh_CN', ru: 'ru_RU' };

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function structuredData(locale, messages, url, home) {
  const graph = [
    {
      '@type': 'WebApplication',
      name: messages.title,
      url,
      inLanguage: locale,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any browser with Canvas and Intl support',
      description: messages.description,
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: messages.signalNames,
    },
    {
      '@type': 'FAQPage',
      inLanguage: locale,
      mainEntity: messages.faqs.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
    {
      '@type': 'WebSite',
      name: 'screw/claude',
      url: home,
      inLanguage: locale,
    },
  ];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
  return json.replace(/</g, '\\u003c');
}

function metaBlock(locale, { locales, site }) {
  const messages = locales.LOCALES[locale];
  const url = site.localeUrl(locale);
  const origin = site.SITE.origin.replace(/\/$/, '');
  const base = site.normalizeBase(site.SITE.basePath);
  const home = `${origin}${base}`;
  const preview = `${home}assets/social-preview.svg`;
  const alternates = Object.entries(locales.LOCALE_ROUTES)
    .map(
      ([id, route]) =>
        `    <link rel="alternate" hreflang="${locales.HTML_LANG[id]}" href="${home}${route.replace(/^\//, '')}">`,
    )
    .join('\n');
  return [
    `    <title>${escapeAttribute(messages.title)}</title>`,
    `    <meta name="description" content="${escapeAttribute(messages.description)}">`,
    `    <link rel="canonical" href="${url}">`,
    alternates,
    `    <link rel="alternate" hreflang="x-default" href="${home}">`,
    `    <meta name="robots" content="index, follow">`,
    `    <meta property="og:type" content="website">`,
    `    <meta property="og:site_name" content="screw/claude">`,
    `    <meta property="og:title" content="${escapeAttribute(messages.title)}">`,
    `    <meta property="og:description" content="${escapeAttribute(messages.description)}">`,
    `    <meta property="og:url" content="${url}">`,
    `    <meta property="og:locale" content="${OG_LOCALES[locale]}">`,
    `    <meta property="og:image" content="${preview}">`,
    `    <meta property="og:image:type" content="image/svg+xml">`,
    `    <meta property="og:image:width" content="1200">`,
    `    <meta property="og:image:height" content="630">`,
    `    <meta name="twitter:card" content="summary_large_image">`,
    `    <meta name="twitter:title" content="${escapeAttribute(messages.title)}">`,
    `    <meta name="twitter:description" content="${escapeAttribute(messages.description)}">`,
    `    <meta name="twitter:image" content="${preview}">`,
    `    <script type="application/ld+json">`,
    structuredData(locale, messages, url, home)
      .split('\n')
      .map(line => `    ${line}`)
      .join('\n'),
    `    </script>`,
  ].join('\n');
}

const ROUTE_FILES = { en: 'index.html', zh: 'zh/index.html', ru: 'ru/index.html' };

/** Inject generated meta blocks into the hand-written route shells. */
export async function buildRoutes({ locales, site }) {
  const written = [];
  for (const [locale, file] of Object.entries(ROUTE_FILES)) {
    const target = path.join(root, file);
    const html = await readFile(target, 'utf8');
    const marker = /(<!-- meta:start -->)[\s\S]*?(<!-- meta:end -->)/;
    if (!marker.test(html)) throw new Error(`${file} is missing the meta:start / meta:end markers`);
    const next = html.replace(marker, `$1\n${metaBlock(locale, { locales, site })}\n    $2`);
    await writeFile(target, next);
    written.push(file);
  }
  return written;
}

export async function buildSitemap({ locales, site }) {
  const home = `${site.SITE.origin.replace(/\/$/, '')}${site.normalizeBase(site.SITE.basePath)}`;
  const href = route => `${home}${route.replace(/^\//, '')}`;
  const alternates = Object.entries(locales.LOCALE_ROUTES)
    .map(
      ([id, route]) =>
        `    <xhtml:link rel="alternate" hreflang="${locales.HTML_LANG[id]}" href="${href(route)}"/>`,
    )
    .join('\n');
  const entries = Object.entries(locales.LOCALE_ROUTES)
    .map(
      ([locale, route]) =>
        `  <url>\n    <loc>${href(route)}</loc>\n${alternates}\n    <changefreq>monthly</changefreq>\n  </url>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries}\n</urlset>\n`;
  await writeFile(path.join(root, 'sitemap.xml'), xml);
  return 'sitemap.xml';
}

export async function buildRobots({ site }) {
  const home = `${site.SITE.origin.replace(/\/$/, '')}${site.normalizeBase(site.SITE.basePath)}`;
  const text = `User-agent: *\nAllow: /\n\nSitemap: ${home}sitemap.xml\n`;
  await writeFile(path.join(root, 'robots.txt'), text);
  return 'robots.txt';
}

export async function buildManifest({ locales }) {
  const messages = locales.LOCALES.en;
  // Manifest URLs resolve against the manifest itself, so relative values keep
  // the app installable at any mount point without a rebuild.
  const manifest = {
    name: 'screw/claude — browser environment diagnostic',
    short_name: 'screw/claude',
    description: messages.description,
    start_url: './',
    scope: './',
    display: 'standalone',
    lang: 'en',
    dir: 'ltr',
    background_color: '#ffffff',
    theme_color: '#3457c9',
    categories: ['utilities', 'privacy'],
    icons: [
      { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: 'assets/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
  await writeFile(path.join(root, 'site.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
  return 'site.webmanifest';
}

async function main() {
  const modules = await buildModules();
  const { locales, site } = await contentModules();
  const routes = await buildRoutes({ locales, site });
  const sitemap = await buildSitemap({ locales, site });
  const robots = await buildRobots({ site });
  const manifest = await buildManifest({ locales });
  console.log(`Compiled ${modules.length} modules to dist/`);
  for (const file of [...routes, sitemap, robots, manifest]) console.log(`Wrote ${file}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  await main();
}
