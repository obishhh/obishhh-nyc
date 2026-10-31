// Lists every module a page loads in its HTML, so the browser fetches them all at once instead of finding each one
// only once the one importing it has arrived (nine rounds of that on a phone, before anything shows). The home page
// and the editor's room each have their list.
//
// Run after adding, removing or moving an import: node scripts/preloads.mjs. With --check, it only says whether the
// lists are out of date (and exits 1 if they are).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PAGES = [
  { page: 'index.html', entry: 'src/pages/home.js' },
  { page: 'admin/index.html', entry: 'admin/main.js' },
];
const START = '<!-- modules: written by scripts/preloads.mjs -->';
const END = '<!-- /modules -->';

// Every module reachable from the entry by static imports (and re-exports), the entry itself left out.
function reachable(entry) {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const code = readFileSync(join(ROOT, file), 'utf8');
    for (const [, path] of code.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+'(\.{1,2}\/[^']+)'/gm)) {
      visit(relative(ROOT, join(ROOT, dirname(file), path)));
    }
  };
  visit(entry);
  seen.delete(entry);
  return [...seen].sort();
}

// A page as it is, and as it should be with its list written in.
function listed({ page, entry }) {
  const file = join(ROOT, page);
  const html = readFileSync(file, 'utf8');
  const [before, rest] = html.split(START);
  const after = rest?.split(END)[1];
  if (after === undefined) throw new Error(`${page} needs ${START} … ${END} where the list goes`);
  const modules = reachable(entry);
  const list = modules.map((module) => `  <link rel="modulepreload" href="/${module}">`).join('\n');
  return { page, file, html, next: `${before}${START}\n${list}\n  ${END}${after}`, count: modules.length };
}

const pages = PAGES.map(listed);
const stale = pages.filter(({ html, next }) => html !== next);

if (process.argv.includes('--check')) {
  console.log(stale.length
    ? `Module lists out of date in ${stale.map(({ page }) => page).join(' and ')}: run node scripts/preloads.mjs.`
    : 'Module lists are up to date.');
  process.exit(stale.length ? 1 : 0);
}
for (const { page, file, next, count } of pages) {
  writeFileSync(file, next);
  console.log(`Listed ${count} modules in ${page}.`);
}
