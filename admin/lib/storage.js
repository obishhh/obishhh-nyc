// The editor's pictures in storage: photos uploaded from this device, the looks and sealed cards it paints, and
// taking them down again.
import { supabase, unwrap } from './supabase.js';

const BUCKET = 'card-art';
const LONGEST_SIDE = 1600;
const QUALITY = 0.86;
// Opens an iPhone's HEIC photos where the browser can't (everywhere but Safari). Big, so only fetched for one.
const HEIC = 'https://cdn.jsdelivr.net/npm/heic-to@1.6.6/dist/csp/heic-to.js';

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

// Takes an uploaded photo nothing points at any more back out of storage, quietly: tidying up never gets in the way of
// a save. Only ever one of ours: anything else, like library art, is left alone.
export async function letGo(url) {
  const ours = publicUrl('');
  if (!url?.startsWith(ours)) return;
  await bucket().remove([decodeURIComponent(url.slice(ours.length))]).catch(() => {});
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

const NOT_AN_IMAGE = 'That file isn’t an image.';

// Whether a file's a HEIC (or other HEIF) photo, by its first bytes: an ISO media box with a HEIF brand.
async function heif(file) {
  const head = new TextDecoder().decode(await file.slice(4, 12).arrayBuffer());
  return /^ftyp(heic|heix|heim|heis|hevc|hevx|hevm|hevs|mif1|msf1)$/.test(head);
}

// A photo as the browser opens it, or through the converter if it's a HEIC the browser can't.
async function open(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    if (!(await heif(file))) throw new Error(NOT_AN_IMAGE);
  }
  const { heicTo } = await import(HEIC).catch(() => {
    throw new Error('Couldn’t fetch what opens HEIC photos. Try again once you’re online.');
  });
  return heicTo({ blob: file, type: 'bitmap' }).catch(() => {
    throw new Error(NOT_AN_IMAGE);
  });
}

// A photo from this device, shrunk to a sensible size and re-encoded so it stays small, then uploaded: its address.
export async function upload(file, options) {
  const bitmap = await open(file);
  const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return uploadImage(await encode(canvas), options);
}
