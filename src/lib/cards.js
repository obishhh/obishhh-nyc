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

// An article's text is stored with a blank line between paragraphs. No text, no article.
const paragraphs = (text = '') => text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);

export const loadBinder = async () =>
  (await rpc('binder')).map((data) => {
    if (data.sealed) return { ...SEALED_FACE, ...data };
    const body = paragraphs(data.body);
    return { ...data, body: body.length ? body : undefined };
  });
