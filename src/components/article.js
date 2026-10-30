import { h } from '../lib/dom.js';
import { battleStats } from './card.js';
import { prose } from './prose.js';
import { rarity } from './rarity.js';

// What a published card says when it's opened: in the reader, and in the editor's preview.
export function article(data, { heading = 'h1', titleId } = {}) {
  return h('div', { class: 'article' },
    data.stats.filed && h('p', { class: 'article__stage' }, data.stats.filed),
    h(heading, { class: 'article__title', id: titleId }, data.title),
    h('p', { class: 'article__byline' }, `${data.minutes} min read`),
    prose(data.body ?? '', { end: h('span', { class: 'article__end' }, rarity(data.rarity)) }),
    h('footer', { class: 'article__footer' },
      battleStats(data, { size: 'regular', prefix: 'article' }),
      h('p', { class: 'article__credit' }, `Illus. ${data.art.illustrator} · ©2026 obishhh.nyc`),
    ),
  );
}
