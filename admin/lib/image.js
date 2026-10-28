const LONGEST_SIDE = 1600;
const QUALITY = 0.86;

// Shrinks a photo to a sensible size and re-encodes it, so uploads stay small.
export async function prepareImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const encode = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
  const webp = await encode('image/webp');
  // Safari can't encode WebP and hands back a PNG instead.
  return webp?.type === 'image/webp' ? webp : encode('image/jpeg');
}
