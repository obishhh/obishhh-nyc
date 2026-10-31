import { masthead } from '../components/masthead.js';
import { missing } from '../components/missing.js';
import { openedIn } from '../lib/addresses.js';
import { h } from '../lib/dom.js';

// A card's address that has no page of its own yet (it was published since the share pages were last built) still
// opens the card: on to the binder, with the card named the older way.
const deck = openedIn('deck');
const card = openedIn('card');
if (deck || card) {
  location.replace(`/?${new URLSearchParams(deck ? { deck } : { card })}`);
} else {
  document.body.append(
    masthead(),
    h('main', { class: 'page' }, missing()),
  );
}
