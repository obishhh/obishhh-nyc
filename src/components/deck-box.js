import { addressFor, deckKey, goodKey, openedIn } from '../lib/addresses.js';
import { h, svg } from '../lib/dom.js';
import { CARD } from './card.js';
import { cardBack } from './card-back.js';
import { HAND, handwriting, INK, random, roughen, scrawl } from '../lib/scrawl.js';
import { seeded } from '../lib/seeded.js';
import { linkTo } from '../lib/urls.js';
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
    // Roughened pixel by pixel once it's written, so it's kept where reading it back is quick.
    const pen = canvas.getContext('2d', { willReadFrequently: true });
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

// How big a card comes up to read: most of the window's height, but never past this many pixels tall.
const READ_HEIGHT = 0.8;
const READ_MOST = 640;
// The room a note's link takes under its raised card: the time, then the box.
const LINK_ROOM = 104;
// When a card went up, in New York time on a 24-hour clock, as it shows under a raised card: just the time.
const clock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
const timeOf = (at) => (at && !Number.isNaN(Date.parse(at)) ? clock.format(new Date(at)) : '');

const keyInUrl = () => openedIn('deck');
const withDeckCard = (key) => addressFor('deck', key);
// A deck card's picture to keep, drawn with its share page (see scripts/share-pages.mjs).
const keepsakeOf = (key) => `/d/${encodeURIComponent(key)}/save.png`;

