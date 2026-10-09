/* Weighted scoring, band boundaries and end-to-end aggregation fixtures. */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DETECTORS, detectorById } from '../src/core/detectors.ts';
import type { Detector } from '../src/core/detectors.ts';
import { RULES } from '../src/core/rules.ts';
import {
  buildResult,
  classifyScore,
  classifySignal,
  contributionFor,
  signalById,
  toSignalResult,
} from '../src/core/scoring.ts';
import {
  CHINA_ENVIRONMENT,
  NEUTRAL_ENVIRONMENT,
  RUSSIA_ENVIRONMENT,
  fakeSource,
} from './fixtures.ts';

const COMPLETED_AT = new Date('2026-02-03T04:05:06.000Z');

async function runSignals(environment: Parameters<typeof fakeSource>[0], detectors: Detector[] = DETECTORS) {
  const source = fakeSource(environment);
  const signals = [];
  for (const detector of detectors) {
    try {
      const outcome = await detector.run(source, RULES);
      signals.push(toSignalResult({ id: detector.id, ...outcome }, RULES));
    } catch (error) {
      void error;
      signals.push(
        toSignalResult({ id: detector.id, status: 'error', observed: null, strength: 0, region: null }, RULES),
      );
    }
  }
  return signals;
}

describe('weighted contributions', () => {
  const cases: [number, keyof typeof RULES.weights, number][] = [
    [0, 'timezone', 0],
    [1, 'timezone', 26],
    [0.5, 'timezone', 13],
    [0.25, 'fonts', 1],
    [0.5, 'fonts', 3],
    [0.99, 'fonts', 5],
    [0.15, 'browserVendor', 1],
    [0.3, 'timezoneOffset', 2],
    [0.4, 'emoji', 2],
    [1, 'intlLocale', 9],
  ];

  for (const [strength, id, expected] of cases) {
    it(`${strength} x ${RULES.weights[id]} = ${expected}`, () => {
      assert.equal(contributionFor(strength, RULES.weights[id]), expected);
    });
  }

  it('rounds half up, so 0.25 of five points counts as one', () => {
    assert.equal(contributionFor(0.25, 5), 1);
    assert.equal(contributionFor(0.3, 5), 2);
  });
});

describe('band classification', () => {
  it('maps scores to the documented bands', () => {
    assert.equal(classifyScore(0, RULES), 'low');
    assert.equal(classifyScore(30, RULES), 'low');
    assert.equal(classifyScore(31, RULES), 'medium');
    assert.equal(classifyScore(60, RULES), 'medium');
    assert.equal(classifyScore(61, RULES), 'high');
    assert.equal(classifyScore(100, RULES), 'high');
    assert.equal(classifyScore(-10, RULES), 'low');
    assert.equal(classifyScore(140, RULES), 'high');
  });

  it('maps signal strength to severity', () => {
    assert.equal(classifySignal(0, RULES), 'low');
    assert.equal(classifySignal(0.24, RULES), 'low');
    assert.equal(classifySignal(0.25, RULES), 'medium');
    assert.equal(classifySignal(0.59, RULES), 'medium');
    assert.equal(classifySignal(0.6, RULES), 'high');
    assert.equal(classifySignal(1, RULES), 'high');
  });
});

describe('signal results', () => {
  it('keeps the weight for every signal in detector order', async () => {
    const result = buildResult(await runSignals(NEUTRAL_ENVIRONMENT), RULES, COMPLETED_AT);
    assert.deepEqual(
      DETECTORS.map(detector => detector.id),
      RULES.signalOrder,
    );
    for (const detector of DETECTORS) {
      const signal = signalById(result, detector.id);
      assert.equal(signal?.weight, RULES.weights[detector.id]);
      assert.ok((RULES.weights[detector.id] ?? 0) > 0);
    }
  });

  it('drops severity and points for unavailable and failed checks', () => {
    const unavailableSignal = toSignalResult(
      { id: 'fonts', status: 'unavailable', observed: null, strength: 0, region: null },
      RULES,
    );
    assert.equal(unavailableSignal.severity, null);
    assert.equal(unavailableSignal.contribution, 0);
    assert.equal(unavailableSignal.observed, null);

    const failed = toSignalResult(
      { id: 'fonts', status: 'error', observed: null, strength: 0, region: null },
      RULES,
    );
    assert.equal(failed.severity, null);
    assert.equal(failed.status, 'error');
    assert.equal(failed.contribution, 0);
    assert.equal(failed.region, null);
  });
});

