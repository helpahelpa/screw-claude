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
    const idle = renderPage(await viewModel('/', false));
    assert.equal((idle.match(/class="focus-signal"/g) ?? []).length, 9);
    const result = renderPage(await viewModel('/'));
    assert.equal((result.match(/class="focus-signal"/g) ?? []).length, 9);
    assert.match(result, /focus-result-score/);
  });

  it('includes the share destinations from the view model', async () => {
    const html = renderPage(await viewModel('/screw-claude/'));
    assert.match(html, /data-share-target="x"/);
    assert.match(html, /twitter\.com\/intent\/tweet/);
    assert.match(html, /data-copy-platform="red"/);
    assert.match(html, /data-copy-command="dns"/);
  });
});
