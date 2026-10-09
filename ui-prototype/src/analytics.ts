/* Optional page analytics, off by default and isolated from scan data.
 *
 * Only page events are allowed: no observations, results, scores, font lists,
 * locales or user agents ever reach this module. Enabling it is a deployment
 * decision, and the provider's own collection should be documented rather than
 * described as anonymous.
 */

export type AnalyticsProvider = 'plausible' | 'umami' | 'none';

export interface AnalyticsConfig {
  enabled: boolean;
  provider?: AnalyticsProvider;
  /** Provider script URL; loaded only when enabled. */
  scriptUrl?: string;
  domain?: string;
}

/** Page events this module accepts. Scan data is not an accepted event. */
export type PageEvent = 'pageview' | 'scan-start' | 'scan-complete' | 'share-open' | 'share-action';

export interface AnalyticsSink {
  load(scriptUrl: string, attributes: Record<string, string>): void;
  send(event: PageEvent): void;
}

export interface Analytics {
  readonly enabled: boolean;
  pageView(): void;
  event(name: PageEvent): void;
}

export function createAnalytics(
  config: AnalyticsConfig,
  sink?: AnalyticsSink,
): Analytics {
  const enabled = config.enabled === true && (config.provider ?? 'none') !== 'none';

  const dispatch = (name: PageEvent) => {
    if (!enabled) return;
    const scriptUrl = config.scriptUrl;
    if (sink) {
      sink.send(name);
      return;
    }
    // A minimal provider-agnostic hook: deployments wire their own sink.
    const globalStore = globalThis as unknown as { __screwClaudeAnalytics__?: (event: PageEvent) => void };
    if (typeof globalStore.__screwClaudeAnalytics__ === 'function') {
      globalStore.__screwClaudeAnalytics__(name);
      return;
    }
    if (scriptUrl) {
      // The provider script itself reports the pageview; nothing else is sent.
      const doc = typeof document === 'undefined' ? undefined : document;
      if (doc && !doc.querySelector(`script[data-analytics="${config.provider}"]`)) {
        const script = doc.createElement('script');
        script.src = scriptUrl;
        script.defer = true;
        script.dataset.analytics = config.provider ?? 'none';
        if (config.domain) script.dataset.domain = config.domain;
        doc.head.appendChild(script);
      }
    }
  };

  return {
    enabled,
    pageView: () => dispatch('pageview'),
    event: dispatch,
  };
}
