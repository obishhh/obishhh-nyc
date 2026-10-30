import { h } from './dom.js';

// How a photo can be shown on a card. Drawn live in the visitor's browser for now: the plain photo goes up first,
// and the filtered version replaces it once it's drawn. A photo that can't be read back (no CORS) stays plain.
export const LOOKS = [
  { value: '', label: 'Default' },
  { value: 'watercolour', label: 'Watercolour' },
  { value: 'pencil', label: 'Coloured pencil' },
  { value: 'cel', label: 'Cel art' },
  { value: 'comic', label: 'Comic' },
  { value: 'gameboy', label: 'Game Boy (Gen 1)' },
  { value: 'gbc', label: 'Game Boy Color (Gen 2)' },
  { value: 'ds', label: 'DS (Gen 5)' },
];

const known = (look) => LOOKS.some(({ value }) => value && value === look);

// The four greens of the original Game Boy, darkest first.
const GAMEBOY = [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const INK = [26, 23, 18];

// Each look draws the photo onto a canvas of its own size: the pixel ones small, shown blown up with hard edges.
const DRAW = {
  watercolour: { width: 480, pixelated: false, paint: watercolour },
  pencil: { width: 480, pixelated: false, paint: pencil },
  cel: { width: 480, pixelated: false, paint: cel },
  gameboy: { width: 96, pixelated: true, paint: gameBoy },
  comic: { width: 420, pixelated: false, paint: comic },
  gbc: { width: 80, pixelated: true, paint: gameBoyColor },
  ds: { width: 128, pixelated: true, paint: ds },
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

// Shared by the painted looks: a soft copy of the picture (a box blur, run three times so it's close to a smooth
// blur), how sharply each pixel changes (for outlines), and a steady per-pixel random number (for paper and strokes).
function blurred(data, width, height, radius) {
  const out = Float32Array.from(data);
  const tmp = new Float32Array(out.length);
  const pass = (from, to, horizontal) => {
    const [lines, length] = horizontal ? [height, width] : [width, height];
    for (let line = 0; line < lines; line += 1) {
      for (let c = 0; c < 3; c += 1) {
        const at = (k) => (horizontal ? (line * width + k) * 4 + c : (k * width + line) * 4 + c);
        let sum = 0;
        for (let k = -radius; k <= radius; k += 1) sum += from[at(Math.min(length - 1, Math.max(0, k)))];
        for (let k = 0; k < length; k += 1) {
          to[at(k)] = sum / (radius * 2 + 1);
          sum += from[at(Math.min(length - 1, k + radius + 1))] - from[at(Math.max(0, k - radius))];
        }
      }
    }
  };
  for (let n = 0; n < 3; n += 1) {
    pass(out, tmp, true);
    pass(tmp, out, false);
  }
  return out;
}

function edges(data, width, height) {
  const lum = new Float32Array(width * height);
  for (let p = 0; p < lum.length; p += 1) lum[p] = 0.3 * data[p * 4] + 0.59 * data[p * 4 + 1] + 0.11 * data[p * 4 + 2];
  const out = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const p = y * width + x;
      const gx = lum[p - width + 1] + 2 * lum[p + 1] + lum[p + width + 1] - lum[p - width - 1] - 2 * lum[p - 1] - lum[p + width - 1];
      const gy = lum[p + width - 1] + 2 * lum[p + width] + lum[p + width + 1] - lum[p - width - 1] - 2 * lum[p - width] - lum[p - width + 1];
      out[p] = Math.hypot(gx, gy);
    }
  }
  return out;
}

