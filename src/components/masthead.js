import { h } from '../lib/dom.js';

export function masthead({ heading = false } = {}) {
  const name = h('a', { class: 'masthead__name', href: '/' }, 'obishhh.nyc');
  return h('header', { class: 'masthead' },
    heading ? h('h1', { class: 'masthead__heading' }, name) : name,
  );
}
