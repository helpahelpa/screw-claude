/* Scan controller: sequential checks, progress events, fresh reruns.
 *
 * A consumer subscribes for state, starts a run, and renders from the emitted
 * events. A failed individual check never stops the others; an unexpected
 * controller failure reports an error and always releases the running lock.
 */

import { DETECTORS } from '../core/detectors.ts';
import type { Detector, DetectorOutcome } from '../core/detectors.ts';
import { RULES } from '../core/rules.ts';
import type { RulesConfig } from '../core/rules.ts';
import { buildResult, toSignalResult } from '../core/scoring.ts';
import type {
  Pacing,
  ScanController,
  ScanEvent,
  ScanOptions,
  ScanResult,
  ScanState,
  SignalId,
  SignalResult,
} from '../core/types.ts';

const DEFAULT_PACING: Required<Pacing> = { perSignalDelayMs: 0, beforeFirstSignalMs: 0 };

export interface ControllerOptions extends ScanOptions {
  rules?: RulesConfig;
  detectors?: Detector[];
  /** Observation source; required unless a consumer only needs the state shape. */
  source?: ScanOptions['source'];
}

class AbortedError extends Error {
  constructor() {
    super('scan aborted');
    this.name = 'AbortedError';
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (!ms || ms <= 0) return signal?.aborted ? Promise.reject(new AbortedError()) : Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new AbortedError());
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function emptyProgress(order: SignalId[]): Record<SignalId, 'pending'> {
  const progress = {} as Record<SignalId, 'pending'>;
  for (const id of order) progress[id] = 'pending';
  return progress;
}

function initialState(rules: RulesConfig): ScanState {
  return {
    status: 'idle',
    progress: emptyProgress(rules.signalOrder),
    current: null,
    completedCount: 0,
    totalCount: rules.signalOrder.length,
    result: null,
    error: null,
  };
}

export function createScanController(options: ControllerOptions = {}): ScanController {
  const rules = options.rules ?? RULES;
  const detectors = options.detectors ?? DETECTORS;
  const pacing: Required<Pacing> = { ...DEFAULT_PACING, ...(options.pacing ?? {}) };
  const now = options.now ?? (() => new Date());

  let state = initialState(rules);
  let running = false;
  let disposed = false;
  let abort: AbortController | null = null;
  const listeners = new Set<(state: ScanState, event: ScanEvent) => void>();

  function emit(event: ScanEvent): void {
    if (typeof options.onEvent === 'function') {
      try {
        options.onEvent(event);
      } catch {
        /* A consumer's event handler must not break the scan. */
      }
    }
    for (const listener of [...listeners]) {
      try {
        listener(getState(), event);
      } catch {
        /* Same for subscribers. */
      }
    }
  }

  function getState(): ScanState {
    return { ...state, progress: { ...state.progress } };
  }

  function resolveDetector(id: SignalId): Detector {
    const detector = detectors.find(candidate => candidate.id === id);
    if (!detector) throw new Error(`No detector registered for signal: ${id}`);
    return detector;
  }

  function setProgress(id: SignalId, value: 'pending' | 'running' | 'complete'): void {
    state = { ...state, progress: { ...state.progress, [id]: value } };
  }

  async function start(): Promise<ScanResult | null> {
    if (disposed || running) return null;
    if (!options.source) throw new Error('createScanController requires an observation source');
    running = true;
    abort = new AbortController();
    const runSignal = abort.signal;
    const external = options.signal;
    const forwardAbort = () => abort?.abort();
    if (external) {
      if (external.aborted) abort.abort();
      else external.addEventListener('abort', forwardAbort, { once: true });
    }
    const collected: SignalResult[] = [];

    state = {
      ...initialState(rules),
      status: 'running',
      totalCount: rules.signalOrder.length,
    };
    emit({ type: 'scan:start', at: now().toISOString() });

    try {
      for (const [index, id] of rules.signalOrder.entries()) {
        // Resolved outside the per-check guard: a misconfigured registry is terminal.
        const detector = resolveDetector(id);
        if (runSignal.aborted) throw new AbortedError();
        if (index === 0) await delay(pacing.beforeFirstSignalMs, runSignal);

        setProgress(id, 'running');
        state = { ...state, current: id };
        emit({ type: 'signal:start', id, index, total: rules.signalOrder.length });

        // Optional pacing: presentation timing stays in controller configuration.
        await delay(pacing.perSignalDelayMs, runSignal);
        if (runSignal.aborted) throw new AbortedError();

        let outcome: DetectorOutcome;
        try {
          outcome = await detector.run(options.source, rules);
        } catch {
          // A failed check contributes zero and never stops the remaining checks.
          outcome = {
            status: 'error',
            observed: null,
            strength: 0,
            region: null,
          };
        }

        const reading = toSignalResult({ id, ...outcome }, rules);
        collected.push(reading);
        setProgress(id, 'complete');
        state = {
          ...state,
          current: null,
          completedCount: collected.length,
        };
        emit({
          type: 'signal:complete',
          id,
          index,
          total: rules.signalOrder.length,
          signal: reading,
          runningTotal: collected.reduce((sum, entry) => sum + entry.contribution, 0),
        });
      }

      const result = buildResult(collected, rules, now());
      state = { ...state, status: 'complete', result, current: null, error: null };
      emit({ type: 'scan:complete', result });
      return result;
    } catch (error) {
      if (error instanceof AbortedError) {
        state = { ...initialState(rules), status: 'idle' };
        emit({ type: 'scan:abort' });
        return null;
      }
      const message = error instanceof Error ? error.message : String(error);
      state = { ...state, status: 'error', current: null, result: null, error: { message } };
      emit({ type: 'scan:error', message });
      return null;
    } finally {
      running = false;
      abort = null;
      external?.removeEventListener('abort', forwardAbort);
    }
  }

  return {
    start,
    getState,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      abort?.abort();
      listeners.clear();
    },
    get rulesVersion() {
      return rules.version;
    },
  };
}

/** One-shot helper: run a full scan and resolve with its result. */
export async function runScan(options: ControllerOptions): Promise<ScanResult | null> {
  const controller = createScanController(options);
  try {
    return await controller.start();
  } finally {
    controller.dispose();
  }
}
