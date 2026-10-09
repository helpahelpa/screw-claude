/* Optional page analytics, off by default and isolated from scan data.
 *
 * Only page events are allowed: no observations, results, scores, font lists,
 * locales or user agents ever reach this module. Enabling it is a deployment
 * decision, and the provider's own collection should be documented rather than
 * described as anonymous.
 */

                                                               

                                  
                   
                               
                                                       
                     
                  
 

/** Page events this module accepts. Scan data is not an accepted event. */
                                                                                                    

                                
                                                                    
                               
 

                            
                            
                   
                               
 

export function createAnalytics(
  config                 ,
  sink                ,
)            {
  const enabled = config.enabled === true && (config.provider ?? 'none') !== 'none';

  const dispatch = (name           ) => {
    if (!enabled) return;
    const scriptUrl = config.scriptUrl;
    if (sink) {
      sink.send(name);
      return;
    }
    // A minimal provider-agnostic hook: deployments wire their own sink.
    const globalStore = globalThis                                                                        ;
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
