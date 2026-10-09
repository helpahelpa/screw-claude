/* Result image: local PNG generation with an injected renderer, plus the
 * reference delivery order (native file share, clipboard, download).
 *
 * The functionality supplies localized strings and structured result data; the
 * renderer decides the appearance. Nothing is uploaded and no page screenshot
 * is taken.
 */

                                                             
import { RULES } from '../core/rules.js';
import { dictionary } from '../content/locales.js';
                                                                
import { matchedNames } from './text.js';

/** Everything a renderer needs; all strings are already localized. */
                               
                
                     
                
                
               
                       
                         
                                                                            
                         
                      
                   
              
               
                                 
                
                 
 

                                      
                                                      
 

export class ResultImageError extends Error {
  /** A failed export never changes the scan result; the UI can keep the result. */
           recoverable = true;

  constructor(message        , options                      ) {
    super(message, options);
    this.name = 'ResultImageError';
  }
}

export const IMAGE_WIDTH = 1200;
export const IMAGE_HEIGHT = 630;

export function buildImageContent(
  result            ,
  locale          ,
  url        ,
  messages           = dictionary(locale),
)               {
  const names = matchedNames(result, messages);
  const capped = names.slice(0, RULES.imageHitLimit);
  return {
    brand: 'screw/claude',
    scoreLabel: messages.resultLabel,
    score: String(result.total),
    outOf: messages.outOf,
    band: result.band === 'high' ? messages.bandHigh : result.band === 'medium' ? messages.bandMedium : messages.bandLow,
    matchedLabel: messages.shareMatchedLabel,
    matchedNames: capped,
    matchedIds: result.hits.slice(0, RULES.imageHitLimit),
    noneMatched: messages.noneMatched,
    urlLabel: messages.shareUrlLabel,
    url,
    note: messages.shareGeneratedNote,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  };
}

/** Render a PNG blob on the device. Throws a recoverable `ResultImageError`. */
export async function createResultPng(
  result            ,
  locale          ,
  renderer                     ,
  options                                      ,
)                {
  const content = buildImageContent(result, locale, options.url, options.messages);
  let blob      ;
  try {
    blob = await renderer.render(content);
  } catch (error) {
    throw new ResultImageError('Image rendering failed', { cause: error });
  }
  if (!blob || typeof blob.size !== 'number') {
    throw new ResultImageError('The renderer did not return a Blob');
  }
  return blob;
}

/* -------------------------------------------------------------- delivery -- */

                                                                       

                                       
              
                          
                     
                  
 

                                           
                                               
                                                                                       
                                                       
                                                            
                                                       
                                                                
                                                  
                                                                         
                                                    
 

function isCancel(error         )          {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'NotAllowedError');
}

function fileNameFor(locale          , score        )         {
  return `screw-claude-${locale}-${score}.png`;
}

/**
 * Deliver a prepared PNG. Order: native file sharing, image clipboard, then
 * download. A canceled share stays canceled; other failures fall through.
 */
export async function deliverResultImage(
  blob      ,
  options   
                     
                  
                  
                 
                                           
   ,
)                                {
  const env = options.environment ?? {};
  const fileName = fileNameFor(options.locale, options.score);
  const file = env.createFile?.(blob, fileName);

  if (env.shareFiles && file) {
    try {
      const data = { files: [file], title: options.title, text: options.text };
      if (!env.canShareFiles || env.canShareFiles(data)) {
        await env.shareFiles(data);
        return { ok: true, method: 'native-share' };
      }
    } catch (error) {
      if (isCancel(error)) return { ok: false, canceled: true, reason: 'canceled' };
      // Any other failure falls through to the next supported method.
    }
  }

  if (env.writeClipboard && env.createClipboardItem) {
    try {
      await env.writeClipboard([env.createClipboardItem({ 'image/png': blob })]);
      return { ok: true, method: 'clipboard' };
    } catch (error) {
      if (isCancel(error)) return { ok: false, canceled: true, reason: 'canceled' };
    }
  }

  if (env.download) {
    try {
      env.download(blob, fileName);
      return { ok: true, method: 'download' };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : 'download failed',
      };
    }
  }

  return { ok: false, reason: 'no delivery method available' };
}

/**
 * Cache a prepared blob after scan completion so the user activation needed
 * for sharing is not spent on rendering.
 */
export function createImageCache()   
                                                                                                           
                     
                
  {
  let blob              = null;
  let pending                       = null;
  return {
    prepare(result, locale, renderer, url) {
      if (blob) return Promise.resolve(blob);
      if (pending) return pending;
      pending = createResultPng(result, locale, renderer, { url })
        .then(value => {
          blob = value;
          return value;
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    },
    get: () => blob,
    clear() {
      blob = null;
      pending = null;
    },
  };
}
