/* Rendered markup: mount-relative URLs, so the app works at the domain root and
 * under a GitHub Pages project subdirectory. The smoke check exercises this in a
 * browser; these assertions keep it cheap to catch a regression. */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LOCALES } from '../src/content/locales.ts';
import { SITE, shareUrl } from '../src/content/site.ts';
import { RULES } from '../src/core/rules.ts';
import { buildSocialLink } from '../src/sharing/links.ts';
import { buildSummary } from '../src/sharing/text.ts';
import { runScan } from '../src/scan/controller.ts';
import { renderPage, spriteUrlFor } from '../src/ui/render.ts';
import type { ViewModel } from '../src/ui/render.ts';
import { CHINA_ENVIRONMENT, fakeSource } from './fixtures.ts';

function idleState() {
  return {
    status: 'idle' as const,
    progress: Object.fromEntries(RULES.signalOrder.map(id => [id, 'pending' as const])) as Record<
      string,
      'pending'
    >,
    current: null,
    completedCount: 0,
    totalCount: RULES.signalOrder.length,
    result: null,
    error: null,
  } as unknown as ViewModel['state'];
}

const BUSY_ENVIRONMENT = {
  ...CHINA_ENVIRONMENT,
  languages: ['zh-CN', 'zh', 'en', 'de', 'ja', 'ko', 'fr', 'es', 'it', 'pt', 'ru', 'nl'],
  voices: [
    ...Array.from({ length: 30 }, () => ({ lang: 'en-US', local: true })),
    { lang: 'zh-CN', local: true },
    { lang: 'ja-JP', local: true },
    { lang: 'de-DE', local: true },
    { lang: 'ru-RU', local: true },
  ],
  matchedFonts: [
    'Microsoft YaHei',
    'SimSun',
    'PingFang SC',
    'Noto Sans CJK SC',
    'Source Han Sans SC',
    'Alibaba PuHuiTi',
  ],
};

async function viewModel(root: string, withResult = true, environment = CHINA_ENVIRONMENT): Promise<ViewModel> {
  const result = withResult ? await runScan({ source: fakeSource(environment) }) : null;
  const summary = result
    ? buildSummary({ result, locale: 'en', url: shareUrl('en', { origin: 'https://example.test', protocol: 'https:', pathname: `${root}zh/` }) })
    : null;
  return {
    locale: 'en',
    messages: LOCALES.en,
    state: {
      ...idleState(),
      status: result ? 'complete' : 'idle',
      progress: Object.fromEntries(RULES.signalOrder.map(id => [id, result ? 'complete' : 'pending'])),
      completedCount: result ? 9 : 0,
      result,
    },
    root,
    query: '',
    hash: '',
    preview: null,
    summary,
    imageUrl: null,
    links: summary
      ? { x: buildSocialLink('x', summary), weibo: buildSocialLink('weibo', summary) }
      : {},
  } as unknown as ViewModel;
}

