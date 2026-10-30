import { h } from '../lib/dom.js';
import { safeImage } from '../lib/markdown.js';
import { retreatOf, typeName, weaknessOf } from '../data/types.js';
import { energy } from './energy.js';
import { rarity } from './rarity.js';

const COPYRIGHT = '©2026 obishhh.nyc';

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
function stageLine({ stats }) {
  return h('p', { class: 'card__stage' }, stats.filed && h('span', { class: 'card__stage-badge', title: 'Filed under' }, stats.filed));
}

function stat(label, ...value) {
  return h('div', { class: 'card__stat' }, h('dt', {}, label), h('dd', {}, ...value));
}

// Weakness, resistance and retreat, in icons like the real ones. Also used under the article.
export function battleStats(data, { size = 'small', prefix = 'card' } = {}) {
  const weak = weaknessOf(data);
  const resist = data.stats.resistance;
  const retreat = retreatOf(data.minutes);
  const icon = (kind) => energy(kind, size);
  return h('dl', { class: `${prefix}__stats` },
    stat('weakness', h('span', { class: 'card__stat-value', title: `Weak to ${typeName(weak)}` }, icon(weak), '×2')),
    stat('resistance', resist && h('span', { class: 'card__stat-value', title: `Resists ${typeName(resist)}` }, icon(resist), '−30')),
    stat('retreat', h('span', { class: 'card__stat-value', title: retreat ? `${retreat} to retreat` : 'Free to retreat' },
      ...Array.from({ length: retreat }, () => icon('plain')))),
  );
}

function footer({ art, number, rarity: level }) {
  return h('footer', { class: 'card__footer' },
    h('span', {}, `Illus. ${art.illustrator}`),
    h('span', {}, COPYRIGHT),
    h('span', { class: 'card__number' }, number, rarity(level)),
  );
}

export function card(data) {
  return h('article', { class: 'card', dataset: { type: data.type, finish: data.finish }, 'aria-label': data.title },
    h('div', { class: 'card__panel' },
      stageLine(data),
      nameBar(data),
      artwork(data.art),
      dexStrip(data),
      move(data),
      h('hr', { class: 'card__rule' }),
      battleStats(data),
      data.flavor && h('p', { class: 'card__flavor' }, data.flavor),
    ),
    footer(data),
  );
}
