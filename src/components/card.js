import { h } from '../lib/dom.js';
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

function artwork({ src, alt }) {
  return h('figure', { class: 'card__art' },
    h('img', { src, alt, width: 202, height: 128, decoding: 'async' }),
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

function stat(label, value) {
  return h('div', { class: 'card__stat' }, h('dt', {}, label), h('dd', {}, String(value)));
}

function stats({ reads, replies, filed }) {
  return h('dl', { class: 'card__stats' },
    stat('reads', reads),
    stat('replies', replies),
    stat('filed under', filed),
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
      h('p', { class: 'card__stage' }, data.stage),
      nameBar(data),
      artwork(data.art),
      dexStrip(data),
      move(data),
      h('hr', { class: 'card__rule' }),
      stats(data.stats),
      data.flavor && h('p', { class: 'card__flavor' }, data.flavor),
    ),
    footer(data),
  );
}
