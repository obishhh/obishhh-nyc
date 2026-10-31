import { h } from '../lib/dom.js';

const PHOTO = { src: '/assets/pokedex/pokedex.webp', width: 640, height: 528 };
// What it says when it's pressed, a box at a time.
const SAYS = ['Will be uploading photos of my favourite cards that I have pulled here.', 'No cards here yet.'];

// The Pokédex, on the desk by the deck box, for the cards actually pulled. Nothing's in it yet: a press on it says as
// much, in a game's text box in the middle of the screen. A press anywhere goes on to the next box, then carries on
// with the page; Esc carries on straight away.
export function pokedex() {
  const open = h('button', { class: 'pokedex__open', type: 'button', 'aria-label': 'Pokédex', 'aria-haspopup': 'dialog' });
  const says = h('dialog', { class: 'pokedex-says', 'aria-label': 'Pokédex', 'aria-live': 'polite' });
  const root = h('div', { class: 'pokedex', dataset: { overBinder: '' } },
    h('img', { class: 'pokedex__photo', src: PHOTO.src, alt: '', width: PHOTO.width, height: PHOTO.height, decoding: 'async' }),
    open,
    says,
  );
  let page = 0;
  const show = (at) => {
    page = at;
    says.replaceChildren(h('p', { class: 'pokedex-says__box text-box' }, SAYS[at]));
  };

  // It fades away before it shuts.
  const leave = () => {
    if (!says.open || says.classList.contains('is-leaving')) return;
    says.classList.add('is-leaving');
    says.addEventListener('animationend', function gone(event) {
      if (event.target !== says) return;
      says.removeEventListener('animationend', gone);
      says.classList.remove('is-leaving');
      says.close();
    });
  };
  open.addEventListener('click', () => {
    show(0);
    says.showModal();
  });
  says.addEventListener('click', () => (page < SAYS.length - 1 ? show(page + 1) : leave()));
  says.addEventListener('cancel', (event) => {
    event.preventDefault();
    leave();
  });
  return { root };
}
