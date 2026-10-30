import { h } from './dom.js';

// How a photo can be shown on a card. Drawn live in the visitor's browser for now: the plain photo goes up first,
// and the filtered version replaces it once it's drawn. A photo that can't be read back (no CORS) stays plain.
export const LOOKS = [
  { value: '', label: 'Default' },
  { value: 'pixel', label: 'Pixel' },
  { value: 'comic', label: 'Comic' },
  { value: 'gameboy', label: 'Game Boy (Gen 1)' },
  { value: 'gbc', label: 'Game Boy Color (Gen 2)' },
  { value: 'ds', label: 'DS (Gen 5)' },
  { value: 'print', label: 'Base Set print' },
  { value: 'holo', label: 'Holo foil' },
];

const known = (look) => LOOKS.some(({ value }) => value && value === look);

// The four greens of the original Game Boy, darkest first.
const GAMEBOY = [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const INK = [26, 23, 18];

// Each look draws the photo onto a canvas of its own size: the pixel ones small, shown blown up with hard edges.
const DRAW = {
  pixel: { width: 72, pixelated: true, paint: () => {} },
  gameboy: { width: 96, pixelated: true, paint: gameBoy },
  comic: { width: 420, pixelated: false, paint: comic },
  gbc: { width: 80, pixelated: true, paint: gameBoyColor },
  ds: { width: 128, pixelated: true, paint: ds },
  print: { width: 480, pixelated: false, paint: basePrint },
  holo: { width: 480, pixelated: false, paint: holo },
};

// Each pixel's brightness, stretched so the photo's darkest is 0 and lightest 1: every shade gets used, however
// bright or dim the photo.
function brightness(data) {
  const lum = new Float32Array(data.length / 4);
  let [low, high] = [255, 0];
  for (let p = 0; p < lum.length; p += 1) {
    lum[p] = 0.3 * data[p * 4] + 0.59 * data[p * 4 + 1] + 0.11 * data[p * 4 + 2];
    low = Math.min(low, lum[p]);
    high = Math.max(high, lum[p]);
  }
  const span = Math.max(1, high - low);
  return lum.map((value) => (value - low) / span);
}

const dither = (at, width, amount) => (BAYER[((Math.floor(at / width) % 4) * 4) + (at % width) % 4] / 16 - 0.5) * amount;

function gameBoy({ data, width }) {
  const lum = brightness(data);
  for (let i = 0; i < data.length; i += 4) {
    const shade = Math.max(0, Math.min(3, Math.round((lum[i / 4] + dither(i / 4, width, 0.35)) * 3)));
    [data[i], data[i + 1], data[i + 2]] = GAMEBOY[shade];
  }
}

// Four shades of the photo's own strongest colour, as a Game Boy Color sprite has: paper, light, dark, ink.
function gameBoyColor({ data, width }) {
  let [r, g, b, weight] = [0, 0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    const chroma = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
    r += data[i] * chroma; g += data[i + 1] * chroma; b += data[i + 2] * chroma; weight += chroma;
  }
  const hue = weight ? [r / weight, g / weight, b / weight] : [120, 120, 120];
  const mix = (a, t) => a.map((v, k) => Math.round(v + (hue[k] - v) * t));
  const shades = [[24, 16, 16], mix([24, 16, 16], 0.75), mix([248, 248, 240], 0.55), [248, 248, 240]];
  // Mid-tones pulled down a little, so the tinted shades carry the picture rather than the paper.
  const lum = brightness(data).map((value) => value ** 1.6);
  for (let i = 0; i < data.length; i += 4) {
    const shade = Math.max(0, Math.min(3, Math.round((lum[i / 4] + dither(i / 4, width, 0.35)) * 3)));
    [data[i], data[i + 1], data[i + 2]] = shades[shade];
  }
}

// A DS screen: low resolution, colour a little punchier, in a handful of steps per channel, lightly dithered.
function ds({ data, width }) {
  const step = 255 / 7;
  for (let i = 0; i < data.length; i += 4) {
    const grey = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
    const nudge = dither(i / 4, width, step * 0.6);
    for (let c = 0; c < 3; c += 1) {
      const punchy = grey + (data[i + c] - grey) * 1.25;
      data[i + c] = Math.max(0, Math.min(255, Math.round((punchy + nudge) / step) * step));
    }
  }
}

// The way a 1999 card printed a picture: warm, a little faded, with the print's dots showing and a touch of grain.
function basePrint({ data, width }) {
  const cell = 3;
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);
    const grey = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
    // A dot screen at an angle: darker tones get bigger dots, so the darks break up into rosettes.
    const u = (x + y) / cell;
    const v = (x - y) / cell;
    const dot = Math.hypot(u - Math.round(u), v - Math.round(v));
    const ink = dot < (1 - grey / 255) * 0.55 ? 0.86 : 1;
    const grain = ((((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) + 1) % 1) * 12 - 6;
    const warm = [1.06, 1.0, 0.86];
    for (let c = 0; c < 3; c += 1) {
      const faded = 28 + data[i + c] * 0.84;
      data[i + c] = Math.max(0, Math.min(255, (grey + (faded - grey) * 0.9) * warm[c] * ink + grain));
    }
  }
}

