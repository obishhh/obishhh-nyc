import { h } from '../lib/dom.js';
import { prose } from './prose.js';
import { rarity } from './rarity.js';

function stat(label, value) {
  return h('div', { class: 'article__stat' }, h('dt', {}, label), h('dd', {}, String(value)));
}

// What a published card says when it's opened: in the reader, and in the editor's preview.
export function article(data, { heading = 'h1', titleId } = {}) {
  return h('div', { class: 'article' },
    h('p', { class: 'article__stage' }, data.stage),
    h(heading, { class: 'article__title', id: titleId }, data.title),
    h('p', { class: 'article__byline' }, `${data.minutes} min read · Filed under ${data.stats.filed}`),
    prose(data.body ?? '', { end: h('span', { class: 'article__end' }, rarity(data.rarity)) }),
    h('footer', { class: 'article__footer' },
      h('dl', { class: 'article__stats' },
        stat('reads', data.stats.reads),
        stat('bookmarked', data.stats.replies),
        stat('filed under', data.stats.filed),
      ),
      h('p', { class: 'article__credit' }, `Illus. ${data.art.illustrator} · ©2026 obishhh.nyc`),
    ),
  );
}
