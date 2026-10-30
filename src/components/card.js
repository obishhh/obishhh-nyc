import { knownType } from '../data/types.js';
import { h } from '../lib/dom.js';
import { safeImage } from '../lib/markdown.js';
import { battleStats } from './battle-stats.js';
import { energy } from './energy.js';
import { rarity } from './rarity.js';
import { smallPrint } from './small-print.js';
import { wear } from './wear.js';

// Letters that reach above the lowercase ones, so a word centres on its capitals rather than its x-height.
const TALL = /[A-Z0-9bdfhkl]/;

function nameBar({ title, minutes, type }) {
  return h('header', { class: 'card__name' },
    h('h2', { class: 'card__title' }, title),
    h('span', { class: 'card__hp', title: `${minutes} minute read` },
      h('span', { class: 'card__hp-value' }, String(minutes)),
      h('span', { class: 'card__hp-unit' }, 'MIN'),
      energy(type),
    ),
  );
}

function artwork({ src, alt, position }) {
  const picture = safeImage(src ?? '');
  return h('figure', { class: 'card__art' },
    picture && h('img', { src: picture, alt, width: 202, height: 128, decoding: 'async', style: position && { 'object-position': position } }),
  );
}

function dexStrip({ dex, firstPrint }) {
  return h('p', { class: 'card__dex' },
    firstPrint && h('span', { class: 'card__first-print', title: 'First print' }, '1'),
    dex,
  );
}

function move({ type, move: { name, text, score, cost = [type, 'plain'] } }) {
  return h('section', { class: 'card__move' },
    h('span', { class: 'card__cost' }, cost.map((kind) => energy(kind, 'small'))),
    h('div', { class: 'card__move-text' },
      h('h3', { class: 'card__move-name' }, name),
      h('p', { class: 'card__move-body' }, text),
    ),
    h('span', { class: 'card__score' }, String(score)),
  );
}

// Where it's filed, on the silver badge a real card keeps for its stage. The binder's tabs go by the same thing.
function filedLine({ stats }) {
  return h('p', { class: 'card__filed' }, stats.filed && h('span', { class: 'card__filed-badge', title: 'Filed under' },
    h('span', { class: 'card__filed-word', dataset: { tall: String(TALL.test(stats.filed)) } }, stats.filed)));
}

export function card(data) {
  return h('article', { class: 'card card--post', dataset: { type: knownType(data.type), finish: data.finish }, 'aria-label': data.title },
    h('div', { class: 'card__panel' },
      filedLine(data),
      nameBar(data),
      artwork(data.art),
      dexStrip(data),
      move(data),
      h('hr', { class: 'card__rule' }),
      battleStats(data),
      data.flavor && h('p', { class: 'card__flavor' }, data.flavor),
      // The small print sits inside the panel, just above the bottom border, as on a real card.
      smallPrint(`Illus. ${data.art.illustrator}`, data.number, rarity(data.rarity)),
    ),
    wear(data.number || data.title),
  );
}
