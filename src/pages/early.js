// The first thing the home page runs: the cards are asked for the moment the page is read, and their pictures as soon
// as they're back, so both are on their way while the rest of the page's code arrives.
import { askEarly } from '../lib/supabase.js';

// Fetched the way the card will ask for it, so the card finds it ready: a photo drawn in its look here is read back
// pixel by pixel, which takes asking for it that way.
function warm(src, { readBack = false } = {}) {
  if (typeof src !== 'string' || !/^(https:\/\/|\/(?!\/))/.test(src)) return;
  const image = new Image();
  if (readBack) image.crossOrigin = 'anonymous';
  image.src = src;
}

// What a card shows: its look's picture if it has one, the photo otherwise (drawn here if it has a look).
function warmArt(art) {
  if (!art) return;
  if (art.look && art.baked) warm(art.baked);
  else warm(art.src, { readBack: Boolean(art.look) });
}

askEarly('binder')?.then((cards) => {
  for (const card of cards) {
    if (card.sealed && card.art?.sealed) warm(card.art.sealed);
    else warmArt(card.art);
  }
}, () => {});

// Only the newest deck card shows before the box is opened.
askEarly('deck')?.then(([newest]) => {
  warmArt(newest?.photo);
  if (newest?.photo?.second?.src) warmArt({ ...newest.photo.second, look: newest.photo.look });
}, () => {});

warm('/assets/tabs/top.webp');
warm('/assets/deck/box-front.webp');
