# Idea: bake photo filters on save

Photo filters (src/lib/looks.js) are drawn live in each visitor's browser for now. Later, the editor should make the
filtered picture when a card or Snapshot is saved and upload it beside the original, the way sealed pictures are
painted.

- **Why:** the site just shows a picture, so nothing is drawn on each visit, every browser shows exactly the same
  thing, and a photo whose host doesn't allow it to be read back (no CORS) can still be filtered.
- **Keep the original:** store the filter and the original's address with the filtered one, so switching filters
  or going back to Default is instant and lossless.
- **Clean up:** when the filter or photo changes, delete the old filtered upload, as replaced Snapshot photos are.
- **Sealed cards:** paint their blurred picture from the filtered photo, so a draft matches its live card.
- **Data:** Snapshots need their public photo fields to include the filtered address (a small change to `deck()`).
