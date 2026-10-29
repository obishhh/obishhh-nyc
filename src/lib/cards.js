import { rpc } from './supabase.js';

// Sealed cards arrive without their words. This stands in under the blur.
const SEALED_FACE = {
  title: 'Sealed',
  stage: 'Basic',
  minutes: 0,
  dex: 'Not printed yet.',
  move: { name: 'Coming Soon', text: 'Still at the printer. Check back later.', score: 0 },
  stats: { reads: '0', replies: '0', filed: '?' },
  flavor: null,
};

// A published card with no text has no article, so it just flips.
export const loadBinder = async () =>
  (await rpc('binder')).map((data) =>
    data.sealed ? { ...SEALED_FACE, ...data } : { ...data, body: data.body?.trim() || undefined });