describe('result aggregation', () => {
  it('scores a Chinese environment at 76 points in the high band', async () => {
    const signals = await runSignals(CHINA_ENVIRONMENT);
    const result = buildResult(signals, RULES, COMPLETED_AT);
    assert.equal(result.total, 76);
    assert.equal(result.band, 'high');
    assert.equal(result.partial, false);
    assert.deepEqual(result.matchedRegions, ['cn']);
    // The UTC offset (0.15) contributes a point without counting as a match.
    assert.deepEqual(result.hits, ['timezone', 'language', 'fonts', 'speechVoices', 'intlLocale', 'emoji']);
    assert.equal(signalById(result, 'timezoneOffset')?.contribution, 1);
  });

  it('scores a Russian environment at 83 points in the high band', async () => {
    const signals = await runSignals(RUSSIA_ENVIRONMENT);
    const result = buildResult(signals, RULES, COMPLETED_AT);
    assert.equal(result.total, 83);
    assert.equal(result.band, 'high');
    assert.deepEqual(result.matchedRegions, ['ru']);
    assert.deepEqual(result.hits, [
      'timezone',
      'language',
      'fonts',
      'speechVoices',
      'intlLocale',
      'timezoneOffset',
      'browserVendor',
      'emoji',
    ]);
  });

  it('scores a neutral environment at three points in the low band', async () => {
    const signals = await runSignals(NEUTRAL_ENVIRONMENT);
    const result = buildResult(signals, RULES, COMPLETED_AT);
    assert.equal(result.total, 3);
    assert.equal(result.band, 'low');
    assert.deepEqual(result.matchedRegions, []);
    assert.deepEqual(result.hits, ['emoji']);
  });

  it('never counts a check twice', async () => {
    const signals = await runSignals(CHINA_ENVIRONMENT);
    const result = buildResult(signals, RULES, COMPLETED_AT);
    const sum = result.signals.reduce((total, signal) => total + signal.contribution, 0);
    assert.equal(sum, result.total);
    assert.equal(new Set(result.signals.map(signal => signal.id)).size, 9);
  });

  it('marks a result partial when a check is missing, and adds no points for it', async () => {
    const signals = await runSignals(
      { ...CHINA_ENVIRONMENT, fontsUnavailable: true },
    );
    const result = buildResult(signals, RULES, COMPLETED_AT);
    assert.equal(result.partial, true);
    assert.equal(result.total, 71);
    const fonts = result.signals.find(signal => signal.id === 'fonts');
    assert.equal(fonts?.status, 'unavailable');
    assert.equal(fonts?.contribution, 0);
  });

  it('marks a result partial and zero for a check that fails', async () => {
    const signals = await runSignals({ ...CHINA_ENVIRONMENT, voices: 'throw' });
    const result = buildResult(signals, RULES, COMPLETED_AT);
    const voices = result.signals.find(signal => signal.id === 'speechVoices');
    assert.equal(voices?.status, 'error');
    assert.equal(voices?.contribution, 0);
    assert.equal(result.partial, true);
    assert.equal(result.total, 63);
  });

  it('keeps every signal even when nothing matches', async () => {
    const result = buildResult(await runSignals(NEUTRAL_ENVIRONMENT), RULES, COMPLETED_AT);
    assert.equal(result.signals.length, 9);
    assert.equal(result.signals.every(signal => typeof signal.contribution === 'number'), true);
  });

  it('only records matched regions for scoring hits', async () => {
    const signals = await runSignals({ ...NEUTRAL_ENVIRONMENT, timeZone: 'Europe/Minsk', offset: 0 });
    const result = buildResult(signals, RULES, COMPLETED_AT);
    const timezone = result.signals.find(signal => signal.id === 'timezone');
    assert.equal(timezone?.region, 'ru');
    assert.equal(timezone?.contribution, 0);
    assert.deepEqual(result.matchedRegions, []);
  });

  it('preserves detector order in the matched list', async () => {
    const result = buildResult(await runSignals(RUSSIA_ENVIRONMENT), RULES, COMPLETED_AT);
    const order = RULES.signalOrder.filter(id => result.hits.includes(id));
    assert.deepEqual(result.hits, order);
    assert.equal(result.hits.length, 8);
    assert.equal(signalById(result, result.hits[0])?.contribution, 26);
    const hitPoints = result.hits.reduce((sum, id) => sum + (signalById(result, id)?.contribution ?? 0), 0);
    // Every contributing signal is also a match in this environment.
    assert.equal(hitPoints, result.total);
  });

  it('attributes the China profile to a Simplified font set and the Russia profile to Cyrillic ones', async () => {
    const china = buildResult(await runSignals(CHINA_ENVIRONMENT), RULES, COMPLETED_AT);
    assert.equal(china.signals.find(signal => signal.id === 'fonts')?.region, 'cn');
    const russia = buildResult(await runSignals(RUSSIA_ENVIRONMENT), RULES, COMPLETED_AT);
    assert.equal(russia.signals.find(signal => signal.id === 'fonts')?.region, 'ru');
  });

  it('scores a mixed environment from its China markers only', async () => {
    const signals = await runSignals({
      ...NEUTRAL_ENVIRONMENT,
      timeZone: 'Asia/Shanghai',
      offset: -480,
    });
    const result = buildResult(signals, RULES, COMPLETED_AT);
    // Shanghai 26, UTC+08:00 1, Linux emoji 3.
    assert.equal(result.total, 30);
    assert.equal(result.band, 'low');
    assert.deepEqual(result.matchedRegions, ['cn']);
    assert.deepEqual(result.hits, ['timezone', 'emoji']);
    assert.equal(signalById(result, 'language')?.contribution, 0);
  });

  it('clamps an impossible total', () => {
    const signals = RULES.signalOrder.map(id => ({
      id,
      weight: RULES.weights[id],
      strength: 1,
      severity: 'high' as const,
      status: 'available' as const,
      region: null,
      label: null,
      observed: 'x',
      contribution: 100,
      message: null,
    }));
    const result = buildResult(signals, RULES, COMPLETED_AT);
    assert.equal(result.total, 100);
    assert.equal(result.band, 'high');
  });

  it('carries a rules version for reproducibility', async () => {
    const result = buildResult(await runSignals(NEUTRAL_ENVIRONMENT), RULES, COMPLETED_AT);
    assert.match(result.rulesVersion, /^\d{4}-\d{2}-\d{2}\.\d+$/);
  });

  it('records when the scan completed', async () => {
    const result = buildResult(await runSignals(NEUTRAL_ENVIRONMENT), RULES, COMPLETED_AT);
    assert.equal(result.completedAt, '2026-02-03T04:05:06.000Z');
  });
});

