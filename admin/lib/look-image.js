// A photo's look, drawn here once when it's saved and kept beside the photo, so the site shows the picture as it is
// instead of drawing it on every visit (and showing the plain photo while it does).
import { draw, isLook, pixelated } from '../../src/lib/looks.js';
import { uploadImage } from './cards.js';

// Bump to draw every look again, e.g. after one of them changes.
const VERSION = 1;
const QUALITY = 0.9;

async function lookKey(src, look) {
  const bytes = new TextEncoder().encode(JSON.stringify([VERSION, src, look]));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest.slice(0, 12)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const encode = (canvas, type) => new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));

// The picture of a photo in a look: the one it has if that's still it, or a fresh one. Undefined for no look; null
// when it can't be drawn or saved, and then the site draws it itself. Pictures are never taken down: they're small,
// named for what's in them, and another card, or this one open somewhere else, may still show one.
export async function lookImage(src, look, previous) {
  if (!src || !isLook(look)) return undefined;
  try {
    const key = await lookKey(src, look);
    if (previous?.includes(key)) return previous;
    const canvas = await draw(src, look);
    if (!canvas) return null;
    // The pixel looks stay exact. The rest are photos: WebP, or JPEG where the browser can't make WebP (Safari).
    let image = await encode(canvas, pixelated(look) ? 'image/png' : 'image/webp');
    if (!pixelated(look) && image?.type !== 'image/webp') image = await encode(canvas, 'image/jpeg');
    return await uploadImage(image, { folder: 'looks', name: key });
  } catch {
    return null;
  }
}
