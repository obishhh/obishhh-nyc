import { card } from '../../src/components/card.js';
import { cardBack } from '../../src/components/card-back.js';
import { sealed } from '../../src/components/sealed.js';
import { h } from '../../src/lib/dom.js';
import { enableFlip } from '../../src/lib/flip.js';
import { trackPointer } from '../../src/lib/pointer.js';

const VIEWS = [
  { value: 'revealed', label: 'Published' },
  { value: 'sealed', label: 'Draft (sealed)' },
];

// The card exactly as the binder will show it. Click to flip; toggle to see it sealed.
export function preview() {
  const back = cardBack();
  const flip = h('div', { class: 'binder__flip', role: 'button', tabindex: 0, 'aria-pressed': 'false', 'aria-label': 'Flip the preview' });
  const pocket = h('div', { class: 'binder__pocket' }, flip);
  const buttons = VIEWS.map(({ value, label }) =>
    h('button', { class: 'segmented__option', type: 'button', 'aria-pressed': String(value === 'revealed'), dataset: { view: value } }, label));
  const hint = h('p', { class: 'preview__hint' }, 'Click the card to flip it.');
  let view = 'revealed';
  let data = null;

  function render() {
    if (view === 'sealed') {
      pocket.replaceChildren(sealed(data));
    } else {
      flip.replaceChildren(card(data), back);
      if (flip.parentNode !== pocket) pocket.replaceChildren(flip);
    }
    hint.hidden = view === 'sealed';
  }

  function show(next) {
    view = next;
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === next)));
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      show(button.dataset.view);
      render();
    });
  }

  enableFlip(pocket, '.binder__flip');
  trackPointer(pocket, '.card');

  return {
    root: h('div', { class: 'preview' },
      h('div', { class: 'preview__stage' }, pocket),
      h('div', { class: 'segmented', role: 'group', 'aria-label': 'Preview as' }, buttons),
      hint,
    ),
    update(next) {
      data = next;
      render();
    },
    // Face up and unsealed, for a different card.
    reset() {
      show('revealed');
      flip.setAttribute('aria-pressed', 'false');
    },
  };
}
