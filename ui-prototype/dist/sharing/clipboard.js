/* Clipboard utility shared by terminal commands and platform summaries.
 *
 * The modern Clipboard API is preferred; a best-effort legacy copy runs only
 * when it is unavailable or denied. The clipboard is never read.
 * Older browsers may lack both, so manual copying must stay possible.
 */

                                                                

                                 
                
                 
                 
 

                                       
                                                                     
                                             
                                                                           
                                               
 

function defaultEnvironment()                       {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  const doc = typeof document === 'undefined' ? undefined : document;
  return {
    clipboard: nav?.clipboard ?? null,
    execCommand: doc ? (command        ) => doc.execCommand(command) : undefined,
    createTextArea: doc
      ? () => {
          const area = doc.createElement('textarea');
          area.setAttribute('aria-hidden', 'true');
          area.readOnly = true;
          area.style.position = 'fixed';
          area.style.top = '-1000px';
          area.style.opacity = '0';
          doc.body.appendChild(area);
          return area;
        }
      : undefined,
  };
}

/** Copy plain text. Never reads the clipboard; never throws. */
export async function copyText(
  text        ,
  environment                       ,
)                       {
  const env = environment ?? defaultEnvironment();

  if (env.clipboard?.writeText) {
    try {
      await env.clipboard.writeText(text);
      return 'success';
    } catch {
      /* Denied or unavailable: fall through to the legacy path. */
    }
  }

  if (typeof env.execCommand !== 'function' || !env.createTextArea) {
    return env.clipboard?.writeText ? 'failure' : 'unsupported';
  }

  const area = env.createTextArea();
  if (!area) return 'failure';
  try {
    area.value = text;
    area.select();
    return env.execCommand('copy') ? 'success' : 'failure';
  } catch {
    return 'failure';
  } finally {
    area.remove();
  }
}

/** True when the device offers a share sheet (checked before offering it). */
export function canUseNativeShare(
  target                                                      = typeof navigator === 'undefined'
    ? undefined
    : navigator,
)          {
  return typeof target?.share === 'function';
}
