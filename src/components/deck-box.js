import { h, svg } from '../lib/dom.js';
import { cardBack } from './card-back.js';
import { HAND, handwriting, INK, random, roughen, scrawl } from '../lib/scrawl.js';
import { seeded } from '../lib/seeded.js';
import { plural } from '../lib/words.js';

// How far each card lands from its spot when tipped out: tilt in degrees, shift in px.
const SCATTER = { tilt: 6, x: 12, y: 10 };
// The photo of the box, cut out of its background.
const PHOTO = { src: '/assets/deck/box-front.webp', width: 688, height: 860 };
// The label on the lid's front, in the photo's pixels: its middle, the face's slant, and how much room it has.
const LABEL = { x: 425, y: 283, angle: -15.5, length: 300, thickness: 120 };
// The patch of the photo the label is drawn on: room for the label and its slant, and no more.
const LABEL_AREA = { left: 255, top: 160, width: 340, height: 250 };
// How wide the card peeking out of the box is, as a share of the box.
const PEEK = 0.46;
// A click this soon after opening is the tail of a double-click, not a click on the desk.
const SETTLE = 350;
const PUT_BACK = 180;
// Turned over to its back and straight over again, the way you'd flip a card to check it.
const FLIP_OVER = [
  { transform: 'rotateY(0deg)' },
  { transform: 'rotateY(180deg)', offset: 0.42 },
  { transform: 'rotateY(180deg)', offset: 0.55 },
  { transform: 'rotateY(360deg)' },
];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const percent = (part, whole) => `${((part / whole) * 100).toFixed(3)}%`;

