// A photo's look, drawn here once when it's saved and kept beside the photo, so the site shows the picture as it is
// instead of drawing it on every visit (and showing the plain photo while it does).
import { draw, isLook, pixelated } from '../../src/lib/looks.js';
import { digest, encode, uploadImage } from './storage.js';

// Bump to draw every look again, e.g. after one of them changes.
const VERSION = 1;

// The picture of a photo in a look: the one it has if that's still it, or a fresh one. Undefined for no look; null
// when it can't be drawn or saved, and then the site draws it itself. Pictures are never taken down: they're small,
// named for what's in them, and another card, or this one open somewhere else, may still show one.
export async function lookImage(src, look, previous) {
  if (!src || !isLook(look)) return undefined;
  try {
    const key = await digest([VERSION, src, look]);
    if (previous?.includes(key)) return previous;
    const canvas = await draw(src, look);
    if (!canvas) return null;
    // The pixel looks stay exact. The rest are photos: WebP, or JPEG where the browser can't make WebP (Safari).
    const image = await encode(canvas, pixelated(look) ? { type: 'image/png' } : { quality: 0.9 });
    return await uploadImage(image, { folder: 'looks', name: key });
  } catch {
    return null;
  }
}

// A Snapshot's photos with their look drawn (they share one look), reusing the pictures `was` has where they're still
// it. A photo whose look couldn't be drawn has none, and the site draws it; `failed` says if that happened.
export async function withLooks(photo, was) {
  if (!photo) return { photo, failed: false };
  const { src, look, second } = photo;
  const baked = await lookImage(src, look, was?.baked);
  const secondBaked = second?.src ? await lookImage(second.src, look, was?.second?.baked) : undefined;
  return {
    photo: { ...photo, baked: baked ?? undefined, second: second?.src ? { ...second, baked: secondBaked ?? undefined } : second },
    failed: baked === null || secondBaked === null,
  };
}
