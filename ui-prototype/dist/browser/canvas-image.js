/* Default result image renderer: 1200 × 630 Canvas artwork, exported as a PNG
 * blob with `toBlob`. Localized text wraps or truncates; no page screenshot and
 * no server endpoint are involved.
 */

import { IMAGE_HEIGHT, IMAGE_WIDTH, ResultImageError } from '../sharing/image.js';
                                                                             

                                        
                      
                  
               
                 
                      
                
 

const BUNDLED_CJK = "'Taste CJK', 'Prototype CJK'";
const SYSTEM_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto";

/**
 * Canvas text does not inherit page typography, so the exported card must ask
 * for the page's own stack: the bundled CJK subset is what keeps Chinese card
 * text readable on machines without system CJK fonts.
 */
function pageFontStack(doc                      )         {
  const base = `${SYSTEM_STACK}, ${BUNDLED_CJK}, sans-serif`;
  if (!doc) return base;
  try {
    const declared = getComputedStyle(doc.documentElement).getPropertyValue('--sans').trim();
    if (!declared) return base;
    if (declared.includes('CJK')) return declared;
    // Insert the bundled subset before any trailing generic family.
    const withoutGeneric = declared.replace(/,?\s*(sans-serif|serif|monospace)\s*$/, '');
    return `${withoutGeneric}, ${BUNDLED_CJK}, sans-serif`;
  } catch {
    return base;
  }
}

/** Wait for webfonts so the export never falls back to a tofu-capable face. */
async function readyFonts(doc                      , sample        )                {
  if (!doc?.fonts) return;
  try {
    await doc.fonts.load(`400 30px ${BUNDLED_CJK}`, sample);
    await doc.fonts.ready;
  } catch {
    /* A missing subset only costs glyph coverage, never the export. */
  }
}

/** Split text into lines that fit `maxWidth`, breaking long CJK runs per character. */
function wrapText(
  context                          ,
  text        ,
  maxWidth        ,
  maxLines        ,
)           {
  const words = text.split(/\s+/).filter(Boolean);
  const lines           = [];
  let current = '';

  const pushWord = (word        ) => {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      return;
    }
    if (current) {
      lines.push(current);
      current = '';
    }
    if (context.measureText(word).width <= maxWidth) {
      current = word;
      return;
    }
    // A single long token (typical for CJK without spaces): break per character.
    let chunk = '';
    for (const character of word) {
      const next = chunk + character;
      if (context.measureText(next).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = character;
      } else {
        chunk = next;
      }
    }
    current = chunk;
  };

  for (const word of words) {
    pushWord(word);
    if (lines.length >= maxLines) break;
  }
  if (current) lines.push(current);

  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last && context.measureText(last).width >= maxWidth * 0.92) {
      lines[maxLines - 1] = `${last.slice(0, Math.max(1, last.length - 1))}…`;
    }
  }
  return lines;
}

export function createCanvasRenderer(options                        = {})                      {
  const accent = options.accent ?? '#2f5cf6';
  const ink = options.ink ?? '#141a28';
  const muted = options.muted ?? '#5d6b80';
  const background = options.background ?? '#ffffff';
  return {
    async render(content              )                {
      const doc = options.document ?? (typeof document === 'undefined' ? undefined : document);
      const canvas = doc?.createElement('canvas');
      const context = canvas?.getContext('2d') ?? null;
      if (!canvas || !context) {
        throw new ResultImageError('Canvas is unavailable');
      }
      const font = options.font ?? pageFontStack(doc);
      const sample = [content.brand, content.scoreLabel, content.band, content.matchedLabel, content.url, content.note]
        .concat(content.matchedNames.length > 0 ? content.matchedNames : [content.noneMatched])
        .join('');
      await readyFonts(doc, sample);

      canvas.width = content.width || IMAGE_WIDTH;
      canvas.height = content.height || IMAGE_HEIGHT;

      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Accent rail and a quiet band tint keep the exported card recognisable.
      context.fillStyle = accent;
      context.fillRect(0, 0, 14, canvas.height);

      const padding = 64;

      context.fillStyle = ink;
      context.font = `600 34px ${font}`;
      context.fillText(content.brand, padding, 96);

      context.fillStyle = muted;
      context.font = `400 24px ${font}`;
      context.fillText(content.scoreLabel, padding, 154);

      context.fillStyle = accent;
      context.font = `450 168px ${font}`;
      const scoreWidth = context.measureText(content.score).width;
      context.fillText(content.score, padding, 320);

      context.fillStyle = muted;
      context.font = `400 30px ${font}`;
      context.fillText(content.outOf, padding + scoreWidth + 18, 316);

      // Band badge, measured so long localized labels still fit.
      context.font = `500 28px ${font}`;
      const bandWidth = context.measureText(content.band).width + 44;
      context.fillStyle = accent;
      context.globalAlpha = 0.12;
      context.beginPath();
      context.roundRect(padding, 360, bandWidth, 56, 28);
      context.fill();
      context.globalAlpha = 1;
      context.fillStyle = accent;
      context.fillText(content.band, padding + 22, 397);

      const columnX = Math.round(canvas.width / 2) + 40;
      const columnWidth = canvas.width - columnX - padding;

      context.fillStyle = ink;
      context.font = `500 24px ${font}`;
      context.fillText(content.matchedLabel, columnX, 154);

      context.font = `400 30px ${font}`;
      context.fillStyle = muted;
      const names = content.matchedNames.length > 0 ? content.matchedNames : [content.noneMatched];
      const lines = wrapText(context, names.join(' · '), columnWidth, 6);
      lines.forEach((line, index) => {
        context.fillText(line, columnX, 210 + index * 46);
      });

      context.strokeStyle = '#dfe4ee';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(padding, 500);
      context.lineTo(canvas.width - padding, 500);
      context.stroke();

      context.fillStyle = muted;
      context.font = `400 24px ${font}`;
      context.fillText(content.url, padding, 552);
      context.font = `400 20px ${font}`;
      context.fillText(content.note, padding, 588);

      return new Promise      ((resolve, reject) => {
        try {
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new ResultImageError('toBlob returned no image'));
          }, 'image/png');
        } catch (error) {
          reject(new ResultImageError('PNG export failed', { cause: error }));
        }
      });
    },
  };
}
