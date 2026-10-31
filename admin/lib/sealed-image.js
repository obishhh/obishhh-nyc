// Paints a card the way the binder shows it sealed (blurred, washed out, no words) into a small image,
// so the site can show one picture instead of blurring a live card.

const VERSION = 3;
const PAD = 24;
const WIDTH = 252;
const HEIGHT = 352;
const BLUR_RADII = [7, 6, 7];
const SATURATION = 0.7;

export async function sealedKey({ art, type, finish }) {
  const bytes = new TextEncoder().encode(JSON.stringify([VERSION, art.baked || art.src, art.position, type, finish]));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest.slice(0, 12)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function palette(type) {
  const probe = document.createElement('span');
  probe.dataset.type = type;
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const color = (name) => style.getPropertyValue(name).trim();
  const colors = {
    ink: color('--ink-900'), hp: color('--hp-600'),
    border: [color('--border-300'), color('--border-500'), color('--border-700')],
    foil: [color('--foil-200'), color('--foil-500'), color('--foil-700')],
    panel: color('--type-panel'), deep: color('--type-deep'), energy: color('--type-energy'),
  };
  probe.remove();
  return colors;
}

async function loadImage(src) {
  if (!src) return null;
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = src;
  await image.decode();
  return image;
}

const RAINBOW = ['#7cf3ff', '#c7a4ff', '#ffb3e1', '#fff3a1', '#8dffc7'];

function diagonal(ctx, x, y, w, h, stops) {
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  stops.forEach(([at, color]) => gradient.addColorStop(at, color));
  return gradient;
}

function rainbow(ctx, x, y, w, h, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = diagonal(ctx, x, y, w, h, RAINBOW.map((color, index) => [index / 4, color]));
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function bar(ctx, x, y, w, h, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// A raised coin, as the energy symbols are drawn: no outline, just a soft shadow under it.
function coin(ctx, x, y, radius, fill) {
  ctx.save();
  ctx.shadowColor = 'rgb(0 0 0 / 0.38)';
  ctx.shadowBlur = 1.5;
  ctx.shadowOffsetY = 0.75;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function cover(ctx, image, x, y, w, h, position = '') {
  const [px = 50, py = 50] = (position.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(image, x + (w - dw) * (px / 100), y + (h - dh) * (py / 100), dw, dh);
  ctx.restore();
}

// The card's layout from card.css, measured off a live card, with the words drawn as soft bars: under the blur they
// read the same.
function drawCard(ctx, { type, finish, art }, image) {
  const c = palette(type);

  ctx.fillStyle = diagonal(ctx, 0, 0, WIDTH, HEIGHT, [[0, c.border[0]], [0.55, c.border[1]], [1, c.border[1]]]);
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, WIDTH - 1, HEIGHT - 1, 12);
  ctx.fill();
  ctx.strokeStyle = c.border[2];
  ctx.stroke();

  // The panel runs the card's height, with the small print inside it along the bottom.
  const panel = ctx.createLinearGradient(0, 11, 0, 341);
  panel.addColorStop(0, c.panel);
  panel.addColorStop(1, c.deep);
  ctx.fillStyle = panel;
  ctx.beginPath();
  ctx.roundRect(11, 11, 230, 330, 6);
  ctx.fill();
  if (finish === 'reverse') rainbow(ctx, 11, 11, 230, 330, 0.55);

  // Filed-under badge, then the name line: title, minutes and the type's coin, all down on the art.
  bar(ctx, 22, 16, 28, 10, '#e6e6e3');
  bar(ctx, 22, 30, 74, 17, c.ink, 0.9);
  bar(ctx, 175, 32, 22, 14, c.hp, 0.85);
  coin(ctx, 216, 32, 14, c.energy);

  ctx.fillStyle = diagonal(ctx, 22, 50, 208, 134, [[0, c.foil[0]], [0.45, c.foil[1]], [1, c.foil[2]]]);
  ctx.fillRect(22, 50, 208, 134);
  if (image) cover(ctx, image, 25, 53, 202, 128, art.position);
  if (finish === 'holo') rainbow(ctx, 25, 53, 202, 128, 0.25);

  const dex = ctx.createLinearGradient(22, 0, 230, 0);
  dex.addColorStop(0, c.foil[0]);
  dex.addColorStop(1, c.foil[1]);
  ctx.fillStyle = dex;
  ctx.fillRect(22, 188, 208, 15);
  coin(ctx, 32.5, 195.5, 5.5, c.ink);
  bar(ctx, 42, 193, 92, 6, c.ink, 0.8);

  // The move, in the middle of the room between the dex strip and the stats.
  coin(ctx, 29.5, 249.5, 7.5, c.energy);
  coin(ctx, 46.5, 249.5, 7.5, '#f4f2ee');
  bar(ctx, 62, 231, 78, 11, c.ink, 0.9);
  bar(ctx, 62, 249, 124, 6, c.ink, 0.65);
  bar(ctx, 62, 259, 96, 6, c.ink, 0.65);
  bar(ctx, 214, 242, 12, 15, c.ink, 0.85);

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = c.ink;
  ctx.fillRect(22, 295, 208, 1);
  ctx.globalAlpha = 1;
  for (const [x, w] of [[24, 35], [120, 28], [210, 18]]) bar(ctx, x, 302, w, 5, c.ink, 0.85);
  coin(ctx, 41.5, 318.5, 7.5, c.energy);

  for (const [x, w] of [[24, 43], [104, 47], [189, 39]]) bar(ctx, x, 334, w, 5, c.ink, 0.7);
}

// Three box blurs make a Gaussian close to CSS blur(7px). Premultiplied, so the edges don't darken.
function boxBlur(pixels, width, height, radius) {
  const copy = new Float32Array(pixels.length);
  const pass = (from, to, length, lines, step, lineStep) => {
    const size = radius * 2 + 1;
    for (let line = 0; line < lines; line += 1) {
      const start = line * lineStep;
      for (let channel = 0; channel < 4; channel += 1) {
        let sum = 0;
        for (let i = -radius; i <= radius; i += 1) sum += from[start + Math.min(length - 1, Math.max(0, i)) * step + channel];
        for (let i = 0; i < length; i += 1) {
          to[start + i * step + channel] = sum / size;
          const add = Math.min(length - 1, i + radius + 1);
          const drop = Math.max(0, i - radius);
          sum += from[start + add * step + channel] - from[start + drop * step + channel];
        }
      }
    }
  };
  pass(pixels, copy, width, height, 4, width * 4);
  pass(copy, pixels, height, width, width * 4, 4);
}

function soften(data) {
  const { width, height } = data;
  const pixels = Float32Array.from(data.data);
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    pixels[i] *= alpha;
    pixels[i + 1] *= alpha;
    pixels[i + 2] *= alpha;
  }
  for (const radius of BLUR_RADII) boxBlur(pixels, width, height, radius);
  const s = SATURATION;
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255 || 1;
    const [r, g, b] = [pixels[i] / alpha, pixels[i + 1] / alpha, pixels[i + 2] / alpha];
    data.data[i] = (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b;
    data.data[i + 1] = (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b;
    data.data[i + 2] = (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b;
    data.data[i + 3] = pixels[i + 3];
  }
}

export async function paintSealed(card) {
  // Painted from the photo in its look, if it has one, so a draft matches the card it'll be.
  const image = await loadImage(card.art.baked || card.art.src).catch(() => null);
  const canvas = Object.assign(document.createElement('canvas'), { width: WIDTH + PAD * 2, height: HEIGHT + PAD * 2 });
  const ctx = canvas.getContext('2d');
  ctx.translate(PAD, PAD);
  drawCard(ctx, card, image);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  soften(data);
  ctx.putImageData(data, 0, 0);
  const encode = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.82));
  const webp = await encode('image/webp');
  return webp?.type === 'image/webp' ? webp : encode('image/png');
}
