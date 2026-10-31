import { h } from '../lib/dom.js';
import { HAND, handwriting, inkOver, place, random, roughen, scrawl, swipe } from '../lib/scrawl.js';
import { WIDE } from '../lib/screens.js';
import { MAX_TABS } from '../lib/sections.js';
import { seeded } from '../lib/seeded.js';
import { plural } from '../lib/words.js';

// Where each of the photo's MAX_TABS tabs sits, top to bottom (side) or left to right (top): its edges and the middle of its face.
const SLOTS = [
  [3.23, 14.92, 9.76], [15.73, 27.02, 21.13], [27.42, 38.31, 32.82], [39.11, 50.4, 44.68],
  [50.81, 62.1, 56.13], [62.5, 73.79, 67.74], [74.19, 85.89, 80.73], [86.29, 97.18, 90.89],
];
// Across the strip, where a tab's face starts and ends (from the outer edge in).
const FACE = [0.23, 0.86];
// How much of a tab's face the writing may use, clear of its rounded ends and edges.
const ROOM = { length: 0.74, thickness: 0.78 };
const PHOTOS = { side: '/assets/tabs/side.webp', top: '/assets/tabs/top.webp' };
// Drawn at about the photo's own resolution, so the writing is exactly as soft as the plastic it's on.
const DETAIL = 1.25;
const PHOTO = { length: 1240, thickness: 94 };
// Each tab's colour, as a marker. Sampled from the photo, then pushed a little richer so it reads on the page.
const MARKERS = [
  [215, 160, 28], [0, 202, 194], [214, 0, 8], [205, 196, 51],
  [0, 165, 228], [217, 84, 0], [129, 117, 182], [139, 139, 204],
];
// The selected tab's underline sits across the photo's inner edge: this much of it on the photo, this much off (in photo px).
const MARK = { inside: 10, outside: 14, weight: 7 };
// More than this won't fit on a tab anyway, and it keeps a stray long name from writing a canvas wider than a browser allows.
const LONGEST = 24;

// A marker line under a tab, in its colour, half on the photo and half on the page.
function mark(index, label, side) {
  const [from, to] = SLOTS[index];
  const length = Math.round(((to - from) / 100) * PHOTO.length * DETAIL);
  const across = Math.round((MARK.inside + MARK.outside) * DETAIL);
  const canvas = h('canvas', {
    class: 'dividers__mark', 'aria-hidden': 'true', width: side ? across : length, height: side ? length : across,
    style: {
      '--from': `${from}%`, '--to': `${to}%`,
      '--inside': `${(MARK.inside / PHOTO.thickness) * 100}%`, '--across': `${((MARK.inside + MARK.outside) / PHOTO.thickness) * 100}%`,
    },
  });
  const pen = canvas.getContext('2d');
  // Down the side the words read upwards, so the line runs bottom to top along their right.
  if (side) {
    pen.translate(0, length);
    pen.rotate(-Math.PI / 2);
  }
  swipe(pen, { length, at: (MARK.inside + 1) * DETAIL, weight: MARK.weight * DETAIL, wobble: (key) => seeded(`${label}:mark:${key}`) * 2 - 1 });
  roughen(canvas, random(seeded(`${label}:mark`)), MARKERS[index]);
  return canvas;
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

// A photo of real divider tabs, with each section's name written on one in marker. Tabs past the last section stay blank.
// `ready` settles once it's first drawn, so the page can wait for it before fading in.
export function dividers(tabs, { active, onSelect, hand = HAND }) {
  const shown = tabs.slice(0, MAX_TABS);
  const wide = matchMedia(WIDE);
  const photos = {};
  const canvas = h('canvas', { class: 'dividers__photo', 'aria-hidden': 'true' });
  let current = active;
  let painting = 0;
  let marker;

  async function paint() {
    const ticket = (painting += 1);
    const side = wide.matches;
    // A photo that didn't load gets another go next time, rather than being remembered as broken.
    photos[side] ??= loadImage(side ? PHOTOS.side : PHOTOS.top).catch((error) => {
      delete photos[side];
      throw error;
    });
    const [photo] = await Promise.all([photos[side], handwriting(hand)]);
    if (ticket !== painting) return;
    const width = Math.round(photo.naturalWidth * DETAIL);
    const height = Math.round(photo.naturalHeight * DETAIL);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(photo, 0, 0, width, height);
    const ink = Object.assign(document.createElement('canvas'), { width, height });
    const pen = ink.getContext('2d');
    const [thickness, length] = side ? [width, height] : [height, width];
    shown.forEach((tab, index) => {
      const [from, to, middle] = SLOTS[index];
      const along = (middle / 100) * length;
      const across = ((FACE[0] + FACE[1]) / 2) * thickness;
      const face = (FACE[1] - FACE[0]) * thickness;
      place(pen, scrawl(String(tab.label).slice(0, LONGEST), { hand }), {
        x: side ? across : along, y: side ? along : across, angle: side ? -Math.PI / 2 : 0,
        size: face, length: ((to - from) / 100) * length * ROOM.length, thickness: face * ROOM.thickness,
        wobble: [seeded(`${tab.label}:along`) * 2 - 1, seeded(`${tab.label}:across`) * 2 - 1],
      });
    });
    inkOver(ctx, ink, seeded(shown.map((tab) => tab.label).join()));
  }

  const buttons = shown.map((tab, index) => {
    const [from, to] = SLOTS[index];
    const button = h('button', {
      class: 'dividers__tab', type: 'button', 'aria-pressed': String(tab.value === active), 'aria-label': `${tab.label}, ${plural(tab.count, 'card')}`,
      dataset: { value: tab.value }, style: { '--from': `${from}%`, '--to': `${to}%` },
    });
    button.addEventListener('click', () => onSelect(tab.value));
    return button;
  });

  const sheet = h('div', { class: 'dividers__sheet' }, canvas, buttons);

  function underline() {
    marker?.remove();
    const index = shown.findIndex((tab) => tab.value === current);
    marker = index < 0 ? null : mark(index, shown[index].label, wide.matches);
    if (marker) sheet.append(marker);
  }

  wide.addEventListener('change', () => {
    paint().catch(() => {});
    underline();
  });
  const ready = paint().catch(() => {});
  underline();

  return {
    root: h('nav', { class: 'dividers', 'aria-label': 'Filed under' }, sheet),
    ready,
    select(value) {
      current = value;
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.value === value)));
      underline();
    },
  };
}
