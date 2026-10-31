import { h } from '../../src/lib/dom.js';

// The site's name (it opens the site in a new tab, so the room stays open), the way back to all the cards, and signing
// out.
export function topbar({ onSignOut }) {
  const signOut = h('button', { class: 'button button--quiet', type: 'button' }, 'Sign out');
  signOut.addEventListener('click', onSignOut);
  return h('header', { class: 'topbar' },
    h('a', { class: 'topbar__name', href: '/', target: '_blank', rel: 'noopener' }, 'obishhh.nyc'),
    h('a', { class: 'topbar__room', href: '#/' }, 'Editor’s room'),
    h('span', { class: 'topbar__spacer' }),
    signOut,
  );
}
