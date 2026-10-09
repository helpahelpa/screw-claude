/* Share text: a localized summary that carries no raw observations. */

                                                                   
import { SIGNAL_ORDER } from '../core/rules.js';
import { dictionary, formatMessage } from '../content/locales.js';
                                                                

                               
                
             
                    
                                                            
                    
                                       
               
                                                               
               
              
 

                               
                     
                   
                                             
              
                      
 

function bandLabel(messages          , band      )         {
  if (band === 'high') return messages.bandHigh;
  if (band === 'medium') return messages.bandMedium;
  return messages.bandLow;
}

export function matchedNames(result            , messages          )           {
  return result.hits.map(id => messages.signalNames[signalIndex(id)] ?? id);
}

export function signalIndex(id          )         {
  return SIGNAL_ORDER.indexOf(id);
}

/**
 * Localized summary: score, classification, matched signal names and the page
 * URL. Raw observations, font lists, platform strings and user agents are
 * deliberately excluded from the default payload.
 */
export function buildSummary(input              )               {
  const messages = input.messages ?? dictionary(input.locale);
  const matched = matchedNames(input.result, messages);
  const body = formatMessage(
    matched.length > 0 ? messages.shareSummary : messages.shareSummaryNoSignals,
    {
      score: input.result.total,
      band: bandLabel(messages, input.result.band),
      signals: matched.join(', '),
    },
  );
  return {
    score: input.result.total,
    band: input.result.band,
    bandLabel: bandLabel(messages, input.result.band),
    matched,
    body,
    text: `${body}\n${input.url}`,
    url: input.url,
  };
}

                                                     

/** Summary plus platform hashtags, for destinations with a copy workflow. */
export function buildPlatformText(
  summary              ,
  platform              ,
  input                                           ,
)         {
  const messages = input.messages ?? dictionary(input.locale);
  const hashtags = messages.hashtags[platform] ?? [];
  return [summary.text, hashtags.join(' ')].filter(Boolean).join('\n');
}

/** Payload for `navigator.share`. */
export function buildNativeSharePayload(
  summary              ,
  input                                           ,
)                                               {
  const messages = input.messages ?? dictionary(input.locale);
  return { title: messages.title, text: summary.body, url: summary.url };
}
