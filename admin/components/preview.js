import { article } from '../../src/components/article.js';
import { card } from '../../src/components/card.js';
import { cardBack } from '../../src/components/card-back.js';
import { sealed } from '../../src/components/sealed.js';
import { h } from '../../src/lib/dom.js';
import { enableFlip } from '../../src/lib/flip.js';
import { trackPointer } from '../../src/lib/pointer.js';

// A preview redraws once the typing pauses, rather than on every key.
export const PREVIEW_PAUSE = 60;

const VIEWS = [
  { value: 'revealed', label: 'Face up' },
  { value: 'sealed', label: 'Sealed' },
  { value: 'article', label: 'Article' },
];

// The card exactly as the binder will show it: face up, sealed, or opened as its article.
export function preview() {
  const back = cardBack();
  const flip = h('div', { class: 'binder__flip', role: 'button', tabindex: 0, 'aria-pressed': 'false', 'aria-label': 'Flip the preview' });
  const pocket = h('div', { class: 'binder__pocket' }, flip);
  const stage = h('div', { class: 'preview__stage' }, pocket);
  const buttons = VIEWS.map(({ value, label }) =>
    h('button', { class: 'preview__view', type: 'button', 'aria-pressed': String(value === 'revealed'), dataset: { view: value } }, label));
  let view = 'revealed';
  let data = null;

  function articleView() {
    if (!data.body) return h('p', { class: 'preview__empty' }, 'No article.');
    return h('div', { class: 'preview__article', dataset: { type: data.type } }, article(data, { heading: 'h2' }));
  }

  function render() {
    if (view === 'article') {
      stage.replaceChildren(articleView());
    } else {
      if (view === 'sealed') pocket.replaceChildren(sealed(data));
      else {
        flip.replaceChildren(card(data), back);
        if (flip.parentNode !== pocket) pocket.replaceChildren(flip);
      }
      if (pocket.parentNode !== stage) stage.replaceChildren(pocket);
    }
    stage.classList.toggle('is-article', view === 'article');
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
      stage,
      h('p', { class: 'preview__views', role: 'group', 'aria-label': 'Preview as' }, buttons),
    ),
    update(next) {
      data = next;
      render();
    },
    setView(next) {
      show(next);
      if (data) render();
    },
    // Face up and unsealed, for a different card.
    reset() {
      show('revealed');
      flip.setAttribute('aria-pressed', 'false');
    },
  };
}
