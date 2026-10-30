import { seeded } from './seeded.js';

const INK = [30, 27, 38];
const DEG = Math.PI / 180;

// The same wobble (-1 to 1) for the same text every time, so handwriting doesn't change on reload.
const wobbler = (text) => (key) => seeded(`${text}:${key}`) * 2 - 1;

export function random(seed) {
  let state = Math.floor(seed * 4294967295) || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Size the word is written at; it's scaled to fit its spot afterwards.
export const EM = 64;

// Crops a sheet down to the ink on it, so the word can be measured and fitted exactly.
function trim(sheet) {
  const { width, height } = sheet;
  const { data } = sheet.getContext('2d').getImageData(0, 0, width, height);
  let [left, top, right, bottom] = [width, height, -1, -1];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 8) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return sheet;
  const trimmed = Object.assign(document.createElement('canvas'), { width: right - left + 1, height: bottom - top + 1 });
  trimmed.getContext('2d').drawImage(sheet, -left, -top);
  return trimmed;
}

// Writes a word in marker on its own scrap: crooked overall, every letter leaning, sitting and sizing a bit differently.
export function scrawl(text, { hand }) {
  const wobble = wobbler(text);
  const letters = [...text];
  const grow = letters.map((_, index) => 1 + wobble(`grow:${index}`) * 0.17);
  const sheet = Object.assign(document.createElement('canvas'), { width: EM * (letters.length + 3), height: EM * 3 });
  const pen = sheet.getContext('2d');
  pen.font = `${EM}px "${hand}"`;
  const spans = letters.map((char, index) => pen.measureText(char).width * grow[index] + EM * (0.04 + wobble(`gap:${index}`) * 0.05));
  const total = spans.reduce((sum, width) => sum + width, 0);

  pen.translate(sheet.width / 2, sheet.height / 2);
  pen.rotate(wobble('tilt') * 5 * DEG);
  pen.fillStyle = `rgb(${INK})`;
  pen.strokeStyle = `rgb(${INK})`;
  pen.lineJoin = 'round';
  pen.lineCap = 'round';
  pen.textAlign = 'center';
  pen.textBaseline = 'middle';
  let cursor = -total / 2;
  letters.forEach((char, index) => {
    pen.save();
    pen.translate(cursor + spans[index] / 2, wobble(`rise:${index}`) * EM * 0.09);
    pen.rotate(wobble(`turn:${index}`) * 10 * DEG);
    pen.scale(grow[index], grow[index]);
    pen.lineWidth = EM * (0.05 + wobble(`press:${index}`) * 0.015);
    pen.fillText(char, 0, 0);
    pen.strokeText(char, 0, 0);
    pen.restore();
    cursor += spans[index];
  });
  return trim(sheet);
}

// A quick marker line along a canvas, a little bowed, pressing hard where the pen lands and lifting off at the end.
export function swipe(pen, { length, at, weight, wobble }) {
  const start = [length * (0.08 + wobble('start') * 0.03), at + wobble('rise') * weight * 0.3];
  const bend = [length * (0.5 + wobble('bend') * 0.12), at + weight * (0.45 + wobble('bow') * 0.35)];
  const end = [length * (0.92 + wobble('end') * 0.03), at - weight * (0.2 + wobble('lift') * 0.25)];
  const point = (t) => [0, 1].map((axis) => (1 - t) ** 2 * start[axis] + 2 * (1 - t) * t * bend[axis] + t ** 2 * end[axis]);
  const steps = 48;
  pen.strokeStyle = '#000';
  pen.lineCap = 'round';
  for (let step = 0; step < steps; step += 1) {
    const t = step / steps;
    pen.lineWidth = weight * (1.15 - t * 0.3) * Math.min(1, (1 - t) * 8 + 0.35);
    pen.beginPath();
    pen.moveTo(...point(t));
    pen.lineTo(...point((step + 1) / steps));
    pen.stroke();
  }
}

// Puts a written word on its tab: as big as it was written, shrunk only if it would run past the tab's face.
export function place(pen, word, { x, y, angle, size, length, thickness, wobble }) {
  const scale = Math.min(size / EM, length / word.width, thickness / word.height);
  const [width, height] = [word.width * scale, word.height * scale];
  pen.save();
  pen.translate(x, y);
  pen.rotate(angle);
  pen.drawImage(word, -width / 2 + wobble[0] * (length - width) * 0.25, -height / 2 + wobble[1] * (thickness - height) * 0.25, width, height);
  pen.restore();
}

// Gives whatever's drawn on a canvas marker edges and patchy coverage, in one colour.
export function roughen(ink, next, [red, green, blue]) {
  const { width, height } = ink;
  const pen = ink.getContext('2d');
  const drawn = pen.getImageData(0, 0, width, height).data;
  const laid = pen.createImageData(width, height);
  const cell = 4;
  const columns = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(height / cell) + 2;
  const shiftX = Float32Array.from({ length: columns * rows }, () => next() * 2 - 1);
  const shiftY = Float32Array.from({ length: columns * rows }, () => next() * 2 - 1);
  const smooth = (field, gx, gy) => {
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const at = (cx, cy) => field[cy * columns + cx];
    return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const gx = x / cell;
      const gy = y / cell;
      const sx = Math.min(width - 1, Math.max(0, Math.round(x + smooth(shiftX, gx, gy) * 0.9)));
      const sy = Math.min(height - 1, Math.max(0, Math.round(y + smooth(shiftY, gx, gy) * 0.9)));
      const alpha = drawn[(sy * width + sx) * 4 + 3];
      if (!alpha) continue;
      const out = (y * width + x) * 4;
      laid.data[out] = red;
      laid.data[out + 1] = green;
      laid.data[out + 2] = blue;
      laid.data[out + 3] = alpha * (0.7 + next() * 0.3);
    }
  }
  pen.putImageData(laid, 0, 0);
}

// Lays the ink down on the photo, then one grain over plastic and ink alike.
export function inkOver(ctx, ink, seed) {
  const { width, height } = ctx.canvas;
  const next = random(seed);
  roughen(ink, next, INK);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.92;
  ctx.drawImage(ink, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  const photo = ctx.getImageData(0, 0, width, height);
  for (let index = 0; index < photo.data.length; index += 4) {
    const grain = (next() - 0.5) * 6;
    photo.data[index] += grain;
    photo.data[index + 1] += grain;
    photo.data[index + 2] += grain;
  }
  ctx.putImageData(photo, 0, 0);
}
