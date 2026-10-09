/* Privacy: scanning is local. Networking is opt-in and carries page events only. */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createAnalytics } from '../src/analytics.ts';
import type { PageEvent } from '../src/analytics.ts';
import { SITE } from '../src/content/site.ts';
import { runScan } from '../src/scan/controller.ts';
import { buildPreviewState } from '../src/ui/previews.ts';
import { CHINA_ENVIRONMENT, RUSSIA_ENVIRONMENT, fakeSource } from './fixtures.ts';

/** Records every API a scan could use to leave the device. */
function spyOnNetwork() {
  const calls: string[] = [];
  const globals = globalThis as unknown as Record<string, unknown>;
  const saved = {
    fetch: globals.fetch,
    XMLHttpRequest: globals.XMLHttpRequest,
    WebSocket: globals.WebSocket,
    sendBeacon: globals.sendBeacon,
  };
  globals.fetch = (...args: unknown[]) => {
    calls.push(`fetch:${String(args[0])}`);
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };
  globals.XMLHttpRequest = class {
    open(method: string, url: string) {
      calls.push(`xhr:${method}:${url}`);
    }
    send() {
      calls.push('xhr:send');
    }
  };
  globals.WebSocket = class {
    constructor(url: string) {
      calls.push(`socket:${url}`);
    }
  };
  globals.sendBeacon = (url: string) => {
    calls.push(`beacon:${url}`);
    return true;
  };
  return {
    calls,
    restore() {
      for (const [key, value] of Object.entries(saved)) globals[key] = value;
    },
  };
}

describe('local-only scanning', () => {
  it('makes no network call while scanning', async () => {
    const spy = spyOnNetwork();
    try {
      const result = await runScan({ source: fakeSource(CHINA_ENVIRONMENT) });
      assert.equal(result?.total, 76);
      const russian = await runScan({ source: fakeSource(RUSSIA_ENVIRONMENT) });
      assert.equal(russian?.total, 83);
      assert.deepEqual(spy.calls, []);
    } finally {
      spy.restore();
    }
  });

  it('makes no network call while rendering every preview state', async () => {
    const spy = spyOnNetwork();
    try {
      for (const id of ['low', 'medium', 'high', 'partial'] as const) {
        const state = await buildPreviewState(id);
        assert.ok(state.result);
      }
      assert.deepEqual(spy.calls, []);
    } finally {
      spy.restore();
    }
  });

  it('keeps analytics silent when it is disabled', () => {
    const events: PageEvent[] = [];
    const analytics = createAnalytics(
      { enabled: false, provider: 'plausible', scriptUrl: 'https://plausible.example/js' },
      {
        load: () => events.push('pageview'),
        send: event => events.push(event),
      },
    );
    assert.equal(analytics.enabled, false);
    analytics.pageView();
    analytics.event('scan-start');
    analytics.event('scan-complete');
    assert.deepEqual(events, []);
  });

  it('ignores an enabled flag without a provider', () => {
    const events: PageEvent[] = [];
    const analytics = createAnalytics({ enabled: true, provider: 'none' }, {
      load: () => {},
      send: event => events.push(event),
    });
    assert.equal(analytics.enabled, false);
    analytics.event('share-action');
    assert.deepEqual(events, []);
  });

  it('sends page events and nothing else when enabled', async () => {
    const events: PageEvent[] = [];
    const analytics = createAnalytics(
      { enabled: true, provider: 'umami', scriptUrl: 'https://umami.example/script.js' },
      {
        load: () => {},
        send: event => events.push(event),
      },
    );
    assert.equal(analytics.enabled, true);
    analytics.pageView();
    analytics.event('scan-start');
    analytics.event('scan-complete');
    analytics.event('share-open');
    analytics.event('share-action');
    await runScan({ source: fakeSource(CHINA_ENVIRONMENT) });
    assert.deepEqual(events, ['pageview', 'scan-start', 'scan-complete', 'share-open', 'share-action']);
    // Event names only: no score, no observation, no identifier.
    assert.equal(events.every(event => typeof event === 'string' && !/\d/.test(event)), true);
  });

  it('does not create a provider script when the provider is unknown', () => {
    const created: string[] = [];
    const globalStore = globalThis as unknown as { document?: unknown };
    const saved = globalStore.document;
    globalStore.document = {
      querySelector: () => null,
      createElement: (tag: string) => {
        created.push(tag);
        return { dataset: {} };
      },
      head: { appendChild: () => {} },
    };
    try {
      const analytics = createAnalytics({ enabled: true, provider: 'none' });
      analytics.pageView();
      assert.deepEqual(created, []);
    } finally {
      globalStore.document = saved;
    }
  });

  it('ships with analytics switched off', () => {
    assert.equal(SITE.analytics.enabled, false);
    assert.equal(SITE.analytics.provider, 'none');
  });
});
