# obishhh.nyc

Source for [obishhh.nyc](https://obishhh.nyc), served by GitHub Pages from `main`.

The cards live in Supabase. Edit, reorder, draft and publish them in the editor’s room at [/admin/](https://obishhh.nyc/admin/). A binder card shows up sealed on the site until it’s published; a deck card doesn’t show at all. Schema changes go in `supabase/migrations/`.

Every page with a script lists every module it loads in its HTML, so they all download at once: the home page, the editor’s room, the credits and the 404 page. After adding, removing or moving an import, run `node scripts/preloads.mjs`. A push checks the lists are up to date (`.github/workflows/checks.yml`; `node scripts/preloads.mjs --check` does the same).

Each published deck card and article has a page of its own, so a link to it shows the card in a message: `d/<number>/` and `c/<slug>/`, drawn by `scripts/share-pages.mjs`. `.github/workflows/share-pages.yml` runs it every ten minutes and on every push to `main`, and commits what changed. Leave `d/` and `c/` to it.

The energy notes’ paintings are made once, by `node scripts/energy-art.mjs [type …]`, into `assets/energy/`. Both scripts draw in a browser: `npm i --no-save playwright` first.
