// Builds a page for every card that can be opened, so a link to one shows that card when it's sent in a message.
// A deck card's page is d/<key>/index.html, an article's c/<slug>/index.html: each is the home page with its own
// title, description and a picture of the card for previews, and the site opens the card there itself.
//
// Run by .github/workflows/share-pages.yml, which commits what changes. By hand: npm i --no-save playwright, then
// node scripts/share-pages.mjs.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { goodKey } from '../src/lib/addresses.js';
import { reachable } from './modules.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE = 'https://obishhh.nyc';
// Bump to redraw every picture, e.g. after the cards' look changes.
const VERSION = 1;
// Previews are 1200 by 630: drawn at 750 by 394 and 1.6 times the pixels, so the card is sharp at its own size.
const STAGE = { width: 750, height: 394, scale: 1.6 };
// A deck card's picture to save to a phone: the card alone, three times its size, its corners left clear.
const SAVE_SCALE = 3;
const KINDS = { deck: 'd', card: 'c' };
// What a card looks like comes from these: a change to any of them redraws every picture. The code is everything the
// two card components load; then their styles, the energy notes' paintings, and the fonts the home page asks for.
const STYLES = ['tokens', 'base', 'card', 'card-back', 'energy', 'rarity', 'deck-cards'].map((name) => `src/styles/${name}.css`);
function drawnBy(root) {
  const files = [
    ...reachable(root, ['src/components/card.js', 'src/components/deck-cards.js']),
    ...STYLES,
    ...readdirSync(join(root, 'assets/energy')).sort().map((name) => `assets/energy/${name}`),
  ];
  const fonts = readFileSync(join(root, 'index.html'), 'utf8').match(/https:\/\/fonts\.googleapis\.com\/[^"]+/)?.[0];
  return digest(fonts, ...files.map((file) => createHash('sha256').update(readFileSync(join(root, file))).digest('hex')));
}
// The preview picture's quality, as a JPEG.
const PREVIEW_QUALITY = 85;
// How long a picture waits for its photos and filters before giving up on it until the next run.
const PATIENCE = 15000;

const escape = (text) => String(text).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
// Text as it reads, cut to fit, a whole character at a time (an emoji isn't split in two). An article's Markdown is
// taken out first; a note or caption is plain already, so its # and > are kept.
const plain = (text, most, { markdown = false } = {}) => {
  let flat = String(text ?? '');
  if (markdown) flat = flat.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_`>]/g, '');
  const letters = Array.from(flat.replace(/\s+/g, ' ').trim());
  return letters.length > most ? `${letters.slice(0, most - 1).join('').trimEnd()}…` : letters.join('');
};

// What each page says in a preview.
function describe(kind, data) {
  if (kind === 'card') {
    return { title: data.title, description: plain(data.body, 160, { markdown: true }) || plain(data.move?.text, 160) };
  }
  if (data.kind === 'snapshot') return { title: data.title || 'Snapshot', description: plain(data.text, 160) };
  return { title: `“${plain(data.text, 60)}”`, description: 'A note from the deck box.' };
}

// The home page, retitled for one card, with its picture for previews.
function sharePage(template, { kind, key, title, description, hash, words }) {
  const { html } = template;
  if (!html.includes('  <link rel="icon"')) throw new Error('index.html has no `  <link rel="icon"` line to put the preview tags before');
  const url = `${SITE}/${KINDS[kind]}/${encodeURIComponent(key)}/`;
  const tags = [
    `<title>${escape(title)} · obishhh</title>`,
    `<meta name="description" content="${escape(description)}">`,
    `<meta property="og:site_name" content="obishhh.nyc">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${url}card.jpg">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="share-hash" content="${hash}">`,
    `<meta name="share-words" content="${words}">`,
  ].join('\n  ');
  return html
    .replace(/  <title>.*?<\/title>\n/, '')
    .replace(/  <meta (name="description"|property="og:[a-z_:]+"|name="twitter:[a-z]+") content="[^"]*">\n/g, '')
    // A function, so a $ in a title or caption is kept as written rather than read as a replacement pattern.
    .replace('  <link rel="icon"', () => `  ${tags}\n  <link rel="icon"`);
}

const digest = (...parts) => createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
// A page's hash covers what its picture shows and how cards are drawn; its words hash, the home page it's made from
// and what it says. The first changing means a new picture; only the second, just new words around the old one. An
// article's text, its address and when a card went up aren't in the picture, so changing them redraws nothing.
const shown = ({ body, slug, at, ...data }) => data;
const hashOf = (kind, data, drawing) => digest(VERSION, kind, shown(data), drawing);
const wordsOf = (template, said) => digest(template.hash, said);
const readMeta = (file, name) => (existsSync(file) ? readFileSync(file, 'utf8').match(new RegExp(`name="${name}" content="([^"]+)"`))?.[1] : null);
const hashOn = (file) => readMeta(file, 'share-hash');

// Every card that has a page: published deck cards, and binder cards with an article. Read through the site's own
// loaders, in the page, so it's exactly what the site shows.
async function cardsIn(page) {
  return page.evaluate(async () => {
    const { loadBinder, loadDeck } = await import('/src/lib/cards.js');
    const { deckKey } = await import('/src/lib/addresses.js');
    const [deck, binder] = await Promise.all([loadDeck(), loadBinder()]);
    return [
      ...deck.map((data) => ({ kind: 'deck', key: deckKey(data), data })),
      ...binder.filter((data) => !data.sealed && data.slug && data.body).map((data) => ({ kind: 'card', key: data.slug, data })),
    ];
  });
}

// Put into each page before drawing: waits until every photo has loaded and every filter has drawn (a filtered
// photo's <img> is swapped for its drawing), and throws if that doesn't happen, so a half-drawn card is never kept.
const SETTLED = `window.settled = async (holder, patience = ${PATIENCE}) => {
  const until = performance.now() + patience;
  const waiting = () => [...holder.querySelectorAll('img')].some((img) => !img.complete || img.dataset.look);
  while (waiting() && performance.now() < until) await new Promise((resolve) => setTimeout(resolve, 100));
  const broken = [...holder.querySelectorAll('img')].filter((img) => !img.complete || !img.naturalWidth || img.dataset.look);
  if (broken.length) throw new Error('a photo or its filter never arrived: ' + broken.map((img) => img.src).join(', '));
}`;

// A picture of the card on the page's background, a little askew, drawn by the site's own components.
async function picture(page, { kind, data }, file) {
  await page.evaluate(async ({ kind, data, stage }) => {
    const { card } = await import('/src/components/card.js');
    const { deckCard } = await import('/src/components/deck-cards.js');
    const { handwriting } = await import('/src/lib/scrawl.js');
    await handwriting();
    document.getElementById('share-stage')?.remove();
    const holder = document.createElement('div');
    holder.id = 'share-stage';
    holder.style.cssText = `position:fixed;inset:0 auto auto 0;z-index:2147483647;width:${stage.width}px;height:${stage.height}px;`
      + 'display:grid;place-items:center;background:var(--page);overflow:hidden';
    const shown = kind === 'deck' ? deckCard(data) : card(data);
    shown.style.cssText = 'transform:rotate(-2deg);box-shadow:0 10px 24px rgb(13 10 5 / 0.22)';
    holder.append(shown);
    document.body.append(holder);
    await settled(holder);
  }, { kind, data, stage: STAGE });
  await page.locator('#share-stage').screenshot({ path: file, type: 'jpeg', quality: PREVIEW_QUALITY });
}

// The card on its own, straight, with nothing behind it.
async function keepsake(page, { data }, file) {
  await page.evaluate(async ({ data }) => {
    const { deckCard } = await import('/src/components/deck-cards.js');
    const { handwriting } = await import('/src/lib/scrawl.js');
    await handwriting();
    document.getElementById('share-stage')?.remove();
    const holder = document.createElement('div');
    holder.id = 'share-stage';
    holder.style.cssText = 'position:fixed;inset:0 auto auto 0;z-index:2147483647;padding:0;background:transparent';
    holder.append(deckCard(data));
    // Nothing of the page behind it, so the card's rounded corners come out clear.
    for (const each of document.body.children) each.style.setProperty('display', 'none');
    for (const each of [document.documentElement, document.body]) each.style.setProperty('background', 'transparent');
    document.body.append(holder);
    await settled(holder);
  }, { data });
  await page.locator('#share-stage > .card').screenshot({ path: file, type: 'png', omitBackground: true });
  squeeze(file);
}

// The picture to save, in 256 colours: a fifth of the size, and the same to look at. Where pngquant isn't installed
// (it is where the pages are built), it's kept as it is.
function squeeze(file) {
  spawnSync('pngquant', ['--quality=70-95', '--speed=1', '--skip-if-larger', '--force', '--output', file, file], { stdio: 'ignore' });
}

// Builds every page that's missing or out of date, and takes away pages for cards that have gone.
// `saving` draws the deck cards' pictures to save, at their own scale; without it, those are left alone.
export async function generate(page, { saving, root = ROOT, log = console.log } = {}) {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const template = { html, hash: digest(html) };
  const drawing = drawnBy(root);
  for (const each of [page, saving].filter(Boolean)) await each.evaluate(SETTLED);
  const cards = await cardsIn(page);
  const kept = new Set();
  for (const entry of cards) {
    const folder = join(root, KINDS[entry.kind], entry.key);
    // A key that would make an odd folder, or one already taken by another card, gets no page.
    if (!goodKey(entry.key) || kept.has(folder)) {
      log(`skipped ${KINDS[entry.kind]}/${entry.key}: ${goodKey(entry.key) ? 'another card has that key' : 'not a usable key'}`);
      continue;
    }
    kept.add(folder);
    const file = join(folder, 'index.html');
    const hash = hashOf(entry.kind, entry.data, drawing);
    const said = describe(entry.kind, entry.data);
    const words = wordsOf(template, said);
    const write = () => writeFileSync(file, sharePage(template, { ...entry, ...said, hash, words }));
    if (hashOn(file) === hash) {
      // Same card, same picture: only what the page says, or the home page around it, may have changed.
      if (readMeta(file, 'share-words') !== words) write();
      continue;
    }
    mkdirSync(folder, { recursive: true });
    // Drawn beside the old pictures and only swapped in once both are done, so a run that fails halfway leaves the
    // page as it was (and tries again next time) rather than half new.
    const pictures = [['card.jpg', (to) => picture(page, entry, to)]];
    if (saving && entry.kind === 'deck') pictures.push(['save.png', (to) => keepsake(saving, entry, to)]);
    try {
      for (const [name, draw] of pictures) await draw(join(folder, `${name}.part`));
    } catch (error) {
      for (const [name] of pictures) rmSync(join(folder, `${name}.part`), { force: true });
      log(`couldn't draw ${KINDS[entry.kind]}/${entry.key}, will try again: ${error.message}`);
      continue;
    }
    for (const [name] of pictures) renameSync(join(folder, `${name}.part`), join(folder, name));
    rmSync(join(folder, 'card.png'), { force: true });
    write();
    log(`drew ${KINDS[entry.kind]}/${entry.key}`);
  }
  // Folders for cards that have gone, and any left half made. If most of them would go at once, it's likelier that
  // what came back was wrong than that the cards all went, so none do.
  const folders = Object.values(KINDS).flatMap((prefix) => {
    const base = join(root, prefix);
    return existsSync(base) ? readdirSync(base).map((name) => join(base, name)) : [];
  });
  const gone = folders.filter((folder) => !kept.has(folder));
  if (gone.length > 2 && gone.length > folders.length / 2) {
    log(`not removing ${gone.length} of ${folders.length} pages: that's most of them`);
  } else {
    for (const folder of gone) {
      rmSync(folder, { recursive: true });
      log(`removed ${folder.slice(root.length)}`);
    }
  }
  return cards.length;
}

// The repo's files, as GitHub Pages would serve them.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
function serve(root) {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, path);
    if (existsSync(file) && !extname(file)) file = join(file, 'index.html');
    if (!existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { chromium } = await import('playwright');
  const server = await serve(ROOT);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: STAGE.width, height: STAGE.height }, deviceScaleFactor: STAGE.scale });
  const saving = await browser.newPage({ viewport: { width: 400, height: 500 }, deviceScaleFactor: SAVE_SCALE });
  for (const each of [page, saving]) {
    await each.goto(`http://127.0.0.1:${server.address().port}/`);
    await each.waitForLoadState('networkidle');
  }
  const count = await generate(page, { saving });
  console.log(`${count} cards have share pages.`);
  await browser.close();
  server.close();
}
