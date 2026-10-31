// The modules a page loads, found by following its static imports (and re-exports) from where it starts. Used to list
// them for preloading and to tell when the code that draws the cards has changed.
import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

// `import … from './x.js'`, `export … from './x.js'` and a bare `import './x.js'`, in either kind of quotes.
const IMPORT = /^\s*(?:import|export)\s(?:[^'"]*?from\s+)?['"](\.{1,2}\/[^'"]+)['"]/gm;

export function reachable(root, entries) {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const code = readFileSync(join(root, file), 'utf8');
    for (const [, path] of code.matchAll(IMPORT)) {
      visit(relative(root, join(root, dirname(file), path)));
    }
  };
  entries.forEach(visit);
  return [...seen].sort();
}
