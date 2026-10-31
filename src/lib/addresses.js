// Every card that can be opened has its own address, so it can be shared: a deck card at /d/001-100/, an article at
// /c/its-slug/. Each has a page of its own with a preview for messages (see scripts/share-pages.mjs); one that
// doesn't yet is sent on by the 404 page. The older ?deck= and ?card= forms still open the same cards.
const PATHS = { deck: 'd', card: 'c' };

// A deck card's key: its number, or its id if it has none.
export const deckKey = (entry) => (entry.number ? entry.number.replaceAll('/', '-') : String(entry.id ?? ''));

// What a card's key can be: letters, numbers, dashes, dots and underscores, but never just dots.
export const goodKey = (key) => /^[\w.-]+$/.test(key ?? '') && !/^\.+$/.test(key);

// Which card of a kind the address points at, if any. A garbled or odd-looking key points at nothing.
export function openedIn(kind, where = location) {
  const path = where.pathname.match(new RegExp(`^/${PATHS[kind]}/([^/]+)/?$`));
  let key = new URLSearchParams(where.search).get(kind);
  if (path) {
    try {
      key = decodeURIComponent(path[1]);
    } catch {
      return null;
    }
  }
  return goodKey(key) ? key : null;
}

// The address with a card of this kind opened, or none: keeps whatever else is in the query (like the open tab), and
// drops the old query forms so a card is only ever named once.
export function addressFor(kind, key) {
  const query = new URLSearchParams(location.search);
  query.delete('deck');
  query.delete('card');
  const search = query.toString();
  const path = key ? `/${PATHS[kind]}/${encodeURIComponent(key)}/` : '/';
  return `${path}${search ? `?${search}` : ''}`;
}
