import { h, svg } from '../lib/dom.js';
import { INK, random, roughen, scrawl } from '../lib/scrawl.js';
import { seeded } from '../lib/seeded.js';

// How far each card lands from its spot when tipped out: tilt in degrees, shift in px.
const SCATTER = { tilt: 6, x: 12, y: 10 };
const HAND = 'Reenie Beanie';
// The photo of the box, cut out of its background.
const PHOTO = { src: '/assets/deck/box-front.webp', width: 688, height: 860 };
// The label on the lid's front, in the photo's pixels: its middle, the face's slant, and how much room it has.
const LABEL = { x: 425, y: 283, angle: -15.5, length: 300, thickness: 120 };
// How wide the card peeking out of the box is, as a share of the box.
const PEEK = 0.46;

const CLOSE = `<svg class="deck-spread__icon" viewBox="0 0 16 16" aria-hidden="true">
  <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

// Writes on the lid's front in marker, slanted with the face so it sits on the plastic.
function writeLabel(canvas, text) {
  const pen = canvas.getContext('2d');
  const word = scrawl(text, { hand: HAND });
  const scale = Math.min(LABEL.length / word.width, LABEL.thickness / word.height);
  const angle = (LABEL.angle * Math.PI) / 180;
  pen.translate(LABEL.x, LABEL.y);
  // Runs along the face's slant while its uprights stay upright, the way the box's edges do.
  pen.transform(Math.cos(angle), Math.sin(angle), 0, 1, 0, 0);
  pen.drawImage(word, (-word.width * scale) / 2, (-word.height * scale) / 2, word.width * scale, word.height * scale);
  pen.setTransform(1, 0, 0, 1, 0, 0);
  roughen(canvas, random(seeded(`box:${text}`)), INK);
}

// The cards, tipped out of the box onto the desk: roughly in rows, but each landed a little off and
// on top of the one before. Hover or tap one to pull it to the front.
function spread(cards, title, onClose) {
  const close = h('button', { class: 'deck-spread__close', type: 'button', 'aria-label': 'Put the cards back' }, svg(CLOSE));
  const dialog = h('dialog', { class: 'deck-spread', 'aria-labelledby': 'deck-spread-title' },
    h('header', { class: 'deck-spread__bar' },
      h('h2', { class: 'deck-spread__title', id: 'deck-spread-title' }, title),
      h('p', { class: 'deck-spread__count' }, `${cards.length} cards, newest first`),
      close,
    ),
    h('ol', { class: 'deck-spread__cards' },
      cards.map((card, index) => {
        const toss = (key, most) => ((seeded(`${index}:${card.getAttribute('aria-label')}:${key}`) * 2 - 1) * most).toFixed(1);
        return h('li', {
          class: 'deck-spread__card',
          style: {
            '--tilt': `${toss('tilt', SCATTER.tilt)}deg`, '--dx': `${toss('x', SCATTER.x)}px`, '--dy': `${toss('y', SCATTER.y)}px`,
            '--side': index % 2 ? '1' : '-1', '--index': String(index),
          },
        }, card);
      }),
    ),
  );
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const picked = event.target.closest('.deck-spread__card');
    // A tap pulls a card to the front, so one half under another can still be read.
    if (picked) {
      dialog.querySelector('.deck-spread__card.is-picked')?.classList.remove('is-picked');
      picked.classList.add('is-picked');
    } else if (!event.target.closest('.deck-spread__bar')) {
      // A click on the desk between the cards puts them back.
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose();
  });
  return dialog;
}

// A photo of a real deck box, cut out and stuck on a block of colour, with the newest card tucked inside.
// Open it to tip the cards out.
export function deckBox(entries, { make, label = 'notes', title = 'Notes' }) {
  const ink = h('canvas', { class: 'deck-box__ink', width: PHOTO.width, height: PHOTO.height, 'aria-hidden': 'true' });
  const box = h('button', { class: 'deck-box', type: 'button', 'aria-haspopup': 'dialog', 'aria-label': `Open the deck box: ${entries.length} cards` },
    h('span', { class: 'deck-box__peek', 'aria-hidden': 'true', inert: true }, make(entries[0])),
    h('img', { class: 'deck-box__front', src: PHOTO.src, alt: '', width: PHOTO.width, height: PHOTO.height, decoding: 'async' }),
    ink,
  );
  // The peeking card is a real one, shrunk to fit the box whatever size it's drawn at.
  new ResizeObserver(([entry]) => {
    box.style.setProperty('--peek-scale', ((entry.contentRect.width * PEEK) / 252).toFixed(4));
  }).observe(box);
  document.fonts.load(`40px "${HAND}"`).then(() => writeLabel(ink, label));
  box.addEventListener('click', () => {
    const view = spread(entries.map(make), title, () => box.focus());
    document.body.append(view);
    view.showModal();
  });
  return box;
}
