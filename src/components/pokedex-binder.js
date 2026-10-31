import { CLOSE } from '../lib/glyphs.js';
import { h, svg } from '../lib/dom.js';
import { photo, turnOf } from '../lib/looks.js';
import { reducedMotion } from '../lib/screens.js';
import { jitter, seeded } from '../lib/seeded.js';
import { safeImage } from '../lib/urls.js';

const POCKETS = 9;
// How crooked a photo sits in its pocket, and how far down it's slipped, at most.
const MAX_TILT = 1.6;
const MAX_DROP = 2.5;
// And how far it rises out under a pointer (pokedex-binder.css).
const LIFT = 5;
// How it sits when it's out.
const OUT_TILT = -1.5;
// Two pages side by side from here up; one at a time below.
const SPREAD = '(min-width: 820px)';
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

// Its Pokémon's number in the Pokédex, the way the games write it; a pocket with nothing in it yet has none.
const numbered = (dex) => `No. ${dex ? String(dex).padStart(3, '0') : '---'}`;
// What finds this exact print: its set and its number in it.
const printOf = ({ set, number }) => [set, number].filter(Boolean).join(' · ');

// How a card's photo sits in its sleeve: a little crooked, a little low, the same every time.
const lean = (id = '') => ({ '--tilt': `${(jitter(id) * MAX_TILT).toFixed(2)}deg`, '--drop': `${(seeded(`${id}drop`) * MAX_DROP).toFixed(2)}%` });

// A photo turned back to stand its card up straight: about the middle, and grown just enough that no corner of the
// frame shows past it (a card's taller than it's wide, so that's the turn's share of its height).
function straightened(turn) {
  const angle = turnOf(turn);
  if (!angle) return null;
  const radians = (Math.abs(angle) * Math.PI) / 180;
  return { transform: `rotate(${angle}deg) scale(${(Math.cos(radians) + (Math.sin(radians) * 352) / 252).toFixed(3)})` };
}

// A photo of a pulled card, cut to a card's shape. `loading` as for an <img>.
export function pullPhoto({ name, set, number, photo: shot = {} }, { loading, ...props } = {}) {
  const src = safeImage(shot.src);
  const alt = [name, set, number].filter(Boolean).join(' ');
  return h('figure', { class: 'pull', ...props },
    src && h('span', { class: 'pull__turn', style: straightened(shot.turn) }, photo(src, { alt, position: shot.position, zoom: shot.zoom, loading })));
}

// The photo in a clear sleeve of its own, as it is once it's pulled out of its pocket.
export const pullSleeve = (entry, props = {}) => h('div', { class: 'dex-sleeve', ...props, style: { ...lean(entry.id), ...props.style } }, pullPhoto(entry));

// Its entry: its Pokémon's number, what it is, and why it's in here.
export function pullAbout(entry) {
  const print = printOf(entry);
  return h('div', { class: 'dex-about' },
    entry.dex && h('p', { class: 'dex-about__no' }, numbered(entry.dex)),
    h('h2', { class: 'dex-about__name' }, entry.name || '?????'),
    h('dl', { class: 'dex-about__facts' },
      print && h('div', {}, h('dt', {}, 'Card'), h('dd', {}, print)),
    ),
    entry.note && h('p', { class: 'dex-about__note text-box' }, entry.note),
  );
}

// A pocket: a card's photo to press, or one still to fill. Photos wait to be fetched until the binder's opened (or about
// to be), as most visits never open it.
function pocket(entry, onOpen) {
  if (!entry) return h('li', { class: 'dex__pocket is-empty', 'aria-hidden': 'true' }, numbered());
  const pull = h('button', {
    class: 'dex__pull',
    type: 'button',
    'aria-label': [entry.name, printOf(entry)].filter(Boolean).join(', ') || 'A card',
    style: lean(entry.id),
  }, pullPhoto(entry, { loading: 'lazy' }));
  pull.addEventListener('click', () => onOpen(entry, pull));
  return h('li', { class: 'dex__pocket' }, pull);
}