const CLOSE = `<svg class="deck-spread__icon" viewBox="0 0 16 16" aria-hidden="true">
  <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

// Writes on the lid's front in marker, slanted with the face so it sits on the plastic.
function label(text) {
  const canvas = h('canvas', {
    class: 'deck-box__ink', width: LABEL_AREA.width, height: LABEL_AREA.height, 'aria-hidden': 'true',
    style: {
      left: percent(LABEL_AREA.left, PHOTO.width), top: percent(LABEL_AREA.top, PHOTO.height),
      width: percent(LABEL_AREA.width, PHOTO.width), height: percent(LABEL_AREA.height, PHOTO.height),
    },
  });
  handwriting().then(() => {
    const pen = canvas.getContext('2d');
    const word = scrawl(text, { hand: HAND });
    const scale = Math.min(LABEL.length / word.width, LABEL.thickness / word.height);
    const angle = (LABEL.angle * Math.PI) / 180;
    pen.translate(LABEL.x - LABEL_AREA.left, LABEL.y - LABEL_AREA.top);
    // Runs along the face's slant while its uprights stay upright, the way the box's edges do.
    pen.transform(Math.cos(angle), Math.sin(angle), 0, 1, 0, 0);
    pen.drawImage(word, (-word.width * scale) / 2, (-word.height * scale) / 2, word.width * scale, word.height * scale);
    pen.setTransform(1, 0, 0, 1, 0, 0);
    roughen(canvas, random(seeded(`box:${text}`)), INK);
  });
  return canvas;
}

// The cards, tipped out of the box onto the desk: roughly in rows, but each landed a little off and
// on top of the one before. Tap one and it comes to the top and gets flipped over and back. Built once, then reused.
function spread(entries, make, title, onClose) {
  const close = h('button', { class: 'deck-spread__close', type: 'button', 'aria-label': 'Put the cards back' }, svg(CLOSE));
  const dialog = h('dialog', { class: 'deck-spread', 'aria-labelledby': 'deck-spread-title' },
    h('header', { class: 'deck-spread__bar' },
      h('h2', { class: 'deck-spread__title', id: 'deck-spread-title' }, title),
      h('p', { class: 'deck-spread__count' }, 'Newest first'),
      close,
    ),
    h('ol', { class: 'deck-spread__cards' },
      entries.map((entry, index) => {
        const toss = (key, most) => ((seeded(`${entry.id ?? index}:${key}`) * 2 - 1) * most).toFixed(1);
        return h('li', {
          class: 'deck-spread__card', tabindex: 0,
          style: {
            '--tilt': `${toss('tilt', SCATTER.tilt)}deg`, '--dx': `${toss('x', SCATTER.x)}px`, '--dy': `${toss('y', SCATTER.y)}px`,
            '--side': index % 2 ? '1' : '-1', '--index': String(index),
          },
        }, h('div', { class: 'deck-spread__flip' }, h('div', { class: 'deck-spread__turn' }, make(entry), cardBack())));
      }),
    ),
  );
  let openedAt = 0;
  let pressedOnDesk = false;

  // A quick put-away, then shut. Esc goes the same way.
  function putBack() {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    dialog.classList.add('is-closing');
    setTimeout(() => {
      dialog.classList.remove('is-closing');
      dialog.querySelector('.is-picked')?.classList.remove('is-picked');
      dialog.close();
    }, reducedMotion.matches ? 0 : PUT_BACK);
  }

  const onDesk = (target) => !target.closest('.deck-spread__card, .deck-spread__bar');
  close.addEventListener('click', putBack);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    putBack();
  });
  // Only a press and release both on the desk put the cards back, so dragging across a caption doesn't.
  dialog.addEventListener('pointerdown', (event) => (pressedOnDesk = onDesk(event.target)));
  // To the top of the pile, so one half under another can be read, and a flip over and back for fun.
  function pick(card) {
    dialog.querySelector('.is-picked')?.classList.remove('is-picked');
    card.classList.add('is-picked');
    const turn = card.querySelector('.deck-spread__turn');
    if (reducedMotion.matches || turn.getAnimations().length) return;
    const way = Math.random() < 0.5 ? 1 : -1;
    turn.animate(FLIP_OVER.map(({ transform, offset }) => ({ offset, transform: transform.replace(/(\d+)deg/, (_, deg) => `${deg * way}deg`) })), {
      duration: 860, easing: 'cubic-bezier(0.45, 0, 0.2, 1)',
    });
  }

  dialog.addEventListener('click', (event) => {
    const card = event.target.closest('.deck-spread__card');
    if (card) pick(card);
    else if (pressedOnDesk && onDesk(event.target) && performance.now() - openedAt > SETTLE) putBack();
  });
  dialog.addEventListener('keydown', (event) => {
    const card = event.target.closest('.deck-spread__card');
    if (!card || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    pick(card);
  });
  dialog.addEventListener('close', onClose);

  return {
    open() {
      if (dialog.open) return;
      if (!dialog.isConnected) document.body.append(dialog);
      dialog.showModal();
      openedAt = performance.now();
    },
  };
}

// A photo of a real deck box, cut out and stuck on a block of colour, with the newest card tucked inside.
// Open it to tip the cards out.
export function deckBox(entries, { make, label: text = 'notes', title = 'The Deck' }) {
  const open = h('button', {
    class: 'deck-box__open', type: 'button', 'aria-haspopup': 'dialog',
    'aria-label': `Open the deck box: ${plural(entries.length, 'card')}`,
  });
  const box = h('div', { class: 'deck-box' },
    h('span', { class: 'deck-box__peek', 'aria-hidden': 'true', inert: true, style: { width: `${PEEK * 100}%` } }, make(entries[0])),
    h('img', { class: 'deck-box__front', src: PHOTO.src, alt: '', width: PHOTO.width, height: PHOTO.height, decoding: 'async' }),
    label(text),
    open,
  );
  // The peeking card is a real one, shrunk to fit the box whatever size it's drawn at.
  new ResizeObserver(([entry]) => {
    box.style.setProperty('--peek-scale', ((entry.contentRect.width * PEEK) / 252).toFixed(4));
  }).observe(box);

  // Lay the spread out while nothing else is happening, so opening the box is instant.
  let view;
  const ready = () => (view ??= spread(entries, make, title, () => open.focus({ preventScroll: true })));
  if ('requestIdleCallback' in window) requestIdleCallback(ready, { timeout: 2000 });
  else setTimeout(ready, 1200);
  open.addEventListener('click', () => ready().open());
  return box;
}
