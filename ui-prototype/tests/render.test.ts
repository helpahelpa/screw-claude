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

async function viewModel(root: string, withResult = true): Promise<ViewModel> {
  const result = withResult ? await runScan({ source: fakeSource(CHINA_ENVIRONMENT) }) : null;
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

  it('includes the share destinations from the view model', async () => {
    const html = renderPage(await viewModel('/screw-claude/'));
    assert.match(html, /data-share-target="x"/);
    assert.match(html, /twitter\.com\/intent\/tweet/);
    assert.match(html, /data-copy-platform="red"/);
    assert.match(html, /data-copy-command="dns"/);
  });
});