const noise = (x, y) => ((((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) + 1) % 1);
// Smooth noise: the per-pixel kind, blended between points a few pixels apart, for paper fibres and blotches.
function smoothNoise(x, y, scale) {
  const [gx, gy] = [x / scale, y / scale];
  const [x0, y0] = [Math.floor(gx), Math.floor(gy)];
  const [fx, fy] = [gx - x0, gy - y0];
  const ease = (t) => t * t * (3 - 2 * t);
  const top = noise(x0, y0) + (noise(x0 + 1, y0) - noise(x0, y0)) * ease(fx);
  const bottom = noise(x0, y0 + 1) + (noise(x0 + 1, y0 + 1) - noise(x0, y0 + 1)) * ease(fx);
  return top + (bottom - top) * ease(fy);
}

const PAPER = [246, 240, 226];
const clamp = (v) => Math.max(0, Math.min(255, v));

// The painted art of the first sets: soft washes of colour on paper, pooling darker where one wash meets the next,
// over a faint pencil drawing.
function watercolour({ data, width, height }) {
  const wash = blurred(data, width, height, 3);
  const lines = edges(data, width, height);
  // Pigment settles in a few strengths, so neighbouring washes meet at an edge. Only the strength steps, never the
  // colour, and what's nearly white stays bare paper.
  const step = 255 / 5;
  const pooled = new Float32Array(wash.length);
  for (let i = 0; i < wash.length; i += 4) {
    const grey = 0.3 * wash[i] + 0.59 * wash[i + 1] + 0.11 * wash[i + 2];
    const settled = grey > 226 ? 255 : Math.round(grey / step) * step + step * 0.35;
    for (let c = 0; c < 3; c += 1) {
      const vivid = grey + (wash[i + c] - grey) * 1.25;
      pooled[i + c] = grey > 226 ? PAPER[c] : clamp(vivid * ((settled + 8) / (grey + 8)));
    }
  }
  const rims = edges(pooled, width, height);
  for (let i = 0; i < data.length; i += 4) {
    const p = i / 4;
    const [x, y] = [p % width, Math.floor(p / width)];
    const blotch = smoothNoise(x, y, 14) * 0.5 + smoothNoise(x, y, 5) * 0.5;
    const fibre = 0.94 + noise(x, y) * 0.08;
    const rim = rims[p] > 60 ? 0.86 : 1;
    const pencil = Math.min(1, lines[p] / 320) * 0.5;
    for (let c = 0; c < 3; c += 1) {
      // Thin paint: a third of the paper shows through, more where the wash was uneven.
      const thin = 0.28 + blotch * 0.14;
      const paint = pooled[i + c] * (1 - thin) + PAPER[c] * thin;
      data[i + c] = clamp(paint * rim * fibre * (1 - pencil) + 60 * pencil);
    }
  }
}

// The coloured-pencil backgrounds of the first sets: strokes on a slant, packed tighter in the darks, cream paper
// between them, and the shapes outlined in a darker pencil.
function pencil({ data, width, height }) {
  const soft = blurred(data, width, height, 1);
  const lines = edges(data, width, height);
  for (let i = 0; i < data.length; i += 4) {
    const p = i / 4;
    const [x, y] = [p % width, Math.floor(p / width)];
    const grey = 0.3 * soft[i] + 0.59 * soft[i + 1] + 0.11 * soft[i + 2];
    const dark = 1 - grey / 255;
    const wobble = smoothNoise(x, y, 6) * 1.6;
    const stroke = (((x * 0.8 + y + wobble) / 2.6) % 1 + 1) % 1;
    const cross = (((x * 0.8 - y + wobble) / 2.6) % 1 + 1) % 1;
    // Light areas get a few strokes, darks a dense hatch, the deepest a second hatch across it.
    let cover = stroke < 0.25 + dark * 0.7 ? 0.85 : 0.18;
    if (dark > 0.55 && cross < (dark - 0.55) * 1.8) cover = 1;
    cover *= 0.85 + noise(x, y) * 0.3;
    const outline = Math.min(1, Math.max(0, (lines[p] - 120) / 260)) * (0.7 + smoothNoise(x, y, 3) * 0.3);
    for (let c = 0; c < 3; c += 1) {
      const colour = grey + (soft[i + c] - grey) * 1.35;
      const laid = PAPER[c] * (1 - cover) + colour * cover;
      data[i + c] = clamp(laid * (1 - outline) + colour * 0.35 * outline);
    }
  }
}

// Official cel-style art: each colour flattened to a lit tone and a shadow tone, under clean dark outlines.
function cel({ data, width, height }) {
  const soft = blurred(data, width, height, 2);
  const lines = edges(blurred(data, width, height, 1), width, height);
  for (let i = 0; i < data.length; i += 4) {
    const p = i / 4;
    const grey = 0.3 * soft[i] + 0.59 * soft[i + 1] + 0.11 * soft[i + 2];
    // Hue kept, brightness snapped to one of three tones.
    const tone = grey > 170 ? 1.12 : grey > 90 ? 0.92 : 0.62;
    const ink = lines[p] > 110;
    for (let c = 0; c < 3; c += 1) {
      const vivid = grey + (soft[i + c] - grey) * 1.4;
      const flat = Math.round(vivid / 32) * 32;
      data[i + c] = ink ? 34 : clamp(flat * tone);
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
