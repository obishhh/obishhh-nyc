// Lists every module the home page loads in index.html, so the browser fetches them all at once instead of finding
// each one only once the one importing it has arrived (nine rounds of that on a phone, before anything shows).
//
// Run after adding, removing or moving an import: node scripts/preloads.mjs. With --check, it only says whether the
// list is out of date (and exits 1 if it is).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PAGE = join(ROOT, 'index.html');
const ENTRY = 'src/pages/home.js';
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

const html = readFileSync(PAGE, 'utf8');
const [before, rest] = html.split(START);
const after = rest?.split(END)[1];
if (after === undefined) throw new Error(`index.html needs ${START} … ${END} where the list goes`);
const list = reachable(ENTRY).map((file) => `  <link rel="modulepreload" href="/${file}">`).join('\n');
const next = `${before}${START}\n${list}\n  ${END}${after}`;

if (process.argv.includes('--check')) {
  console.log(next === html ? 'Module list is up to date.' : 'Module list is out of date: run node scripts/preloads.mjs.');
  process.exit(next === html ? 0 : 1);
}
writeFileSync(PAGE, next);
console.log(`Listed ${reachable(ENTRY).length} modules in index.html.`);
