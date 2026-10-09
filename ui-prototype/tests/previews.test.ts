/* Review previews: every state must come from the real pipeline, so the review
 * screens cannot drift from shipped arithmetic. */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RULES } from '../src/core/rules.ts';
import { buildResult, signalById } from '../src/core/scoring.ts';
import { PREVIEW_STATE_IDS, buildPreviewState, createPreviewSource, isPreviewStateId, runPreview } from '../src/ui/previews.ts';

describe('preview registry', () => {
  it('lists the states in review order', () => {
    assert.deepEqual(PREVIEW_STATE_IDS, ['idle', 'running', 'low', 'medium', 'high', 'partial', 'error']);
  });

  it('validates state names from the URL', () => {
    assert.equal(isPreviewStateId('high'), true);
    assert.equal(isPreviewStateId('HIGH'), false);
    assert.equal(isPreviewStateId('nope'), false);
    assert.equal(isPreviewStateId(''), false);
    assert.equal(isPreviewStateId(null), false);
  });

  it('builds an idle state with no result and nine pending checks', async () => {
    const state = await buildPreviewState('idle');
    assert.equal(state.status, 'idle');
    assert.equal(state.result, null);
    assert.equal(state.completedCount, 0);
    assert.equal(Object.keys(state.progress).length, 9);
  });

  it('builds a running state as a mid-scan snapshot', async () => {
    const state = await buildPreviewState('running');
    assert.equal(state.status, 'running');
    assert.equal(state.result, null);
    assert.ok(state.completedCount > 0 && state.completedCount < 9, `completed ${state.completedCount}`);
    const values = Object.values(state.progress);
    assert.equal(values.filter(value => value === 'complete').length, state.completedCount);
    assert.ok(values.includes('running') || values.includes('pending'));
  });

  it('builds an error state without inventing a result', async () => {
    const state = await buildPreviewState('error');
    assert.equal(state.status, 'error');
    assert.equal(state.result, null);
    assert.ok(state.error?.message);
  });
});

describe('preview arithmetic', () => {
  const expected: [string, number, string][] = [
    ['low', 3, 'low'],
    ['medium', 36, 'medium'],
    ['high', 76, 'high'],
  ];

  for (const [id, total, band] of expected) {
    it(`${id} scores ${total} in the ${band} band`, async () => {
      const state = await buildPreviewState(id as 'low' | 'medium' | 'high');
      assert.equal(state.status, 'complete');
      assert.equal(state.result?.total, total);
      assert.equal(state.result?.band, band);
      assert.equal(state.result?.partial, false);
      assert.equal(state.result?.signals.length, 9);
      assert.equal(state.result?.rulesVersion, RULES.version);
    });
  }

  it('marks the partial state as partial with a missing font check', async () => {
    const state = await buildPreviewState('partial');
    assert.equal(state.result?.total, 71);
    assert.equal(state.result?.band, 'high');
    assert.equal(state.result?.partial, true);
    const fonts = state.result ? signalById(state.result, 'fonts') : null;
    assert.equal(fonts?.status, 'unavailable');
    assert.equal(fonts?.contribution, 0);
    assert.equal(state.result?.signals.some(signal => signal.status === 'unavailable'), true);
  });

  it('keeps the preview states distinct', async () => {
    const totals = new Set<number>();
    for (const id of ['low', 'medium', 'high', 'partial'] as const) {
      const state = await buildPreviewState(id);
      assert.ok(state.result);
      totals.add(state.result.total);
    }
    assert.equal(totals.size, 4);
  });

  it('scans the preview environment through the shipped controller', async () => {
    const result = await runPreview('medium');
    assert.ok(result);
    assert.equal(result.total, 36);
    const rebuilt = buildResult(result.signals, RULES, new Date(result.completedAt));
    assert.equal(rebuilt.total, result.total);
    assert.deepEqual(rebuilt.hits, result.hits);
  });

  it('feeds the same source shape the browser adapter produces', () => {
    const source = createPreviewSource('high');
    assert.equal(typeof source.timeZone(), 'string');
    assert.equal(Array.isArray(source.languages()), true);
    assert.equal(typeof source.userAgent(), 'string');
    assert.equal(typeof source.voices(), 'object');
    assert.equal(typeof source.fonts.measure('sample', '', 'sans-serif'), 'number');
  });

  it('uses only local voices in preview environments', async () => {
    const state = await buildPreviewState('medium');
    const voices = state.result ? signalById(state.result, 'speechVoices') : null;
    assert.equal(voices?.status, 'available');
  });
});
