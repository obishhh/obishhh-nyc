import { notice } from '../src/components/notice.js';
import { library } from '../src/data/art.js';
import { h } from '../src/lib/dom.js';
import { door } from './components/door.js';
import { editor } from './components/editor.js';
import { shelf } from './components/shelf.js';
import { toast } from './components/toast.js';
import { topbar } from './components/topbar.js';
import { currentSession, isAdmin, signOut } from './lib/auth.js';
import { deleteCard, listCards, listUploads, reorderCards, saveCard, uploadArt } from './lib/cards.js';
import { prepareImage } from './lib/image.js';

let cards = [];

async function upload(file) {
  let image;
  try {
    image = await prepareImage(file);
  } catch {
    throw new Error('That file didn’t read as an image. Try a JPG or PNG.');
  }
  return uploadArt(image);
}

const entrance = door({ onSignedIn: enter });
const binder = shelf({ onSort: reorder });
const workbench = editor({
  cards: () => cards,
  art: {
    library,
    loadUploads: listUploads,
    upload,
    creditFor: (src) => cards.find(({ art }) => art.src === src)?.art,
  },
  onSave: save,
  onDelete: remove,
});

const view = h('main', { class: 'room__view' });
const room = h('div', { class: 'room', hidden: true }, topbar({ onSignOut: leave }), view);
document.body.append(entrance.root, room);

// Routes: #/ is the binder, #/new a fresh card, #/card/<id> an existing one.
let shown = location.hash;

function render() {
  const hash = location.hash;
  const id = hash.match(/^#\/card\/(.+)$/)?.[1];
  const record = id && cards.find((data) => data.id === id);
  if (hash === '#/new' || record) {
    workbench.load(record || null);
    view.replaceChildren(workbench.root);
  } else {
    if (id) toast('That card isn’t in the binder any more.', { tone: 'bad' });
    binder.update(cards);
    view.replaceChildren(binder.root);
  }
  scrollTo(0, 0);
}

function go(hash) {
  shown = hash;
  history.pushState(null, '', hash);
  render();
}

const editing = () => view.contains(workbench.root);
const unsaved = () => editing() && workbench.dirty;
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

async function save(data, status, id) {
  const saved = await saveCard(id, data, status);
  cards = id ? cards.map((other) => (other.id === id ? saved : other)) : [...cards, saved];
  shown = `#/card/${saved.id}`;
  history.replaceState(null, '', shown);
  return saved;
}

async function remove({ id }) {
  await deleteCard(id);
  cards = cards.filter((other) => other.id !== id);
  go('#/');
}

async function reorder(ids) {
  const before = cards;
  const byId = new Map(cards.map((data) => [data.id, data]));
  cards = ids.map((id) => byId.get(id));
  try {
    await reorderCards(ids);
    toast('Order saved. The binder’s been reshuffled.');
  } catch (error) {
    cards = before;
    binder.update(cards);
    toast(error.message, { tone: 'bad' });
  }
}

async function enter() {
  if (!(await isAdmin())) {
    await signOut();
    entrance.show('You got in, but you’re not on the list. Back you go.');
    return;
  }
  entrance.hide();
  room.hidden = false;
  view.replaceChildren(notice('Shuffling the binder…'));
  try {
    cards = await listCards();
  } catch (error) {
    view.replaceChildren(notice(`The binder won’t open: ${error.message}`));
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
  view.replaceChildren();
  entrance.show();
}

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 's' && editing()) {
    event.preventDefault();
    workbench.save();
  }
});

addEventListener('beforeunload', (event) => {
  if (!room.hidden && unsaved()) event.preventDefault();
});

(await currentSession()) ? enter() : entrance.show();
