/* Speech voices: local-only counting, language prefixes and unavailable cases. */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RULES } from '../src/core/rules.ts';
import { detectorById } from '../src/core/detectors.ts';
import { evaluateVoices, toSignalResult } from '../src/core/scoring.ts';
import { fakeSource } from './fixtures.ts';

const detector = detectorById('speechVoices');

describe('voice matching', () => {
  const cases: [string[], number, string | null][] = [
    [['zh-CN'], 1, 'cn'],
    [['zh-Hans-CN'], 1, 'cn'],
    [['ZH-TW'], 1, 'cn'],
    [['ru-RU'], 1, 'ru'],
    [['uk-UA'], 0.6, 'ru'],
    [['en-GB', 'de-DE'], 0, null],
    [[], 0, null],
  ];

  for (const [languages, expected, region] of cases) {
    it(`${JSON.stringify(languages)} scores ${expected} (${region ?? 'no profile'})`, () => {
      const match = evaluateVoices(languages, RULES);
      assert.equal(Number(match.strength.toFixed(4)), expected);
      assert.equal(match.region, region);
    });
  }

  it('breaks a full-strength tie by profile configuration order', () => {
    const match = evaluateVoices(['ru-RU', 'zh-CN'], RULES);
    assert.equal(match.strength, 1);
    assert.equal(match.region, 'cn');
    const russian = evaluateVoices(['ru-RU', 'en-US'], RULES);
    assert.equal(russian.strength, 1);
    assert.equal(russian.region, 'ru');
  });
});

describe('voice detector', () => {
  it('counts local voices and ignores network-only voices', async () => {
    const local = await detector.run(
      fakeSource({ voices: [{ lang: 'zh-CN', local: true }, { lang: 'en-US', local: false }] }),
      RULES,
    );
    assert.equal(local.strength, 1);
    assert.deepEqual(local.observed, ['zh-cn']);

    const networkOnly = await detector.run(fakeSource({ voices: [{ lang: 'zh-CN', local: false }] }), RULES);
    const signal = toSignalResult({ id: 'speechVoices', ...networkOnly }, RULES);
    assert.equal(signal.status, 'available');
    assert.equal(signal.strength, 0);
    assert.equal(signal.contribution, 0);
    assert.deepEqual(signal.observed, []);
  });

  it('reports an empty voice list as unavailable rather than as absence', async () => {
    const outcome = await detector.run(fakeSource({ voices: [] }), RULES);
    const signal = toSignalResult({ id: 'speechVoices', ...outcome }, RULES);
    assert.equal(signal.status, 'unavailable');
    assert.equal(signal.contribution, 0);
    assert.equal(signal.observed, null);
  });

  it('lets a throwing API reach the scan controller as a failed check', async () => {
    // Absence is an unavailable check; a thrown error is a failed check, and the
    // controller turns the rejection into an error status without stopping.
    await assert.rejects(() => detector.run(fakeSource({ voices: 'throw' }), RULES));
  });

  it('deduplicates the observed tags and keeps the raw voice count', async () => {
    const voices = [
      ...Array.from({ length: 40 }, () => ({ lang: 'en-US', local: true })),
      { lang: 'zh-CN', local: true },
      { lang: 'zh-CN', local: true },
      { lang: 'ja-JP', local: true },
    ];
    const outcome = await detector.run(fakeSource({ voices }), RULES);
    // A browser reports one entry per installed voice, so the same language
    // would otherwise flood the row.
    assert.deepEqual(outcome.observed, ['en-us', 'zh-cn', 'ja-jp']);
    assert.deepEqual(outcome.details?.voiceLanguages, ['en-us', 'zh-cn', 'ja-jp']);
    assert.deepEqual(outcome.details?.voiceMatches, ['zh-cn']);
    assert.equal(outcome.details?.voiceCount, 43);
  });

  it('marks only the winning rule as matched when two profiles qualify', async () => {
    const outcome = await detector.run(
      fakeSource({ voices: [{ lang: 'zh-CN', local: true }, { lang: 'ru-RU', local: true }] }),
      RULES,
    );
    // Both rules reach 1.0, the tie keeps profile order, so only zh scored.
    assert.equal(outcome.region, 'cn');
    assert.deepEqual(outcome.details?.voiceMatches, ['zh-cn']);
    assert.deepEqual(outcome.details?.voiceLanguages, ['zh-cn', 'ru-ru']);
  });

  it('reports a local voice in an unrelated language as an explainable zero', async () => {
    const outcome = await detector.run(fakeSource({ voices: [{ lang: 'fr-FR', local: true }] }), RULES);
    const signal = toSignalResult({ id: 'speechVoices', ...outcome }, RULES);
    assert.equal(signal.status, 'available');
    assert.equal(signal.contribution, 0);
    assert.deepEqual(signal.observed, ['fr-fr']);
    assert.equal(signal.details?.voiceLanguages?.join(','), 'fr-fr');
    assert.deepEqual(signal.details?.voiceMatches, []);
    assert.equal(signal.details?.voiceCount, 1);
  });
});