// A holo rare: the picture under a rainbow foil that runs in diagonal bands, with stars glinting across it.
function holo({ data, width, height }) {
  const stars = new Set();
  let seed = width * 31 + height;
  const next = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < (width * height) / 900; k += 1) stars.add(Math.floor(next() * width) + Math.floor(next() * height) * width);
  for (let i = 0; i < data.length; i += 4) {
    const p = i / 4;
    const x = p % width;
    const y = Math.floor(p / width);
    const band = (x * 0.6 + y) / (width * 0.18);
    const hue = (band + Math.sin(band * 2.1) * 0.15) % 1;
    const foil = [0, 1, 2].map((c) => 0.5 + 0.5 * Math.cos(2 * Math.PI * (hue + c / 3)));
    const shine = 0.5 + 0.5 * Math.sin(band * Math.PI * 2);
    for (let c = 0; c < 3; c += 1) {
      const base = data[i + c] / 255;
      // Screened on, stronger where the band catches the light.
      const lit = 1 - (1 - base) * (1 - foil[c] * (0.18 + 0.22 * shine));
      data[i + c] = Math.min(255, lit * 255);
    }
    if (stars.has(p)) {
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = (Math.min(height - 1, Math.max(0, y + dy)) * width + Math.min(width - 1, Math.max(0, x + dx))) * 4;
        data[q] = data[q + 1] = data[q + 2] = 255;
      }
    }
  }
}

// Flat, punchier colour in a few steps, with dark outlines wherever the picture changes sharply.
function comic({ data, width, height }) {
  const lum = new Float32Array(width * height);
  for (let p = 0; p < lum.length; p += 1) lum[p] = 0.3 * data[p * 4] + 0.59 * data[p * 4 + 1] + 0.11 * data[p * 4 + 2];
  const edge = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const p = y * width + x;
      const gx = lum[p - width + 1] + 2 * lum[p + 1] + lum[p + width + 1] - lum[p - width - 1] - 2 * lum[p - 1] - lum[p + width - 1];
      const gy = lum[p + width - 1] + 2 * lum[p + width] + lum[p + width + 1] - lum[p - width - 1] - 2 * lum[p - width] - lum[p - width + 1];
      edge[p] = Math.hypot(gx, gy) > 150 ? 1 : 0;
    }
  }
  const step = 255 / 4;
  for (let p = 0; p < lum.length; p += 1) {
    const i = p * 4;
    if (edge[p]) {
      [data[i], data[i + 1], data[i + 2]] = INK;
      continue;
    }
    const grey = lum[p];
    for (let c = 0; c < 3; c += 1) {
      const saturated = grey + (data[i + c] - grey) * 1.45;
      data[i + c] = Math.max(0, Math.min(255, Math.round(saturated / step) * step + 12));
    }
  }
}

// One drawing per photo and look, shared by every card that shows it: a canvas can only be in one place, so each
// gets a copy.
const drawn = new Map();

function draw(src, look) {
  const key = `${look} ${src}`;
  if (!drawn.has(key)) {
    drawn.set(key, (async () => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = src;
      await image.decode();
      const { width: wide, paint } = DRAW[look];
      const width = Math.min(wide, image.naturalWidth);
      const height = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * width));
      const canvas = Object.assign(document.createElement('canvas'), { width, height });
      const pen = canvas.getContext('2d', { willReadFrequently: true });
      pen.drawImage(image, 0, 0, width, height);
      const pixels = pen.getImageData(0, 0, width, height);
      paint({ data: pixels.data, width, height });
      pen.putImageData(pixels, 0, 0);
      return canvas;
    })().catch(() => {
      drawn.delete(key);
      return null;
    }));
  }
  return drawn.get(key);
}

function copy(canvas) {
  const twin = Object.assign(document.createElement('canvas'), { width: canvas.width, height: canvas.height });
  twin.getContext('2d').drawImage(canvas, 0, 0);
  return twin;
}

// A photo in a look. Default is the plain <img>; the others swap that for their drawing once it's ready, cropped and
// focused the same way.
export function photo(src, { look = '', alt = '', position = '', ...props } = {}) {
  const image = h('img', { ...props, src, alt, decoding: 'async', style: position && { 'object-position': position } });
  if (!known(look)) return image;
  image.crossOrigin = 'anonymous';
  image.dataset.look = look;
  draw(src, look).then((canvas) => {
    if (!canvas || !image.parentNode) return;
    const shown = copy(canvas);
    shown.className = `look look--${look}`;
    if (DRAW[look].pixelated) shown.classList.add('look--pixelated');
    shown.setAttribute('role', 'img');
    shown.setAttribute('aria-label', alt);
    if (position) shown.style.setProperty('object-position', position);
    image.replaceWith(shown);
  });
  return image;
}
