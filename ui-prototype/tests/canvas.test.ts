/* Canvas card renderer: page typography, CJK coverage and export failures.
 *
 * Canvas text does not inherit CSS, so these tests pin the font stack the card
 * asks for: a stack without the bundled CJK subset is what turns Chinese card
 * text into boxes on machines without system CJK fonts.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { createCanvasRenderer } from '../src/browser/canvas-image.ts';
import { ResultImageError, buildImageContent } from '../src/sharing/image.ts';
import { RULES } from '../src/core/rules.ts';

const PAGE_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Taste CJK', sans-serif";

interface Drawn {
  font: string;
  text: string;
}

function fakeDocument(options: { declaredSans?: string; canvas?: boolean; fonts?: boolean } = {}) {
  const drawn: Drawn[] = [];
  const blobs: string[] = [];
  const context = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    fillRect() {},
    beginPath() {},
    roundRect() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    measureText(text: string) {
      return { width: text.length * 12 };
    },
    fillText(text: string) {
      drawn.push({ font: context.font, text });
    },
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => (options.canvas === false ? null : context),
    toBlob(callback: (blob: unknown) => void) {
      blobs.push('image/png');
      callback({ size: 2048, type: 'image/png' });
    },
  };
  const doc = {
    documentElement: {},
    createElement: () => canvas,
    fonts:
      options.fonts === false
        ? undefined
        : {
            load: async () => [],
            ready: Promise.resolve(),
          },
  };
  return { doc: doc as unknown as Document, drawn, blobs, canvas };
}

const globals = globalThis as unknown as Record<string, unknown>;
const originalGetComputedStyle = globals.getComputedStyle;

afterEach(() => {
  if (originalGetComputedStyle === undefined) delete globals.getComputedStyle;
  else globals.getComputedStyle = originalGetComputedStyle;
});

function stubComputedStyle(declaredSans: string | null) {
  globals.getComputedStyle = () => ({
    getPropertyValue: (name: string) => (name === '--sans' ? (declaredSans ?? '') : ''),
  });
}

function contentFor(locale: 'en' | 'zh') {
  const result = {
    rulesVersion: RULES.version,
    completedAt: '2026-02-03T04:05:06.000Z',
    total: 76,
    band: 'high' as const,
    partial: false,
    signals: [],
    hits: ['timezone', 'language'] as const,
    matchedRegions: [],
  };
  return buildImageContent(
    { ...result, hits: [...result.hits] },
    locale,
    'https://screw-claude.example/',
  );
}

describe('canvas result card', () => {
  it('uses the page font stack, including the bundled CJK subset', async () => {
    stubComputedStyle(PAGE_STACK);
    const { doc, drawn } = fakeDocument();
    const blob = await createCanvasRenderer({ document: doc }).render(contentFor('en'));
    assert.equal((blob as unknown as { size: number }).size, 2048);
    assert.ok(drawn.length >= 6);
    for (const entry of drawn) {
      assert.ok(entry.font.includes('CJK'), `canvas font lost the CJK subset: ${entry.font}`);
      assert.ok(entry.font.includes('Taste CJK'), `canvas font should prefer the bundled subset: ${entry.font}`);
    }
    assert.equal(drawn[0].font.includes("'Taste CJK'"), true);
  });

  it('keeps the bundled subset when the page declares none', async () => {
    stubComputedStyle(null);
    const { doc, drawn } = fakeDocument();
    await createCanvasRenderer({ document: doc }).render(contentFor('en'));
    assert.equal(drawn.every(entry => entry.font.includes('CJK')), true);
  });

  it('inserts the bundled subset before a trailing generic family', async () => {
    stubComputedStyle("-apple-system, 'Segoe UI', sans-serif");
    const { doc, drawn } = fakeDocument();
    await createCanvasRenderer({ document: doc }).render(contentFor('en'));
    const stack = drawn[0].font;
    assert.ok(stack.indexOf('Taste CJK') < stack.indexOf('sans-serif'), stack);
    assert.ok(stack.indexOf('Segoe UI') < stack.indexOf('Taste CJK'), stack);
  });

  it('honours an explicit font override', async () => {
    stubComputedStyle(PAGE_STACK);
    const { doc, drawn } = fakeDocument();
    await createCanvasRenderer({ document: doc, font: 'Card Sans, serif' }).render(contentFor('en'));
    assert.equal(drawn.every(entry => entry.font.endsWith('Card Sans, serif')), true);
  });

  it('draws the localized copy it was given', async () => {
    stubComputedStyle(PAGE_STACK);
    const { doc, drawn } = fakeDocument();
    const content = contentFor('zh');
    await createCanvasRenderer({ document: doc }).render(content);
    const text = drawn.map(entry => entry.text).join(' ');
    assert.ok(text.includes(content.band));
    assert.ok(text.includes(content.score));
    assert.ok(text.includes(content.url));
    assert.ok(text.includes(content.matchedLabel));
    assert.ok(text.includes(content.matchedNames[0]));
  });

  it('reports a missing canvas as a recoverable error', async () => {
    stubComputedStyle(PAGE_STACK);
    const { doc } = fakeDocument({ canvas: false });
    const renderer = createCanvasRenderer({ document: doc });
    await assert.rejects(
      async () => {
        await renderer.render(contentFor('en'));
      },
      (error: unknown) => {
        assert.ok(error instanceof ResultImageError);
        assert.equal(error.recoverable, true);
        assert.match(error.message, /Canvas is unavailable/);
        return true;
      },
    );
  });

  it('still exports when webfont loading is unsupported', async () => {
    stubComputedStyle(PAGE_STACK);
    const { doc, drawn } = fakeDocument({ fonts: false });
    await createCanvasRenderer({ document: doc }).render(contentFor('en'));
    assert.ok(drawn.length >= 6);
  });

  it('reports a document without a canvas element', async () => {
    stubComputedStyle(PAGE_STACK);
    const doc = { createElement: () => ({ getContext: () => null }) } as unknown as Document;
    const renderer = createCanvasRenderer({ document: doc });
    await assert.rejects(async () => {
      await renderer.render(contentFor('en'));
    }, ResultImageError);
  });
});
