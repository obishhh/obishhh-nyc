import { notice } from '../src/components/notice.js';
import { library } from '../src/data/art.js';
import { h } from '../src/lib/dom.js';
import { handwriting } from '../src/lib/scrawl.js';
import { deckEditor } from './components/deck-editor.js';
import { deckShelf } from './components/deck-shelf.js';
import { door } from './components/door.js';
import { editor } from './components/editor.js';
import { pokedexEditor } from './components/pokedex-editor.js';
import { pokedexShelf } from './components/pokedex-shelf.js';
import { shelf } from './components/shelf.js';
import { topbar } from './components/topbar.js';
import { currentSession, isAdmin, signOut } from './lib/auth.js';
import { deleteCard, listCards, reorderCards, saveArt, saveCard } from './lib/cards.js';
import { deleteDeckCard, listDeck, saveDeckCard, savePhoto } from './lib/deck.js';
import { lookImage, withLooks } from './lib/look-image.js';
import { deletePull, listPokedex, reorderPokedex, savePull } from './lib/pokedex.js';
import { withSealed } from './lib/sealed-image.js';
import { letGo, listUploads, upload } from './lib/storage.js';

let cards = [];
let deck = [];
let pulls = [];

const entrance = door({ onSignedIn: enter });
const cardShelf = shelf({ onSort: reorder });
const cardBench = editor({
  cards: () => cards,
  art: {
    library,
    loadUploads: listUploads,
    upload: (file) => upload(file),
    creditFor: (src) => cards.find(({ art }) => art.src === src)?.art,
  },
  uploadPhoto: (file) => upload(file, { folder: 'posts' }),
  onSave: save,
  onDelete: remove,
  onDone: backToBinder,
});
const deckBox = deckShelf();
const deckBench = deckEditor({
  deck: () => deck,
  uploadPhoto: (file) => upload(file, { folder: 'deck' }),
  onSave: saveToDeck,
  onDelete: removeFromDeck,
  onDone: backToBinder,
});
const pokedexBox = pokedexShelf({ onSort: reorderPulls });
const pokedexBench = pokedexEditor({
  uploadPhoto: (file) => upload(file, { folder: 'pokedex' }),
  onSave: saveToPokedex,
  onDelete: removeFromPokedex,
  onDone: backToBinder,
});

const view = h('main', { class: 'room__view' });
const room = h('div', { class: 'room', hidden: true }, topbar({ onSignOut: leave }), view);
document.body.append(entrance.root, room);

// Routes: #/ is the binder and the deck box, #/new a fresh card, #/card/<id> an existing one,
// #/deck/new-note or #/deck/new-snapshot a fresh deck card, #/deck/<id> an existing one, #/pokedex/new a fresh card for
// the Pokédex and #/pokedex/<id> one in it.
let shown = location.hash;