describe('detector contract', () => {
  it('exposes nine detectors covering every configured signal', () => {
    assert.equal(DETECTORS.length, 9);
    assert.deepEqual(DETECTORS.map(detector => detector.id), RULES.signalOrder);
    for (const detector of DETECTORS) {
      assert.equal(typeof detector.run, 'function');
      assert.equal(new Set(DETECTORS.map(entry => entry.id)).size, 9);
    }
  });

  it('returns a zero-strength available outcome for an unrelated timezone', async () => {
    const outcome = await detectorById('timezone').run(fakeSource({ timeZone: 'America/New_York' }), RULES);
    assert.equal(outcome.status, 'available');
    assert.equal(outcome.strength, 0);
    assert.equal(outcome.region, null);
    assert.equal(outcome.observed, 'America/New_York');
  });

  it('reports a missing API as unavailable', async () => {
    const outcome = await detectorById('intlLocale').run(fakeSource({ intlLocale: null }), RULES);
    assert.equal(outcome.status, 'unavailable');
  });

  it('normalizes language tags before matching', async () => {
    const outcome = await detectorById('language').run(
      fakeSource({ languages: ['ZH-Hans-CN', 'EN'] }),
      RULES,
    );
    assert.equal(outcome.strength, 1);
    assert.equal(outcome.region, 'cn');
    assert.deepEqual(outcome.observed, ['zh-hans-cn', 'en']);
  });

  it('handles non-Latin text without throwing', async () => {
    const outcome = await detectorById('language').run(
      fakeSource({ languages: ['中文（简体）', '日本語'] }),
      RULES,
    );
    assert.equal(outcome.status, 'available');
    assert.equal(outcome.strength, 0);
  });
});
