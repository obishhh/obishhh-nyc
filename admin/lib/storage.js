// The editor's pictures in storage: photos uploaded from this device, the looks and sealed cards it paints, and
// taking them down again.
import { supabase, unwrap } from './supabase.js';

const BUCKET = 'card-art';
const LONGEST_SIDE = 1600;
const QUALITY = 0.86;

const bucket = () => supabase.storage.from(BUCKET);
const publicUrl = (name) => bucket().getPublicUrl(name).data.publicUrl;

// Card art sits at the top of the bucket, where the art picker lists it; post photos, looks and sealed cards go in
// folders.
export async function uploadImage(image, { folder, name = crypto.randomUUID() } = {}) {
  const file = `${name}.${image.type.split('/')[1]}`;
  const path = folder ? `${folder}/${file}` : file;
  unwrap(await bucket().upload(path, image, { contentType: image.type, cacheControl: '31536000', upsert: true }));
  return publicUrl(path);
}

export const listUploads = async () =>
  unwrap(await bucket().list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } }))
    .filter(({ id, name }) => id && !name.startsWith('.'))
    .map(({ name }) => publicUrl(name));

// Takes an uploaded image back out of storage. Only ever one of ours: anything else, like library art, is left alone.
export async function deleteImage(url) {
  const ours = publicUrl('');
  if (!url?.startsWith(ours)) return;
  unwrap(await bucket().remove([decodeURIComponent(url.slice(ours.length))]));
}

// A canvas as an image file: `type` where the browser can make it, `fallback` where it can't (Safari makes no WebP).
export async function encode(canvas, { type = 'image/webp', fallback = 'image/jpeg', quality = QUALITY } = {}) {
  const make = (as) => new Promise((resolve) => canvas.toBlob(resolve, as, quality));
  const image = await make(type);
  return image?.type === type ? image : make(fallback);
}

// A short name for something, the same every time it's the same: the start of its SHA-256, in hex.
export async function digest(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...hash.slice(0, 12)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// A photo from this device, shrunk to a sensible size and re-encoded so it stays small, then uploaded: its address.
export async function upload(file, options) {
  let canvas;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));
    canvas = Object.assign(document.createElement('canvas'), { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
  } catch {
    throw new Error('That file didn’t read as an image. Try a JPG or PNG.');
  }
  return uploadImage(await encode(canvas), options);
}