// The Pokédex's own binder: pages of nine pockets with the real cards' photos in, the rest still to fill. Two pages at
// a time on a wide screen, one on a phone; swipe, scroll or use the arrows to turn. A photo pressed comes out of its
// pocket in a sleeve, with its entry beside it, and goes back in when it's let go.
export function pokedexBinder(entries, { onClose }) {
  const used = Math.max(1, Math.ceil(entries.length / POCKETS));
  // Always a whole spread: a page past what's filled shows on a wide screen only. Each is a loose sheet, punched to go
  // in a binder; its shadow's on a wrapper, as the holes would cut it off the sheet itself.
  const pages = Array.from({ length: used + (used % 2) }, (_, page) =>
    h('div', { class: `dex__sheet${page >= used ? ' is-spare' : ''}` },
      h('ol', { class: 'dex__page', 'aria-label': `Page ${page + 1}` },
        Array.from({ length: POCKETS }, (__, slot) => pocket(entries[page * POCKETS + slot], show)))));
  const strip = h('div', { class: 'dex__pages' }, pages);
  const back = h('button', { class: 'dex__turn', type: 'button', 'aria-label': 'Previous page' }, '◀');
  const next = h('button', { class: 'dex__turn', type: 'button', 'aria-label': 'Next page' }, '▶');
  const where = h('span', { class: 'dex__where', 'aria-live': 'polite' });
  const turns = h('nav', { class: 'dex__turns', 'aria-label': 'Pages' }, back, where, next);
  const close = h('button', { class: 'dex__close', type: 'button', 'aria-label': 'Close' }, svg(CLOSE));
  const root = h('div', { class: 'dex' },
    h('header', { class: 'dex__top' }, h('span', {}, 'POKéDEX'), close),
    strip,
    turns,
  );
  const spread = matchMedia(SPREAD);
  let out = null;
  // The view a turn is on its way to, so a second press while it's going goes on from there.
  let heading = null;

  // Where the pages are: how far one view of them is, which is showing, and how many there are.
  function views() {
    const each = pages[0].offsetWidth + parseFloat(getComputedStyle(strip).columnGap);
    const across = spread.matches ? 2 : 1;
    const count = Math.ceil((spread.matches ? pages.length : used) / across);
    return { width: each * across, at: Math.round(strip.scrollLeft / (each * across)), count };
  }
  function showWhere() {
    const { at, count } = views();
    if (at === heading) heading = null;
    turns.hidden = count < 2;
    where.textContent = `${at + 1} / ${count}`;
    // Marked rather than disabled at the ends, so one that's pressed keeps the focus, and the arrow keys with it.
    back.setAttribute('aria-disabled', String(at === 0));
    next.setAttribute('aria-disabled', String(at === count - 1));
  }
  function turn(by) {
    const { width, at, count } = views();
    heading = Math.min(count - 1, Math.max(0, (heading ?? at) + by));
    strip.scrollTo({ left: heading * width, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
  let frame;
  strip.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(showWhere);
  });
  strip.addEventListener('scrollend', () => (heading = null));
  spread.addEventListener('change', showWhere);
  back.addEventListener('click', () => turn(-1));
  next.addEventListener('click', () => turn(1));
  close.addEventListener('click', onClose);
  root.addEventListener('keydown', (event) => {
    const by = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!by || out) return;
    event.preventDefault();
    turn(by);
  });

  // The sleeve that's out, moved and sized back over the pocket it came from.
  function inPocket(pull, sleeve) {
    const pocket = pull.closest('.dex__pocket');
    const from = pocket.getBoundingClientRect();
    const to = sleeve.getBoundingClientRect();
    const x = from.left + from.width / 2 - (to.left + to.width / 2);
    const y = from.top + from.height / 2 - (to.top + to.height / 2);
    return `translate(${x}px, ${y}px) scale(${pocket.offsetWidth / sleeve.offsetWidth})`;
  }

  function show(entry, pull) {
    if (out) return;
    const sleeve = pullSleeve(entry, { class: 'dex-sleeve dex-entry__sleeve', style: { transform: `rotate(${OUT_TILT}deg)` } });
    const about = pullAbout(entry);
    const veil = h('div', { class: 'dex-entry__veil' });
    const letGo = h('button', { class: 'dex__close dex-entry__close', type: 'button', 'aria-label': 'Put it back' }, svg(CLOSE));
    const layer = h('div', { class: 'dex-entry', role: 'group', 'aria-label': entry.name || 'A card' },
      veil, h('div', { class: 'dex-entry__body' }, sleeve, about), letGo);
    // Anywhere but its words puts it back: they're there to be read, and copied.
    layer.addEventListener('click', (event) => event.target.closest('.dex-about') || hide());
    // Risen a touch under a pointer, the photo comes out from there rather than from where it rests.
    const lifted = matchMedia('(hover: hover)').matches && pull.matches(':hover');
    const drop = parseFloat(pull.style.getPropertyValue('--drop')) || 0;
    root.after(layer);
    // The binder behind can't be reached while it's out, by Tab or anything else.
    root.inert = true;
    pull.classList.add('is-out');
    out = { pull, layer, sleeve, about, veil };
    letGo.focus({ preventScroll: true });
    if (reducedMotion.matches) return;
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
    sleeve.animate([{ transform: inPocket(pull, sleeve) }, { transform: `rotate(${OUT_TILT}deg)` }], { duration: 420, easing: EASE });
    if (lifted) sleeve.firstChild.animate([{ translate: `0 ${drop - LIFT}%` }, { translate: `0 ${drop}%` }], { duration: 420, easing: EASE });
    about.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 140, easing: 'ease-out', fill: 'backwards' });
  }

  // Straight back in, with no flight: once it's landed, or when the Pokédex is shut with it still out.
  function putBack() {
    if (!out) return;
    out.layer.remove();
    out.pull.classList.remove('is-out');
    root.inert = false;
    out = null;
  }

  function hide() {
    if (!out || out.leaving) return;
    out.leaving = true;
    const { pull, sleeve, about, veil } = out;
    const done = () => {
      putBack();
      pull.focus({ preventScroll: true });
    };
    if (reducedMotion.matches) return done();
    // From wherever it's got to, even partway out: it's caught there before it's measured.
    const now = { sleeve: getComputedStyle(sleeve).transform, about: getComputedStyle(about).opacity, veil: getComputedStyle(veil).opacity };
    [sleeve, sleeve.firstChild, about, veil].forEach((part) => part.getAnimations().forEach((animation) => animation.cancel()));
    const options = { duration: 320, easing: EASE, fill: 'forwards' };
    about.animate([{ opacity: now.about }, { opacity: 0 }], { ...options, duration: 120 });
    veil.animate([{ opacity: now.veil }, { opacity: 0 }], options);
    sleeve.animate([{ transform: now.sleeve }, { transform: inPocket(pull, sleeve) }], options).finished.then(done, () => {});
  }

  return {
    root,
    // About to be shown: its photos are asked for.
    warm() {
      root.querySelectorAll('img[loading="lazy"]').forEach((image) => (image.loading = 'eager'));
    },
    // When it's shown: back to the first pages.
    opened() {
      heading = null;
      strip.scrollLeft = 0;
      showWhere();
    },
    // Shut: anything out goes straight back in.
    closed: putBack,
    // Esc: a photo that's out goes back first. Whether there was one.
    back() {
      if (!out) return false;
      hide();
      return true;
    },
  };
}