describe('mount-relative rendering', () => {
  it('keeps every link inside a project subdirectory', async () => {
    const html = renderPage(await viewModel('/screw-claude/'));
    assert.match(html, /<a class="brand" href="\/screw-claude\/"/);
    assert.match(html, /href="\/screw-claude\/zh\/"/);
    assert.match(html, /href="\/screw-claude\/ru\/"/);
  });

  it('renders the same structure at the domain root', async () => {
    const html = renderPage(await viewModel('/'));
    assert.match(html, /<a class="brand" href="\/"/);
    assert.match(html, /href="\/zh\/"/);
    assert.match(html, /href="\/ru\/"/);
    assert.equal(html.includes('/screw-claude/'), false);
  });

  it('references the sprite relative to the origin, never cross-origin', async () => {
    const mounted = renderPage(await viewModel('/screw-claude/'));
    assert.match(mounted, /<use href="\/screw-claude\/taste-assets\/tabler\.svg#/);
    assert.equal(mounted.includes(SITE.origin), false, 'rendered markup must not hardcode the deployment origin');

    const root = renderPage(await viewModel('/'));
    assert.match(root, /<use href="\/taste-assets\/tabler\.svg#/);
  });

  it('resolves sprite URLs from either an absolute or a relative root', () => {
    assert.equal(spriteUrlFor('/'), '/taste-assets/tabler.svg');
    assert.equal(spriteUrlFor('/screw-claude/'), '/screw-claude/taste-assets/tabler.svg');
    assert.equal(spriteUrlFor('/screw-claude'), '/screw-claude/taste-assets/tabler.svg');
    assert.equal(
      spriteUrlFor('https://helpahelpa.github.io/screw-claude/'),
      '/screw-claude/taste-assets/tabler.svg',
    );
  });

  it('preserves query and hash on language links', async () => {
    const vm = await viewModel('/screw-claude/');
    vm.query = '?review=1&state=high';
    vm.hash = '#faq';
    const html = renderPage(vm);
    assert.match(html, /href="\/screw-claude\/zh\/\?review=1&amp;state=high#faq"|href="\/screw-claude\/zh\/\?review=1&state=high#faq"/);
  });

  it('renders nine observations for an idle state and a result state', async () => {
    const rows = /class="focus-signal[ "]/g;
    const idle = renderPage(await viewModel('/', false));
    assert.equal((idle.match(rows) ?? []).length, 9);
    // Matched rows carry an extra class, so an exact `focus-signal"` pattern
    // would undercount them.
    const result = renderPage(await viewModel('/'));
    assert.equal((result.match(rows) ?? []).length, 9);
    assert.match(result, /focus-result-score/);
  });

  it('breaks the score down once, without a duplicate findings list', async () => {
    const vm = await viewModel('/');
    const html = renderPage(vm);
    const result = vm.state.result;
    assert.ok(result);
    // The matched rows live inside the single breakdown, not in a second table.
    assert.equal(html.includes('id="findings"'), false);
    assert.equal((html.match(/focus-findings-list/g) ?? []).length, 0);
    const matchedRows = (html.match(/class="focus-signal is-matched"/g) ?? []).length;
    assert.equal(matchedRows, result.hits.length);
    assert.equal((html.match(/focus-tag is-matched/g) ?? []).length, result.hits.length);
    // The headline count replaces the removed section's summary line.
    assert.match(html, /focus-match-summary/);
    assert.ok(
      html.includes(`>${result.hits.length} of ${result.signals.length} checks matched<`),
      'the score panel should count the matched checks',
    );
    // Every contribution still appears exactly once, in detector order.
    for (const signal of result.signals) {
      const points = (html.match(new RegExp(`<strong>\\+${signal.contribution}</strong>`, 'g')) ?? []).length;
      assert.ok(points >= 1, `missing contribution for ${signal.id}`);
    }
  });

  it('sums the single breakdown to the score', async () => {
    const vm = await viewModel('/');
    const html = renderPage(vm);
    assert.ok(vm.state.result);
    const contributions = [...html.matchAll(/focus-signal-points"><strong>\+(\d+)<\/strong>/g)].map(match =>
      Number(match[1]),
    );
    assert.equal(contributions.length, 9);
    assert.equal(
      contributions.reduce((total, value) => total + value, 0),
      vm.state.result.total,
    );
  });

  it('collapses a long voice list behind a closed spoiler', async () => {
    const vm = await viewModel('/', true, BUSY_ENVIRONMENT);
    const html = renderPage(vm);
    const row = /data-signal="speechVoices"[\s\S]*?<\/div>/.exec(html)?.[0] ?? '';
    const value = /focus-signal-value[^>]*>([\s\S]*?)<\/dd>/.exec(row)?.[1] ?? '';
    // Only the tag that scored stays visible; the spoiler holds the rest.
    const inline = value.split('<details')[0];
    assert.match(inline, /<code>zh-cn<\/code>/);
    assert.equal(inline.includes('en-us'), false);
    const spoilerMatch = /<details class="focus-spoiler"><summary>([^<]+)<\/summary><p class="focus-spoiler-list">([^<]+)<\/p><\/details>/.exec(value);
    assert.ok(spoilerMatch, 'the remaining voice languages should be collapsed');
    const [, label, hidden] = spoilerMatch;
    const hiddenTags = hidden.split(', ');
    assert.equal(label, `and ${hiddenTags.length} others`);
    assert.equal(hiddenTags.length, 4);
    assert.deepEqual(hiddenTags, ['en-us', 'ja-jp', 'de-de', 'ru-ru']);
    // Closed by default: the detail is available, not in the way.
    assert.equal(/<details class="focus-spoiler" open/.test(html), false);
  });

  it('collapses the font names that the summary already truncated', async () => {
    const vm = await viewModel('/', true, BUSY_ENVIRONMENT);
    const html = renderPage(vm);
    const row = /data-signal="fonts"[\s\S]*?<\/div>/.exec(html)?.[0] ?? '';
    // One profile matched, so there is no extra profile line to show.
    assert.equal(row.includes('focus-signal-detail'), false);
    const spoilerMatch = /<summary>([^<]+)<\/summary><p class="focus-spoiler-list">([^<]+)<\/p>/.exec(row);
    assert.ok(spoilerMatch, 'font names beyond the summary should be collapsed');
    assert.equal(spoilerMatch[1], 'and 2 others');
    assert.deepEqual(spoilerMatch[2].split(', '), ['Source Han Sans SC', 'Noto Sans CJK SC']);
  });

  it('collapses a long list even when nothing scored', async () => {
    const vm = await viewModel('/', true, {
      ...BUSY_ENVIRONMENT,
      voices: Array.from({ length: 20 }, (_, index) => ({ lang: `xx-${index}`, local: true })),
    });
    const html = renderPage(vm);
    const row = /data-signal="speechVoices"[\s\S]*?<\/div>/.exec(html)?.[0] ?? '';
    assert.match(row, /Nothing matched/);
    assert.match(row, /and 20 others/);
  });

  it('keeps short lists fully visible', async () => {
    const vm = await viewModel('/');
    const html = renderPage(vm);
    assert.equal(html.includes('focus-spoiler'), false);
  });

  it('collapses a long language list after eight tags', async () => {
    const vm = await viewModel('/', true, BUSY_ENVIRONMENT);
    const html = renderPage(vm);
    const row = /data-signal="language"[\s\S]*?<\/div>/.exec(html)?.[0] ?? '';
    const inline = /<code>([^<]+)<\/code>/.exec(row)?.[1] ?? '';
    assert.equal(inline.split(', ').length, 8);
    assert.match(row, /and 4 others/);
  });

  it('includes the share destinations from the view model', async () => {
    const html = renderPage(await viewModel('/screw-claude/'));
    assert.match(html, /data-share-target="x"/);
    assert.match(html, /twitter\.com\/intent\/tweet/);
    assert.match(html, /data-copy-platform="red"/);
    assert.match(html, /data-copy-command="dns"/);
  });
});
