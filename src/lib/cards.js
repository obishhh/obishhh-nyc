import { rpc } from './supabase.js';

// Sealed cards arrive without their words. This stands in under the blur.
const SEALED_FACE = {
  title: 'Sealed',
  minutes: 0,
  dex: 'Not printed yet.',
  move: { name: 'Coming Soon', text: 'Still at the printer. Check back later.', score: 0 },
  stats: { weakness: '', resistance: '', filed: '?' },
  flavor: null,
};

// The deck box's published notes and Snapshots, newest first.
export const loadDeck = () => rpc('deck');

// A published card with no text has no article, so it just flips; nor does one with no address to open it at.
export const loadBinder = async () =>
  (await rpc('binder')).map((data) =>
    data.sealed ? { ...SEALED_FACE, ...data } : { ...data, body: (data.slug && data.body?.trim()) || undefined });
