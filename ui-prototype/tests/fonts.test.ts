/* Font rendering: candidate probing, per-profile scoring and unavailable cases. */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RULES } from '../src/core/rules.ts';
import { detectorById } from '../src/core/detectors.ts';
import { evaluateFonts, probeFonts, scoreProfileFonts, summarizeMatches, toSignalResult } from '../src/core/scoring.ts';
import { fakeFontProbe, fakeSource } from './fixtures.ts';

const cnFonts = RULES.profiles[0].fonts;
const ruFonts = RULES.profiles[1].fonts;

function probe(matched: string[], options: { delta?: number; unavailable?: boolean } = {}) {
  return fakeFontProbe({ matchedFonts: matched, fontDelta: options.delta, fontsUnavailable: options.unavailable });
}

describe('font scoring', () => {
  it('scores one Simplified match below saturation', () => {
    assert.equal(scoreProfileFonts(cnFonts, ['Microsoft YaHei']), 0.83);
  });

  it('adds 0.08 per additional Simplified match', () => {
    assert.equal(scoreProfileFonts(cnFonts, ['Microsoft YaHei', 'SimSun']), 0.91);
    assert.equal(scoreProfileFonts(cnFonts, ['Microsoft YaHei', 'SimSun', 'PingFang SC']), 0.99);
  });

  it('caps at 1', () => {
    const five = ['Microsoft YaHei', 'SimSun', 'PingFang SC', 'Noto Sans CJK SC', 'Source Han Sans SC'];
    assert.equal(scoreProfileFonts(cnFonts, five), 1);
    assert.equal(scoreProfileFonts(cnFonts, []), 0);
  });

  it('scores a Traditional-only set at 0.5 and ignores it in the Simplified count', () => {
    assert.equal(scoreProfileFonts(cnFonts, ['Microsoft JhengHei']), 0.5);
    assert.equal(scoreProfileFonts(cnFonts, ['Microsoft JhengHei', 'SimSun']), 0.83);
    assert.equal(scoreProfileFonts(cnFonts, ['PingFang TC', 'PMingLiU']), 0.5);
  });

  it('uses thresholds for the Russian candidate set', () => {
    assert.equal(scoreProfileFonts(ruFonts, ['PT Sans']), 0.5);
    assert.equal(scoreProfileFonts(ruFonts, ['PT Sans', 'PT Serif']), 0.7);
    assert.equal(scoreProfileFonts(ruFonts, ['PT Sans', 'PT Serif', 'GOST Type A']), 1);
    assert.equal(scoreProfileFonts(ruFonts, []), 0);
  });

  it('keeps every matched name and shortens only the summary', () => {
    const matched = ['Alibaba PuHuiTi', 'Baidu Number', 'DingTalk JinBuTi', 'Douyin Sans', 'FZLanTingHeiS-R-GB'];
    assert.equal(summarizeMatches(matched, 4), 'Alibaba PuHuiTi, Baidu Number, DingTalk JinBuTi, Douyin Sans…');
    assert.equal(summarizeMatches(matched.slice(0, 3), 4), matched.slice(0, 3).join(', '));
  });
});

describe('font probing', () => {
  it('accepts a difference greater than the 0.5px tolerance', () => {
    const outcomes = probeFonts(probe(['Microsoft YaHei'], { delta: 0.6 }), RULES);
    assert.deepEqual(outcomes[0].matched, ['Microsoft YaHei']);
  });

  it('rejects a difference exactly at the tolerance', () => {
    const outcomes = probeFonts(probe(['Microsoft YaHei'], { delta: 0.5 }), RULES);
    assert.deepEqual(outcomes[0].matched, []);
  });

  it('reports a profile as unavailable when no width can be measured', () => {
    const outcomes = probeFonts(probe([], { unavailable: true }), RULES);
    assert.equal(outcomes.every(outcome => outcome.available === false), true);
  });

  it('treats a single failed measurement as an unavailable profile', () => {
    const outcomes = probeFonts(fakeFontProbe({ fontNullFor: 'SimSun' }), RULES);
    assert.equal(outcomes[0].available, false);
  });

  it('probes the documented Traditional and Simplified sets', () => {
    const outcomes = probeFonts(probe(['PingFang TC', 'SimSun']), RULES);
    const cn = outcomes.find(outcome => outcome.profile === 'cn');
    assert.deepEqual(cn?.matched, ['SimSun', 'PingFang TC']);
  });
});

describe('font evaluation', () => {
  it('picks the strongest profile and keeps the complete per-profile lists', () => {
    const match = evaluateFonts(probeFonts(probe(['PT Sans', 'PT Serif', 'SimSun', 'PingFang TC']), RULES), RULES);
    const cn = match.details?.fontMatches?.find(entry => entry.profile === 'cn');
    const ru = match.details?.fontMatches?.find(entry => entry.profile === 'ru');
    assert.deepEqual(cn?.matched, ['SimSun', 'PingFang TC']);
    assert.deepEqual(ru?.matched, ['PT Sans', 'PT Serif']);
    // One Simplified plus one Traditional match (0.83) beats two Russian ones (0.7).
    assert.equal(match.strength, 0.83);
    assert.equal(match.region, 'cn');
  });

  it('keeps the Russian profile when it is the stronger side', () => {
    const match = evaluateFonts(
      probeFonts(probe(['PT Sans', 'PT Serif', 'GOST Type A', 'SimSun']), RULES),
      RULES,
    );
    assert.equal(match.strength, 1);
    assert.equal(match.region, 'ru');
  });

  it('scores nothing when no candidate matches', () => {
    const match = evaluateFonts(probeFonts(probe([]), RULES), RULES);
    assert.equal(match.strength, 0);
    assert.equal(match.region, null);
  });
});

describe('font detector', () => {
  const detector = detectorById('fonts');

  it('reports unavailable and zero points without Canvas', async () => {
    const outcome = await detector.run(fakeSource({ fontsUnavailable: true }), RULES);
    const signal = toSignalResult({ id: 'fonts', ...outcome }, RULES);
    assert.equal(signal.status, 'unavailable');
    assert.equal(signal.contribution, 0);
    assert.equal(signal.severity, null);
    assert.equal(signal.observed, null);
  });

  it('reports an explainable zero when nothing matched', async () => {
    const outcome = await detector.run(fakeSource({ matchedFonts: [] }), RULES);
    const signal = toSignalResult({ id: 'fonts', ...outcome }, RULES);
    assert.equal(signal.status, 'available');
    assert.equal(signal.strength, 0);
    assert.equal(signal.contribution, 0);
    assert.equal(signal.severity, 'low');
    assert.deepEqual(signal.observed, []);
  });

  it('rounds the contribution of three Simplified matches to five points', async () => {
    const outcome = await detector.run(
      fakeSource({ matchedFonts: ['Microsoft YaHei', 'SimSun', 'PingFang SC'] }),
      RULES,
    );
    const signal = toSignalResult({ id: 'fonts', ...outcome }, RULES);
    assert.equal(signal.strength, 0.99);
    assert.equal(signal.contribution, 5);
    assert.equal(signal.region, 'cn');
    assert.equal(signal.severity, 'high');
    assert.equal(signal.observed, 'Microsoft YaHei, SimSun, PingFang SC');
  });
});
