import { currentSession, isAdmin, signOut } from './lib/auth.js';
import { deletePost, getPost, isSlugTaken, listPosts, savePost } from './lib/posts.js';
import { mountEditor } from './components/editor.js';
import { mountLogin } from './components/login.js';
import { mountPostList } from './components/post-list.js';

const app = document.getElementById('app');
const login = mountLogin(document.getElementById('login'), { onSignedIn: enter });
const list = mountPostList(document.getElementById('posts'), { onSelect: open });
const editor = mountEditor(document.getElementById('editor'), {
  save: (fields) => persist({ ...fields, status: editor.post?.status ?? 'draft' }, 'Saved'),
  publish: (fields) => persist({ ...fields, status: 'published' }, 'Published'),
  unpublish: (fields) => persist({ ...fields, status: 'draft' }, 'Moved back to drafts'),
  remove,
});

const canDiscard = () => !editor.dirty || confirm('You have unsaved changes. Discard them?');

function show(post) {
  editor.load(post);
  list.select(post?.id ?? null);
}

async function guard(task) {
  try {
    await task();
  } catch (error) {
    editor.flash(isSlugTaken(error) ? 'That slug is taken. Pick another.' : error.message, true);
  }
}

const refresh = () => guard(async () => list.update(await listPosts()));

async function enter() {
  if (!(await isAdmin())) {
    await signOut();
    login.show("This account can't edit posts.");
    return;
  }
  login.hide();
  app.hidden = false;
  show(null);
  await refresh();
}

function open(id) {
  if (!canDiscard()) return;
  return guard(async () => show(await getPost(id)));
}

function startNew() {
  if (!canDiscard()) return;
  show(null);
  editor.focus();
}

function persist(fields, message) {
  return guard(async () => {
    show(await savePost(editor.post?.id, fields));
    editor.flash(message);
    await refresh();
  });
}

function remove() {
  const { post } = editor;
  if (!post || !confirm(`Delete "${post.title || 'Untitled'}"? This can't be undone.`)) return;
  return guard(async () => {
    await deletePost(post.id);
    show(null);
    editor.flash('Deleted');
    await refresh();
  });
}

async function leave() {
  if (!canDiscard()) return;
  show(null);
  await signOut();
  app.hidden = true;
  login.show();
}

document.querySelector('[data-new]').addEventListener('click', startNew);
document.querySelector('[data-sign-out]').addEventListener('click', leave);

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 's' && !app.hidden) {
    event.preventDefault();
    editor.submit();
  }
});

addEventListener('beforeunload', (event) => {
  if (editor.dirty) event.preventDefault();
});

(await currentSession()) ? enter() : login.show();
