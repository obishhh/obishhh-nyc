import { h, svg } from '../lib/dom.js';

const DOOR = `<svg class="masthead__door-icon" viewBox="0 0 14 14" aria-hidden="true">
  <path class="masthead__door-frame" d="M3.5 12.5V2.6c0-.6.5-1.1 1.1-1.1h4.8c.6 0 1.1.5 1.1 1.1v9.9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
  <path d="M1.8 12.5h10.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
  <circle cx="8.3" cy="7.4" r="0.85" fill="currentColor"/>
</svg>`;

export function masthead({ heading = false, door = false } = {}) {
  const name = h('a', { class: 'masthead__name', href: '/' }, 'obishhh');
  return h('header', { class: 'masthead' },
    heading ? h('h1', { class: 'masthead__heading' }, name) : name,
    door && h('a', { class: 'masthead__door', href: '/admin/' }, svg(DOOR), 'Editor’s room'),
  );
}
