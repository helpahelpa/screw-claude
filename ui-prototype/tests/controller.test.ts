/* Scan controller: event order, progress, failures, reruns, aborting, disposal. */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DETECTORS, detectorById } from '../src/core/detectors.ts';
import type { Detector } from '../src/core/detectors.ts';
import { RULES } from '../src/core/rules.ts';
import { runScan } from '../src/scan/controller.ts';
import { createScanController } from '../src/scan/controller.ts';
import type { ScanEvent, SignalId } from '../src/core/types.ts';
import {
  CHINA_ENVIRONMENT,
  NEUTRAL_ENVIRONMENT,
  fakeSource,
} from './fixtures.ts';
import type { FakeEnvironment } from './fixtures.ts';

const SIGNALS: SignalId[] = [...RULES.signalOrder];
const FIXED_DATE = new Date('2026-02-03T04:05:06.000Z');

function tracker() {
  const events: ScanEvent[] = [];
  const transitions: string[] = [];
  return {
    events,
    transitions,
    onEvent: (event: ScanEvent) => events.push(event),
    subscribe: (state: { status: string; current: SignalId | null; completedCount: number }) => {
      transitions.push(`${state.status}:${state.current ?? '-'}:${state.completedCount}`);
    },
  };
}

describe('controller lifecycle', () => {
  it('starts idle with nine pending checks and no result', () => {
    const controller = createScanController({ source: fakeSource() });
    const state = controller.getState();
    assert.equal(state.status, 'idle');
    assert.equal(state.current, null);
    assert.equal(state.completedCount, 0);
    assert.equal(state.totalCount, 9);
    assert.equal(state.result, null);
    assert.equal(state.error, null);
    assert.deepEqual(Object.keys(state.progress), SIGNALS);
    assert.equal(Object.values(state.progress).every(value => value === 'pending'), true);
    assert.equal(controller.rulesVersion, RULES.version);
    controller.dispose();
  });

  it('runs every check in detector order and reports progress', async () => {
    const log = tracker();
    const controller = createScanController({
      source: fakeSource(CHINA_ENVIRONMENT),
      onEvent: log.onEvent,
      now: () => FIXED_DATE,
    });
    const result = await controller.start();
    const types = log.events.map(event => event.type);

    assert.equal(types[0], 'scan:start');
    assert.equal(types.at(-1), 'scan:complete');
    assert.equal(types.filter(type => type === 'signal:start').length, 9);
    assert.equal(types.filter(type => type === 'signal:complete').length, 9);

    const started = log.events.filter(event => event.type === 'signal:start');
    assert.deepEqual(
      started.map(event => (event.type === 'signal:start' ? event.id : null)),
      SIGNALS,
    );
    assert.deepEqual(
      started.map(event => (event.type === 'signal:start' ? event.index : -1)),
      SIGNALS.map((_, index) => index),
    );

    const complete = log.events.filter(event => event.type === 'signal:complete');
    let running = 0;
    for (const event of complete) {
      if (event.type !== 'signal:complete') continue;
      running += event.signal.contribution;
      assert.equal(event.runningTotal, running);
    }

    // Progress never goes backwards and ends complete.
    const progress = controller.getState().progress;
    assert.equal(Object.values(progress).every(value => value === 'complete'), true);
    assert.equal(controller.getState().status, 'complete');
    assert.equal(controller.getState().completedCount, 9);
    assert.equal(result?.total, 76);
    assert.equal(result?.completedAt, FIXED_DATE.toISOString());
    controller.dispose();
  });

  it('marks each check running before it completes', async () => {
    const seen: string[] = [];
    const controller = createScanController({
      source: fakeSource(NEUTRAL_ENVIRONMENT),
      onEvent: event => {
        if (event.type === 'signal:start') seen.push(`start:${controller.getState().progress[event.id]}`);
        if (event.type === 'signal:complete') seen.push(`complete:${controller.getState().progress[event.id]}`);
      },
    });
    await controller.start();
    assert.equal(seen.length, 18);
    assert.equal(seen[0], 'start:running');
    assert.equal(seen[1], 'complete:complete');
    controller.dispose();
  });

  it('ignores a second start while a run is in progress', async () => {
    const source = fakeSource(CHINA_ENVIRONMENT);
    const started: SignalId[] = [];
    const controller = createScanController({
      source,
      pacing: { perSignalDelayMs: 2 },
      onEvent: event => {
        if (event.type === 'signal:start') started.push(event.id);
      },
    });
    const first = controller.start();
    const second = controller.start();
    assert.equal(await second, null);
    const result = await first;
    assert.equal(result?.total, 76);
    assert.equal(started.length, 9);
    controller.dispose();
  });

  it('keeps a failed check isolated and still completes', async () => {
    const log = tracker();
    const controller = createScanController({
      source: fakeSource({ ...CHINA_ENVIRONMENT, voices: 'throw' }),
      onEvent: log.onEvent,
      now: () => FIXED_DATE,
    });
    const result = await controller.start();
    const voices = result?.signals.find(signal => signal.id === 'speechVoices');
    assert.equal(voices?.status, 'error');
    assert.equal(voices?.contribution, 0);
    assert.equal(result?.partial, true);
    assert.equal(result?.total, 63);
    assert.equal(log.events.filter(event => event.type === 'scan:error').length, 0);
    assert.equal(log.events.filter(event => event.type === 'scan:complete').length, 1);
    assert.equal(result?.signals.length, 9);
    controller.dispose();
  });

  it('adds no points for a check whose API is missing', async () => {
    const controller = createScanController({
      source: fakeSource({ ...CHINA_ENVIRONMENT, fontsUnavailable: true }),
      now: () => FIXED_DATE,
    });
    const result = await controller.start();
    assert.equal(result?.partial, true);
    assert.equal(result?.signals.find(signal => signal.id === 'fonts')?.status, 'unavailable');
    assert.equal(result?.total, 71);
    controller.dispose();
  });

  it('collects fresh observations on every run', async () => {
    let environment: FakeEnvironment = { ...NEUTRAL_ENVIRONMENT };
    const base = fakeSource();
    const controller = createScanController({
      source: {
        ...base,
        timeZone: () => environment.timeZone ?? '',
        languages: () => environment.languages ?? [],
      },
      now: () => FIXED_DATE,
    });
    const first = await controller.start();
    environment = { ...CHINA_ENVIRONMENT };
    const second = await controller.start();
    assert.equal(first?.total, 3);
    // Only the timezone, language and platform markers change in this fixture.
    assert.equal(second?.total, 49);
    assert.notEqual(first?.completedAt, undefined);
    assert.deepEqual(first?.hits, ['emoji']);
    assert.deepEqual(second?.hits, ['timezone', 'language', 'emoji']);
    controller.dispose();
  });

  it('does not reuse a previous result after a failed run', async () => {
    let fail = false;
    const detectors: Detector[] = [
      {
        id: 'timezone',
        run: async () => {
          if (fail) throw new Error('detector exploded');
          return { status: 'available', observed: 'Asia/Shanghai', strength: 1, region: 'cn' };
        },
      },
    ];
    const controller = createScanController({
      source: fakeSource(),
      detectors,
      rules: { ...RULES, signalOrder: ['timezone'] },
      now: () => FIXED_DATE,
    });
    const ok = await controller.start();
    assert.equal(ok?.total, 26);
    fail = true;
    const failed = await controller.start();
    assert.equal(failed?.total, 0);
    assert.equal(failed?.signals[0].status, 'error');
    controller.dispose();
  });

  it('reports a misconfigured registry as a terminal error and releases the lock', async () => {
    const log = tracker();
    const controller = createScanController({
      source: fakeSource(),
      detectors: [detectorById('timezone')],
      onEvent: log.onEvent,
      now: () => FIXED_DATE,
    });
    assert.equal(await controller.start(), null);
    assert.equal(controller.getState().status, 'error');
    assert.match(controller.getState().error?.message ?? '', /No detector registered/);
    assert.equal(log.events.some(event => event.type === 'scan:error'), true);

    // The lock is released, so a corrected registry can run.
    const working = createScanController({
      source: fakeSource(CHINA_ENVIRONMENT),
      onEvent: log.onEvent,
      now: () => FIXED_DATE,
    });
    assert.equal((await working.start())?.total, 76);
    controller.dispose();
    working.dispose();
  });

  it('aborts an in-flight run back to idle', async () => {
    const log = tracker();
    const controller = createScanController({
      source: fakeSource(CHINA_ENVIRONMENT),
      pacing: { perSignalDelayMs: 5 },
      onEvent: log.onEvent,
    });
    const pending = controller.start();
    await new Promise(resolve => setTimeout(resolve, 12));
    controller.dispose();
    assert.equal(await pending, null);
    assert.equal(log.events.some(event => event.type === 'scan:abort'), true);
    assert.equal(log.events.some(event => event.type === 'scan:complete'), false);
    assert.equal(controller.getState().status, 'idle');
    assert.equal(controller.getState().result, null);
  });

  it('honours an external abort signal', async () => {
    const abort = new AbortController();
    const controller = createScanController({
      source: fakeSource(CHINA_ENVIRONMENT),
      pacing: { perSignalDelayMs: 5 },
      signal: abort.signal,
    });
    const pending = controller.start();
    abort.abort();
    assert.equal(await pending, null);
    assert.equal(controller.getState().status, 'idle');
    controller.dispose();
  });

  it('refuses to start after disposal', async () => {
    const controller = createScanController({ source: fakeSource() });
    controller.dispose();
    assert.equal(await controller.start(), null);
    assert.equal(controller.getState().status, 'idle');
  });

  it('requires an observation source', async () => {
    const controller = createScanController({});
    await assert.rejects(() => controller.start(), /observation source/);
    controller.dispose();
  });

  it('paces checks when asked, without changing the result', async () => {
    const started = Date.now();
    const controller = createScanController({
      source: fakeSource(NEUTRAL_ENVIRONMENT),
      pacing: { beforeFirstSignalMs: 5, perSignalDelayMs: 5 },
      now: () => FIXED_DATE,
    });
    const result = await controller.start();
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 40, `expected pacing to take at least 40ms, took ${elapsed}ms`);
    assert.equal(result?.total, 3);
    controller.dispose();
  });

  it('survives a throwing event handler and subscriber', async () => {
    const controller = createScanController({
      source: fakeSource(NEUTRAL_ENVIRONMENT),
      onEvent: () => {
        throw new Error('handler boom');
      },
      now: () => FIXED_DATE,
    });
    controller.subscribe(() => {
      throw new Error('subscriber boom');
    });
    const result = await controller.start();
    assert.equal(result?.total, 3);
    controller.dispose();
  });

  it('stops notifying a subscriber after unsubscribe', async () => {
    const controller = createScanController({ source: fakeSource(NEUTRAL_ENVIRONMENT) });
    let calls = 0;
    const unsubscribe = controller.subscribe(() => {
      calls += 1;
    });
    await controller.start();
    const before = calls;
    unsubscribe();
    await controller.start();
    assert.equal(calls, before);
    controller.dispose();
  });

  it('detaches the external abort listener after a run', async () => {
    const abort = new AbortController();
    const controller = createScanController({
      source: fakeSource(NEUTRAL_ENVIRONMENT),
      signal: abort.signal,
      now: () => FIXED_DATE,
    });
    await controller.start();
    // Aborting after completion must not change the finished state.
    abort.abort();
    assert.equal(controller.getState().status, 'complete');
    assert.equal(controller.getState().result?.total, 3);
    controller.dispose();
  });
});

describe('one-shot scans', () => {
  it('returns the same result through the convenience entry point', async () => {
    const result = await runScan({
      source: fakeSource(CHINA_ENVIRONMENT),
      now: () => FIXED_DATE,
    });
    assert.ok(result);
    assert.equal(result.total, 76);
    assert.equal(result.signals.length, 9);
    assert.equal(result.completedAt, FIXED_DATE.toISOString());
  });

  it('uses the default detector registry', async () => {
    const result = await runScan({ source: fakeSource(NEUTRAL_ENVIRONMENT), now: () => FIXED_DATE });
    assert.ok(result);
    assert.deepEqual(result.signals.map(signal => signal.id), DETECTORS.map(detector => detector.id));
    assert.equal(result.total, 3);
  });
});