function render() {
  const hash = location.hash;
  const id = hash.match(/^#\/card\/(.+)$/)?.[1];
  const record = id && cards.find((data) => data.id === id);
  const deckId = hash.match(/^#\/deck\/(.+)$/)?.[1];
  const fresh = deckId?.match(/^new-(note|snapshot)$/)?.[1];
  const entry = deckId && deck.find((data) => data.id === deckId);
  const pullId = hash.match(/^#\/pokedex\/(.+)$/)?.[1];
  const pull = pullId && pulls.find((data) => data.id === pullId);
  if (hash === '#/new' || record) {
    cardBench.load(record || null);
    view.replaceChildren(cardBench.root);
  } else if (fresh || entry) {
    deckBench.load(entry || null, fresh);
    view.replaceChildren(deckBench.root);
  } else if (pullId === 'new' || pull) {
    pokedexBench.load(pull || null);
    view.replaceChildren(pokedexBench.root);
  } else {
    cardShelf.update(cards);
    deckBox.update(deck);
    pokedexBox.update(pulls);
    view.replaceChildren(cardShelf.root, deckBox.root, pokedexBox.root);
    if (id) cardShelf.flash('That card isn’t in the binder any more.', true);
    if (deckId) cardShelf.flash('That card isn’t in the deck any more.', true);
    if (pullId) cardShelf.flash('That card isn’t in the Pokédex any more.', true);
  }
  scrollTo(0, 0);
}

function go(hash) {
  shown = hash;
  history.pushState(null, '', hash);
  render();
}

const bench = () => [cardBench, deckBench, pokedexBench].find((each) => view.contains(each.root));
const editing = () => Boolean(bench());
const unsaved = () => Boolean(bench()?.dirty);
// Nothing's left while a save, a delete or an upload is still out: it would land on whatever card was open by then.
function canLeave() {
  if (bench()?.busy) {
    bench().flash('Still saving…');
    return false;
  }
  return !unsaved() || confirm('Ditch your unsaved changes?');
}

addEventListener('hashchange', () => {
  if (room.hidden) return;
  if (!canLeave()) {
    history.replaceState(null, '', shown);
    return;
  }
  shown = location.hash;
  render();
});

// A card goes in with its photo's look drawn, and its sealed picture.
async function save(data, status, id) {
  const was = cards.find((card) => card.id === id)?.art;
  const art = { ...data.art, baked: (await lookImage(data.art.src, data.art.look, was?.baked)) ?? undefined };
  const saved = await saveCard(id, { ...data, art: await withSealed({ ...data, art }, was?.sealed) }, status);
  cards = id ? cards.map((other) => (other.id === id ? saved : other)) : [...cards, saved];
  shown = `#/card/${saved.id}`;
  history.replaceState(null, '', shown);
  return saved;
}

// After a save from the buttons: back to the binder, with the news there.
function backToBinder(message) {
  go('#/');
  cardShelf.flash(message);
}

async function remove({ id }) {
  await deleteCard(id);
  cards = cards.filter((other) => other.id !== id);
  go('#/');
  cardShelf.flash('Deleted.');
}

// A deck card goes in with its photos' look drawn, and a photo it's let go of comes out of storage.
async function saveToDeck(data, status, id) {
  const was = deck.find((other) => other.id === id)?.photo;
  const saved = await saveDeckCard(id, { ...data, photo: (await withLooks(data.photo, was)).photo }, status);
  if (was?.src && was.src !== saved.photo?.src) letGo(was.src);
  if (was?.second?.src && was.second.src !== saved.photo?.second?.src) letGo(was.second.src);
  deck = (id ? deck.map((other) => (other.id === id ? saved : other)) : [saved, ...deck])
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  shown = `#/deck/${saved.id}`;
  history.replaceState(null, '', shown);
  return saved;
}

async function removeFromDeck({ id, photo }) {
  await deleteDeckCard(id);
  if (photo?.src) letGo(photo.src);
  if (photo?.second?.src) letGo(photo.second.src);
  deck = deck.filter((other) => other.id !== id);
  go('#/');
  cardShelf.flash('Deleted.');
}

// A Pokédex card goes in as it is, and a photo it's let go of comes out of storage.
async function saveToPokedex(data, status, id) {
  const was = pulls.find((other) => other.id === id)?.photo;
  const saved = await savePull(id, data, status);
  if (was?.src && was.src !== saved.photo?.src) letGo(was.src);
  pulls = id ? pulls.map((other) => (other.id === id ? saved : other)) : [...pulls, saved];
  shown = `#/pokedex/${saved.id}`;
  history.replaceState(null, '', shown);
  return saved;
}

async function removeFromPokedex({ id, photo }) {
  await deletePull(id);
  if (photo?.src) letGo(photo.src);
  pulls = pulls.filter((other) => other.id !== id);
  go('#/');
  cardShelf.flash('Deleted.');
}

async function reorderPulls(ids) {
  const before = pulls;
  const byId = new Map(pulls.map((data) => [data.id, data]));
  pulls = ids.map((id) => byId.get(id));
  try {
    await reorderPokedex(ids);
    pokedexBox.flash('Order saved.');
  } catch (error) {
    pulls = before;
    pokedexBox.update(pulls);
    pokedexBox.flash(error.message, true);
  }
}

async function reorder(ids) {
  const before = cards;
  const byId = new Map(cards.map((data) => [data.id, data]));
  cards = ids.map((id) => byId.get(id));
  try {
    await reorderCards(ids);
    cardShelf.flash('Order saved.');
  } catch (error) {
    cards = before;
    cardShelf.update(cards);
    cardShelf.flash(error.message, true);
  }
}

async function enter() {
  entrance.hide();
  room.hidden = false;
  view.replaceChildren(notice('Loading the cards…'));
  // Whether this account may edit, and the cards, asked for together. Notes are written in marker, so its font comes
  // in with them.
  const [admin, lists] = await Promise.allSettled([isAdmin(), Promise.all([listCards(), listDeck(), listPokedex(), handwriting()])]);
  if (admin.status === 'fulfilled' && !admin.value) {
    await signOut();
    room.hidden = true;
    view.replaceChildren();
    entrance.show('This account can’t edit the cards.');
    return;
  }
  const failed = admin.status === 'rejected' ? admin.reason : lists.status === 'rejected' && lists.reason;
  if (failed) {
    view.replaceChildren(notice(`Couldn’t load the cards: ${failed.message}`));
    return;
  }
  [cards, deck, pulls] = lists.value;
  shown = location.hash;
  render();
  drawLooks();
}

// Photos saved before looks were kept as pictures, or whose picture didn't save, get theirs now, one at a time and
// quietly. Each is only written if its card hasn't changed since it was read, so an edit made meanwhile always wins.
async function drawLooks() {
  for (const { id, art, updated_at: since } of cards) {
    const baked = await lookImage(art?.src, art?.look, art?.baked);
    if (!baked || baked === art.baked) continue;
    const saved = await saveArt(id, { ...art, baked }, since).catch(() => null);
    if (saved) cards = cards.map((other) => (other.id === id ? saved : other));
  }
  for (const { id, photo, updated_at: since } of deck) {
    const { photo: drawn, failed } = await withLooks(photo, photo);
    if (failed || (drawn?.baked === photo?.baked && drawn?.second?.baked === photo?.second?.baked)) continue;
    const saved = await savePhoto(id, drawn, since).catch(() => null);
    if (saved) deck = deck.map((other) => (other.id === id ? saved : other));
  }
}

async function leave() {
  if (!canLeave()) return;
  await signOut();
  room.hidden = true;
  cards = [];
  deck = [];
  pulls = [];
  view.replaceChildren();
  entrance.show();
}

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && editing()) {
    event.preventDefault();
    bench().save();
  }
});

addEventListener('beforeunload', (event) => {
  if (!room.hidden && (unsaved() || bench()?.busy)) event.preventDefault();
});

(await currentSession()) ? enter() : entrance.show();
