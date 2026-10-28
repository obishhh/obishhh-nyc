import { h } from '../../src/lib/dom.js';

export function topbar({ onSignOut }) {
  const signOut = h('button', { class: 'button', type: 'button' }, 'Sign out');
  signOut.addEventListener('click', onSignOut);
  return h('header', { class: 'topbar' },
    h('a', { class: 'topbar__name', href: '/' }, 'obishhh'),
    h('a', { class: 'topbar__room', href: '#/' }, 'Editor’s room'),
    h('span', { class: 'topbar__spacer' }),
    h('a', { class: 'button button--quiet', href: '/', target: '_blank', rel: 'noopener' }, 'View site ↗'),
    signOut,
  );
}
