import { h, idle } from '../lib/dom.js';
import { pokedexBinder } from './pokedex-binder.js';

const PHOTO = { src: '/assets/pokedex/pokedex.webp', width: 640, height: 528 };
// What it says when it's pressed with nothing in it yet, a box at a time.
const SAYS = ['Will be uploading photos of my favourite cards that I have pulled here.', 'No cards here yet.'];

// The Pokédex, on the desk by the deck box, for the cards actually pulled. Pressed, it opens over everything else gone
// soft: its binder of them, shut again by its ✕, Esc or a press beside it. While it's empty, it's a game's text box
// saying so instead: a press anywhere goes on to the next box, then carries on with the page, and Esc carries on
// straight away. `cards` is the published ones, on their way.
export function pokedex(cards) {
  const open = h('button', { class: 'pokedex__open', type: 'button', 'aria-label': 'Pokédex', 'aria-haspopup': 'dialog' });
  const screen = h('dialog', { class: 'pokedex-screen', 'aria-label': 'Pokédex' });
  const root = h('div', { class: 'pokedex', dataset: { overBinder: '' } },
    h('img', { class: 'pokedex__photo', src: PHOTO.src, alt: '', width: PHOTO.width, height: PHOTO.height, decoding: 'async' }),
    h('span', { class: 'pokedex__light', 'aria-hidden': 'true' }),
    open,
    screen,
  );
  let list = [];
  let binder = null;
  let page = 0;

  // It fades away before it shuts.
  const shut = (event) => event.target === screen && screen.close();
  const leave = () => {
    if (!screen.open || screen.classList.contains('is-leaving')) return;
    screen.classList.add('is-leaving');
    screen.addEventListener('animationend', shut);
  };
  // However it shut (a browser lets only one Esc in a row be held back, so a quick second one shuts it at once), it's
  // left ready to open again.
  screen.addEventListener('close', () => {
    screen.classList.remove('is-leaving');
    screen.removeEventListener('animationend', shut);
    binder?.closed();
  });

  const say = (at) => {
    page = at;
    screen.replaceChildren(h('p', { class: 'pokedex-says text-box' }, SAYS[at]));
  };
  // The binder's made once the page has settled, or when it's first wanted if that's sooner. Its photos are only
  // asked for when it looks like it's about to be opened.
  const make = () => {
    if (!list.length || binder) return;
    binder = pokedexBinder(list, { onClose: leave });
    screen.replaceChildren(binder.root);
  };
  const ready = cards.then((given) => {
    list = given;
    idle(make, 4000);
  }, () => {});
  const warm = () => ready.then(() => {
    make();
    binder?.warm();
  });
  for (const type of ['pointerenter', 'pointerdown', 'focus']) open.addEventListener(type, warm, { once: true });

  open.addEventListener('click', async () => {
    await warm();
    if (binder) screen.removeAttribute('aria-live');
    else {
      say(0);
      screen.setAttribute('aria-live', 'polite');
    }
    screen.showModal();
    binder?.opened();
  });
  // In the binder, only a press beside it shuts it; the messages go on wherever they're pressed.
  screen.addEventListener('click', (event) => {
    if (binder) {
      if (event.target === screen) leave();
    } else if (page < SAYS.length - 1) say(page + 1);
    else leave();
  });
  screen.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (!binder?.back()) leave();
  });
  return { root };
}