const SAVE = `<svg class="deck-spread__icon" viewBox="0 0 16 16" aria-hidden="true">
  <path d="M8 2.5v7.5M4.8 7l3.2 3.2L11.2 7M3 12.5h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// The cards, tipped out of the box onto the desk: roughly in rows, but each landed a little off and
// on top of the one before. Tap one and it comes up front and centre to read; tap it there and it's flipped over
// and back; tap anywhere else (or its ✕, or Esc) and it goes back to its spot. Built once, then reused.
function spread(entries, make, title, onClose) {
  const close = h('button', { class: 'deck-spread__close', type: 'button', 'aria-label': 'Put the cards back' }, svg(CLOSE));
  // What comes up with a raised card: Save and its ✕ side by side at its bottom right corner, and under it the time
  // it went up. They show when they're ready (`is-ready`) and a card is up, and arrive together as it lands.
  const lower = h('button', { class: 'deck-spread__close deck-spread__tool deck-spread__lower is-ready', type: 'button', 'aria-label': 'Put this card down' }, svg(CLOSE));
  const stamp = h('p', { class: 'deck-spread__tool deck-spread__time' });
  const save = h('button', { class: 'deck-spread__close deck-spread__tool deck-spread__save', type: 'button', 'aria-label': 'Save this card', title: 'Save this card' }, svg(SAVE));
  // A note's link, under it in a battle's text box: a wild link appears, and a tap goes to it.
  const site = h('b');
  const go = h('a', { class: 'deck-spread__tool deck-spread__go', target: '_blank', rel: 'noopener noreferrer' },
    h('span', {}, 'A wild link appeared!'),
    h('span', { class: 'deck-spread__go-to' }, 'Go to', site),
  );
  const dialog = h('dialog', { class: 'deck-spread', 'aria-labelledby': 'deck-spread-title', tabindex: -1 },
    h('header', { class: 'deck-spread__bar' },
      h('div', { class: 'deck-spread__heading' },
        h('h2', { class: 'deck-spread__title', id: 'deck-spread-title' }, title),
        h('p', { class: 'deck-spread__order' }, 'Newest first'),
      ),
      close,
    ),
    h('ol', { class: 'deck-spread__cards' },
      entries.map((entry, index) => {
        const toss = (key, most) => ((seeded(`${entry.id ?? index}:${key}`) * 2 - 1) * most).toFixed(1);
        return h('li', {
          class: 'deck-spread__card', tabindex: 0, dataset: { time: timeOf(entry.at), key: deckKey(entry), link: linkTo(entry.link)?.href ?? '' },
          style: {
            '--tilt': `${toss('tilt', SCATTER.tilt)}deg`, '--dx': `${toss('x', SCATTER.x)}px`, '--dy': `${toss('y', SCATTER.y)}px`,
            '--side': index % 2 ? '1' : '-1', '--index': String(index),
          },
        }, h('div', { class: 'deck-spread__flip' }, h('div', { class: 'deck-spread__turn' }, make(entry), cardBack())));
      }),
    ),
    stamp,
    save,
    lower,
    go,
  );
  let openedAt = 0;
  let pressedOnDesk = false;
  let byKey = false;
  // A link's card is raised once it has landed; anything else that happens first calls that off.
  let landing = 0;

  // A quick put-away, then shut. Esc goes the same way. `withKey`: put away from the keyboard, so focus goes back to
  // the box for the next key; put away with a pointer, it doesn't, or the box would show focused and stay fanned up.
  function putBack({ withKey = false } = {}) {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    landing += 1;
    byKey = withKey;
    dialog.classList.add('is-closing');
    setTimeout(() => dialog.close(), reducedMotion.matches ? 0 : PUT_BACK);
  }

  const onDesk = (target) => !target.closest('.deck-spread__card, .deck-spread__bar');
  // A click with no pointer behind it (detail 0) came from Enter or Space.
  close.addEventListener('click', (event) => putBack({ withKey: event.detail === 0 }));
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (front) lowerCard();
    else putBack({ withKey: true });
  });
  // Only a press and release both on the desk put the cards back, so dragging across a caption doesn't.
  dialog.addEventListener('pointerdown', (event) => (pressedOnDesk = onDesk(event.target)));
  // Up front and centre, big enough to read: the card slides from its spot to the middle of the window and grows,
  // the rest of the desk dims, and its Save and ✕ come up at its corner. The desk stops scrolling while it's up.
  let front = null;
  const cards = () => [...dialog.querySelectorAll('.deck-spread__card')];
  function raise(card) {
    landing += 1;
    if (front && front !== card) lowerCard({ instantly: true });
    // Still tipping out (tapped as it lands): it's landed now, or the tip-out would hold it down until it ended.
    card.getAnimations().forEach((animation) => animation.animationName === 'tip-out' && animation.finish());
    dialog.querySelector('.is-picked')?.classList.remove('is-picked');
    card.classList.add('is-picked');
    front = card;
    // The desk stops scrolling first, so the card's measured where the desk will hold still.
    dialog.classList.add('has-front');
    place();
    card.classList.add('is-front');
    // The rest of the desk is out of reach while a card's up, so Tab goes from the card to its ✕, Save and link.
    cards().forEach((each) => (each.inert = each !== card));
    stamp.textContent = card.dataset.time;
    stamp.classList.toggle('is-ready', Boolean(card.dataset.time));
    const linked = linkTo(card.dataset.link);
    go.classList.toggle('is-ready', Boolean(linked));
    if (linked) {
      go.href = linked.href;
      site.textContent = linked.site;
    } else go.removeAttribute('href');
    if (goodKey(card.dataset.key)) history.replaceState(history.state, '', withDeckCard(card.dataset.key));
    offerSave(card);
  }

  // Save is for a card whose picture is there to save: one published since the pictures were last drawn has none yet.
  // Which ones do is asked as the deck opens, so Save comes up with the card. On a phone the picture itself is fetched
  // as its card goes up, so a tap on Save can share it at once: a phone only shares right after a tap. A computer just
  // downloads it, so it's fetched then.
  const saveable = new Map();
  const asked = new Map();
  const files = new Map();
  const sharing = () => matchMedia('(pointer: coarse)').matches && 'share' in navigator;
  const ask = (key) => {
    if (!asked.has(key)) {
      asked.set(key, fetch(keepsakeOf(key), { method: 'HEAD' })
        .then((response) => response.ok, () => false)
        .then((ok) => {
          saveable.set(key, ok);
          return ok;
        }));
    }
    return asked.get(key);
  };
  function fileOf(key) {
    if (!files.has(key)) {
      files.set(key, fetch(keepsakeOf(key))
        .then((response) => (response.ok ? response.blob() : null))
        .then((blob) => (blob?.type.startsWith('image/') ? new File([blob], `obishhh-${key}.png`, { type: 'image/png' }) : null))
        .catch(() => null)
        .then((file) => {
          if (file) files.set(key, file);
          else files.delete(key);
          return file;
        }));
    }
    return files.get(key);
  }
  function offerSave(card) {
    const key = card.dataset.key;
    save.classList.toggle('is-ready', saveable.get(key) === true);
    ask(key).then((ok) => {
      if (front !== card) return;
      save.classList.toggle('is-ready', ok);
      if (ok && sharing()) fileOf(key);
    });
  }

  // Where the raised card goes: worked out from its spot as laid out, without its tilt or nudge.
  function place() {
    if (!front || !dialog.open) return;
    // Read from the layout, which leaves out its tilt and nudge, and any hover lift still on its way.
    const spot = {
      left: front.offsetLeft - dialog.scrollLeft,
      top: front.offsetTop - dialog.scrollTop,
      width: front.offsetWidth,
      height: front.offsetHeight,
    };
    // The middle of the desk as shown: the dialog's own box, without any scrollbar. A note with a link needs room
    // under it for the link: it's kept clear of the window's foot, the card going up only as far as it has to.
    const [wide, tall] = [dialog.clientWidth, dialog.clientHeight];
    const room = front.dataset.link ? LINK_ROOM : 0;
    const scale = Math.min(Math.min(tall * READ_HEIGHT, READ_MOST, tall - 16 - room) / spot.height, (wide * 0.92) / spot.width);
    const middle = tall / 2 - Math.max(0, (spot.height * scale) / 2 + room + 8 - tall / 2);
    const [x, y] = [wide / 2 - (spot.left + spot.width / 2), middle - (spot.top + spot.height / 2)];
    front.style.setProperty('--front-x', `${x.toFixed(1)}px`);
    front.style.setProperty('--front-y', `${y.toFixed(1)}px`);
    front.style.setProperty('--front-scale', scale.toFixed(3));
    // The ✕ on the raised card's bottom right corner, half off it but never off the screen, and Save just left of it.
    const corner = Math.min(wide / 2 + (spot.width * scale) / 2 - 14, wide - 42);
    const bottom = middle + (spot.height * scale) / 2;
    lower.style.setProperty('left', `${corner.toFixed(1)}px`);
    save.style.setProperty('left', `${(corner - 44).toFixed(1)}px`);
    for (const tool of [save, lower]) tool.style.setProperty('top', `${(bottom - 14).toFixed(1)}px`);
    // The time it went up, just under the card.
    stamp.style.setProperty('top', `${(bottom + 12).toFixed(1)}px`);
    stamp.style.setProperty('width', `${wide}px`);
    // The link's box under that, as wide as the card, up to a point.
    const box = Math.min(spot.width * scale, 340);
    go.style.setProperty('left', `${((wide - box) / 2).toFixed(1)}px`);
    go.style.setProperty('top', `${(bottom + 36).toFixed(1)}px`);
    go.style.setProperty('width', `${box.toFixed(1)}px`);
  }

  // Back to its spot on the desk. It stays on top of the pile until it's landed.
  function lowerCard({ instantly = false } = {}) {
    if (!front) return;
    const card = front;
    front = null;
    if (instantly) card.style.setProperty('transition', 'none');
    card.classList.remove('is-front');
    dialog.classList.remove('has-front');
    cards().forEach((each) => (each.inert = false));
    save.classList.remove('is-ready');
    if (keyInUrl()) history.replaceState(history.state, '', withDeckCard(null));
    if (instantly) requestAnimationFrame(() => card.style.removeProperty('transition'));
  }
  lower.addEventListener('click', (event) => {
    event.stopPropagation();
    const card = front;
    lowerCard();
    if (event.detail === 0) card?.focus({ preventScroll: true });
  });
  addEventListener('resize', place);

  // On a phone, the share sheet, where Save Image puts it in Photos; elsewhere, or if sharing won't, a download.
  function download(file) {
    const link = h('a', { href: URL.createObjectURL(file), download: file.name });
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  save.addEventListener('click', async (event) => {
    event.stopPropagation();
    const key = front?.dataset.key;
    if (!key) return;
    const fetched = files.get(key);
    // Usually here already; if not, waited for, and a phone that won't share by then gets a download instead.
    const file = fetched instanceof File ? fetched : await fileOf(key);
    if (!file) return;
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
      // Cancelling the sheet is fine; anything else falls back to a download.
      navigator.share({ files: [file] }).catch((error) => error.name === 'AbortError' || download(file));
      return;
    }
    download(file);
  });

  // Turned over to its back and straight over again, the way you'd flip a card to check it.
  function flipOver(card) {
    const turn = card.querySelector('.deck-spread__turn');
    if (reducedMotion.matches || turn.getAnimations().length) return;
    const way = Math.random() < 0.5 ? 1 : -1;
    turn.animate(FLIP_OVER.map(({ transform, offset }) => ({ offset, transform: transform.replace(/(\d+)deg/, (_, deg) => `${deg * way}deg`) })), {
      duration: 860, easing: 'cubic-bezier(0.45, 0, 0.2, 1)',
    });
  }

  const tap = (card) => (card === front ? flipOver(card) : raise(card));
  dialog.addEventListener('click', (event) => {
    const card = event.target.closest('.deck-spread__card');
    // With a card up, a tap on it turns it over; a tap anywhere else (another card, the desk) puts it down.
    if (front) {
      if (card === front) flipOver(card);
      else if (!event.target.closest('.deck-spread__bar')) lowerCard();
      return;
    }
    if (card) tap(card);
    else if (pressedOnDesk && onDesk(event.target) && performance.now() - openedAt > SETTLE) putBack();
  });
  dialog.addEventListener('keydown', (event) => {
    const card = event.target.closest('.deck-spread__card');
    if (!card || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    if (front && card !== front) lowerCard();
    tap(card);
  });
  // However it shuts (put away, or closed from outside, like going Forward to an article), it's left tidy.
  dialog.addEventListener('close', () => {
    landing += 1;
    dialog.classList.remove('is-closing');
    lowerCard({ instantly: true });
    dialog.querySelector('.is-picked')?.classList.remove('is-picked');
    onClose({ byKey });
    byKey = false;
  });
  // A tap on a note's link opens it, and the card stays up.
  go.addEventListener('click', (event) => event.stopPropagation());

  return {
    // Open on one card, raised: for a link to it. A card that's no longer in the deck just opens the deck.
    openOn(key) {
      this.open();
      const card = [...dialog.querySelectorAll('.deck-spread__card')].find((each) => each.dataset.key === key);
      if (!card) return history.replaceState(history.state, '', withDeckCard(null));
      card.scrollIntoView({ block: 'center' });
      const ticket = (landing += 1);
      const tipping = card.getAnimations().find((animation) => animation.animationName === 'tip-out');
      (tipping?.finished ?? Promise.resolve()).catch(() => {}).then(() => ticket === landing && dialog.open && !front && raise(card));
    },
    open() {
      if (dialog.open) return;
      if (!dialog.isConnected) document.body.append(dialog);
      dialog.showModal();
      // The dialog takes focus itself, rather than handing it to the close button: Safari rings a button focused
      // that way as if it had been tabbed to. Tab still goes straight to it.
      dialog.focus({ preventScroll: true });
      openedAt = performance.now();
      // Asked again for any that had no picture last time: the pictures are drawn a few times an hour.
      cards().forEach((card) => {
        if (saveable.get(card.dataset.key) === false) asked.delete(card.dataset.key);
        ask(card.dataset.key);
      });
    },
  };
}

// How many of the newest cards stand in the box.
const PEEKING = 5;
const between = (next, low, high) => low + next() * (high - low);

// Up out of the box: each card to its own side, height and angle, at its own pace, and differently every time it's
// gone for, so it never fans the same way twice.
function fanOut(peeks, next) {
  const sides = peeks.map((_, at) => Math.ceil(at / 2) * (at % 2 ? 1 : -1));
  for (let at = sides.length - 1; at > 0; at -= 1) {
    const other = Math.floor(next() * (at + 1));
    [sides[at], sides[other]] = [sides[other], sides[at]];
  }
  peeks.forEach((peek, at) => {
    const lean = sides[at] + between(next, -0.8, 0.8);
    // The newest, in front, always comes well up; the rest anywhere from barely to as high.
    const rise = at ? between(next, 14, 50) : between(next, 36, 50);
    peek.style.setProperty('--up-x', `${(lean * 11 + between(next, -8, 8)).toFixed(1)}%`);
    peek.style.setProperty('--up-y', `${(-rise).toFixed(1)}%`);
    peek.style.setProperty('--up-r', `${(lean * 8 + between(next, -14, 14)).toFixed(1)}deg`);
    peek.style.setProperty('--rise', `${between(next, 0.34, 0.62).toFixed(2)}s`);
    peek.style.setProperty('--wait', `${between(next, 0, 0.1).toFixed(2)}s`);
  });
}

// A photo of a real deck box, cut out and stuck on a block of colour, with the newest cards tucked inside.
// Open it to tip the cards out.
export function deckBox(entries, { make, label: text = 'notes', title = 'The Deck' }) {
  const open = h('button', {
    class: 'deck-box__open', type: 'button', 'aria-haspopup': 'dialog',
    'aria-label': `Open the deck box: ${plural(entries.length, 'card')}`,
  });
  // The newest few, the newest in front. The ones behind stand to either side of it in turn, further out the
  // further back they are, so each shows over a shoulder. Only the front one is drawn straight away; the rest are
  // drawn when the page is idle, or as soon as someone goes for the box.
  const peeks = entries.slice(0, PEEKING).map((entry, behind) => {
    // Standing in the box, each a little askew its own way.
    const settle = random(seeded(`peek:${entry.id ?? behind}`));
    const lean = Math.ceil(behind / 2) * (behind % 2 ? 1 : -1);
    return h('span', {
      class: 'deck-box__peek', 'aria-hidden': 'true', inert: true,
      style: {
        width: `${PEEK * 100}%`, '--behind': String(behind),
        '--rest-x': `${(lean * 4 + between(settle, -2, 2)).toFixed(1)}%`,
        '--rest-r': `${(-3 + lean * 3 + between(settle, -2.5, 2.5)).toFixed(1)}deg`,
      },
    }, behind === 0 && make(entry));
  });
  fanOut(peeks, random(seeded(`fan:${entries[0]?.id}`)));
  let filled = peeks.length < 2;
  const fillPeeks = () => {
    if (filled) return;
    filled = true;
    peeks.slice(1).forEach((peek, index) => peek.append(make(entries[index + 1])));
  };
  const box = h('div', { class: 'deck-box' },
    [...peeks].reverse(),
    h('img', { class: 'deck-box__front', src: PHOTO.src, alt: '', width: PHOTO.width, height: PHOTO.height, decoding: 'async' }),
    label(text),
    open,
  );
  // The peeking cards are real ones, shrunk to fit the box whatever size it's drawn at.
  new ResizeObserver(([entry]) => {
    box.style.setProperty('--peek-scale', ((entry.contentRect.width * PEEK) / CARD.width).toFixed(4));
  }).observe(box);

  // The deck's cards are made while nothing else is happening, a few at a time (a note's handwriting is the slow
  // part), and then the spread's laid out from them, so opening the box is instant and no one moment pays for it all.
  const made = new Map();
  const madeFor = (entry) => made.get(entry) ?? make(entry);
  let view;
  const ready = () => {
    fillPeeks();
    return (view ??= spread(entries, madeFor, title, ({ byKey }) => {
      // The dialog hands focus back to the box on its own as it shuts; keep it only for the keyboard.
      if (byKey) open.focus({ preventScroll: true });
      else open.blur();
    }));
  };
  box.addEventListener('pointerenter', fillPeeks, { once: true });
  open.addEventListener('focus', fillPeeks, { once: true });
  box.addEventListener('pointerenter', () => fanOut(peeks, Math.random));
  open.addEventListener('focus', () => fanOut(peeks, Math.random));
  const idle = (work) => ('requestIdleCallback' in window
    ? requestIdleCallback(work, { timeout: 2000 })
    : setTimeout(() => work({ timeRemaining: () => 0 }), 300));
  const prepare = (deadline) => {
    if (view) return;
    for (const entry of entries) {
      if (made.has(entry)) continue;
      // At least one a time, and more while the moment lasts.
      if (made.size && deadline.timeRemaining() < 8) return idle(prepare);
      made.set(entry, make(entry));
    }
    ready();
  };
  idle(prepare);
  open.addEventListener('click', () => ready().open());
  return {
    root: box,
    // A link straight to one card (?deck=001-100): open the deck on it.
    openLinked() {
      const key = keyInUrl();
      if (key) ready().openOn(key);
    },
  };
}
