import { h, svg } from '../lib/dom.js';
import { card } from './card.js';
import { cardBack } from './card-back.js';
import { rarity } from './rarity.js';

const CLOSE = `<svg class="reader__icon" viewBox="0 0 16 16" aria-hidden="true">
  <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

function body({ body: paragraphs = [], rarity: level }) {
  const last = paragraphs.length - 1;
  return h('div', { class: 'reader__body' },
    paragraphs.map((text, index) => h('p', {}, text, index === last && h('span', { class: 'reader__end' }, rarity(level)))),
  );
}

function stat(label, value) {
  return h('div', { class: 'reader__stat' }, h('dt', {}, label), h('dd', {}, String(value)));
}

// A published card opened up: the card on one side, what it's about on the other.
export function reader(data) {
  const flip = h('div', { class: 'reader__flip', role: 'button', tabindex: 0, 'aria-pressed': 'false', 'aria-label': 'Turn the card over' },
    card(data),
    cardBack(),
  );
  const close = h('button', { class: 'reader__close', type: 'button', 'aria-label': 'Close' }, svg(CLOSE));

  const root = h('div', { class: 'reader', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'reader-title', dataset: { type: data.type } },
    h('div', { class: 'reader__backdrop' }),
    h('article', { class: 'reader__sheet' },
      h('header', { class: 'reader__bar' },
        h('span', { class: 'reader__number' }, data.number, rarity(data.rarity)),
        close,
      ),
      h('div', { class: 'reader__layout' },
        h('div', { class: 'reader__card' },
          h('div', { class: 'reader__pocket' }, flip),
        ),
        h('div', { class: 'reader__text' },
          h('p', { class: 'reader__stage' }, data.stage),
          h('h1', { class: 'reader__title', id: 'reader-title' }, data.title),
          h('p', { class: 'reader__byline' }, `${data.minutes} min read · Filed under ${data.stats.filed}`),
          body(data),
          h('footer', { class: 'reader__footer' },
            h('dl', { class: 'reader__stats' },
              stat('reads', data.stats.reads),
              stat('replies', data.stats.replies),
              stat('filed under', data.stats.filed),
            ),
            h('p', { class: 'reader__credit' }, `Illus. ${data.art.illustrator} · ©2026 obishhh.nyc`),
          ),
        ),
      ),
    ),
  );

  flip.addEventListener('click', () => flip.setAttribute('aria-pressed', String(flip.getAttribute('aria-pressed') !== 'true')));
  flip.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    flip.click();
  });

  return {
    root,
    close,
    backdrop: root.querySelector('.reader__backdrop'),
    sheet: root.querySelector('.reader__sheet'),
    pocket: root.querySelector('.reader__pocket'),
    text: root.querySelector('.reader__text'),
  };
}
