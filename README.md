# obishhh.nyc

Source for [obishhh.nyc](https://obishhh.nyc), served by GitHub Pages from `main`.

The cards live in Supabase. Edit, reorder, draft and publish them in the editor’s room at [/admin/](https://obishhh.nyc/admin/). Drafts show up sealed on the site until they’re published. Schema changes go in `supabase/migrations/`.

The home page and the editor's room each list every module they load in their HTML, so they all download at once. After adding, removing or moving an import, run `node scripts/preloads.mjs` (or `node scripts/preloads.mjs --check` to see if it's needed).
