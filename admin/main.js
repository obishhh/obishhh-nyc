import { notice } from '../src/components/notice.js';
import { library } from '../src/data/art.js';
import { h } from '../src/lib/dom.js';
import { handwriting } from '../src/lib/scrawl.js';
import { deckEditor } from './components/deck-editor.js';
import { deckShelf } from './components/deck-shelf.js';
import { door } from './components/door.js';
import { editor } from './components/editor.js';
import { shelf } from './components/shelf.js';
import { topbar } from './components/topbar.js';
import { currentSession, isAdmin, signOut } from './lib/auth.js';
import { deleteCard, deleteImage, listCards, listUploads, reorderCards, saveCard, uploadImage } from './lib/cards.js';
import { deleteDeckCard, listDeck, saveDeckCard } from './lib/deck.js';
import { prepareImage } from './lib/image.js';
import { paintSealed, sealedKey } from './lib/sealed-image.js';

let cards = [];
let deck = [];

async function upload(file, options) {
  let image;
  try {
    image = await prepareImage(file);
  } catch {
    throw new Error('That file didn’t read as an image. Try a JPG or PNG.');
  }
  return uploadImage(image, options);
}

const entrance = door({ onSignedIn: enter });
const binder = shelf({ onSort: reorder });
const workbench = editor({
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
});
const box = deckShelf();
const deckBench = deckEditor({
  deck: () => deck,
  uploadPhoto: (file) => upload(file, { folder: 'deck' }),
  onSave: saveToDeck,
  onDelete: removeFromDeck,
});

const view = h('main', { class: 'room__view' });
const room = h('div', { class: 'room', hidden: true }, topbar({ onSignOut: leave }), view);
document.body.append(entrance.root, room);

// Routes: #/ is the binder and the deck box, #/new a fresh card, #/card/<id> an existing one,
// #/deck/new-note or #/deck/new-snapshot a fresh deck card, #/deck/<id> an existing one.
let shown = location.hash;

function render() {
  const hash = location.hash;
  const id = hash.match(/^#\/card\/(.+)$/)?.[1];
  const record = id && cards.find((data) => data.id === id);
  const deckId = hash.match(/^#\/deck\/(.+)$/)?.[1];
  const fresh = deckId?.match(/^new-(note|snapshot)$/)?.[1];
  const entry = deckId && deck.find((data) => data.id === deckId);
  if (hash === '#/new' || record) {
    workbench.load(record || null);
    view.replaceChildren(workbench.root);
  } else if (fresh || entry) {
    deckBench.load(entry || null, fresh);
    view.replaceChildren(deckBench.root);
  } else {
    binder.update(cards);
    box.update(deck);
    view.replaceChildren(binder.root, box.root);
    if (id) binder.flash('That card isn’t in the binder any more.', true);
    if (deckId) binder.flash('That card isn’t in the deck any more.', true);
  }
  scrollTo(0, 0);
}

function go(hash) {
  shown = hash;
  history.pushState(null, '', hash);
  render();
}

const bench = () => [workbench, deckBench].find((each) => view.contains(each.root));
const editing = () => Boolean(bench());
const unsaved = () => Boolean(bench()?.dirty);
const canLeave = () => !unsaved() || confirm('You have unsaved changes. Ditch them?');

addEventListener('hashchange', () => {
  if (room.hidden) return;
  if (!canLeave()) {
    history.replaceState(null, '', shown);
    return;
  }
  shown = location.hash;
  render();
});

// The sealed look is painted once per art, crop, type and finish, and reused until one of them changes.
async function withSealedImage(data, id) {
  const previous = cards.find((card) => card.id === id)?.art.sealed;
  const key = await sealedKey(data);
  if (previous?.includes(key)) return { ...data.art, sealed: previous };
  try {
    return { ...data.art, sealed: await uploadImage(await paintSealed(data), { folder: 'sealed', name: key }) };
  } catch {
    return previous ? { ...data.art, sealed: previous } : data.art;
  }
}

async function save(data, status, id) {
  const saved = await saveCard(id, { ...data, art: await withSealedImage(data, id) }, status);
  cards = id ? cards.map((other) => (other.id === id ? saved : other)) : [...cards, saved];
  shown = `#/card/${saved.id}`;
  history.replaceState(null, '', shown);
  return saved;
}

async function remove({ id }) {
  await deleteCard(id);
  cards = cards.filter((other) => other.id !== id);
  go('#/');
  binder.flash('Deleted.');
}

// A photo nothing points at any more shouldn't stay online. Tidying up never gets in the way of the save itself.
const letGo = (src) => deleteImage(src).catch(() => {});

async function saveToDeck(data, status, id) {
  const before = deck.find((other) => other.id === id)?.photo?.src;
  const saved = await saveDeckCard(id, data, status);
  if (before && before !== saved.photo?.src) letGo(before);
  deck = (id ? deck.map((other) => (other.id === id ? saved : other)) : [saved, ...deck])
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  shown = `#/deck/${saved.id}`;
  history.replaceState(null, '', shown);
  return saved;
}

async function removeFromDeck({ id, photo }) {
  await deleteDeckCard(id);
  if (photo?.src) letGo(photo.src);
  deck = deck.filter((other) => other.id !== id);
  go('#/');
  binder.flash('Taken out of the deck.');
}

async function reorder(ids) {
  const before = cards;
  const byId = new Map(cards.map((data) => [data.id, data]));
  cards = ids.map((id) => byId.get(id));
  try {
    await reorderCards(ids);
    binder.flash('Order saved.');
  } catch (error) {
    cards = before;
    binder.update(cards);
    binder.flash(error.message, true);
  }
}

async function enter() {
  if (!(await isAdmin())) {
    await signOut();
    entrance.show('This account can’t edit the cards.');
    return;
  }
  entrance.hide();
  room.hidden = false;
  view.replaceChildren(notice('Loading the cards…'));
  try {
    // Notes are written in marker, so its font comes in with the cards.
    [cards, deck] = await Promise.all([listCards(), listDeck(), handwriting()]);
  } catch (error) {
    view.replaceChildren(notice(`Couldn’t load the cards: ${error.message}`));
    return;
  }
  shown = location.hash;
  render();
}

async function leave() {
  if (!canLeave()) return;
  await signOut();
  room.hidden = true;
  cards = [];
  deck = [];
  view.replaceChildren();
  entrance.show();
}

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 's' && editing()) {
    event.preventDefault();
    bench().save();
  }
});

addEventListener('beforeunload', (event) => {
  if (!room.hidden && unsaved()) event.preventDefault();
});

(await currentSession()) ? enter() : entrance.show();
