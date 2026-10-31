import { supabase, unwrap } from './supabase.js';

const deck = () => supabase.from('deck');

// Rows use the database's column names; everything else uses the deck card components'.
const fromRow = ({ posted_on: date, ...row }) => ({ ...row, date });

const toRow = ({ kind, number, type, title, text, rule, place, link, photo, date }, status) =>
  ({ status, kind, number, type, title, text, rule, place, link, photo, posted_on: date });

// Newest first, the way the deck box shows them.
export const listDeck = async () =>
  unwrap(await deck().select().order('posted_on', { ascending: false }).order('created_at', { ascending: false })).map(fromRow);

// The number's the card's link, so the database holds it to what a link can be, and to one live card each.
const NUMBER_TROUBLE = {
  deck_number_shape: 'A number can only have letters, digits, dots, dashes and slashes.',
  deck_published_key: 'Another live card already has that number.',
};

export async function saveDeckCard(id, data, status) {
  const row = toRow(data, status);
  const saved = await (id ? deck().update(row).eq('id', id) : deck().insert(row)).select().single();
  const trouble = Object.keys(NUMBER_TROUBLE).find((name) => saved.error?.message?.includes(name));
  if (trouble) throw new Error(NUMBER_TROUBLE[trouble]);
  return fromRow(unwrap(saved));
}

export const deleteDeckCard = async (id) => unwrap(await deck().delete().eq('id', id));

// Just a card's photo, and only if the card is as it was at `since`: the card as saved, or null if it had moved on.
export async function savePhoto(id, photo, since) {
  const [row] = unwrap(await deck().update({ photo }).eq('id', id).eq('updated_at', since).select());
  return row ? fromRow(row) : null;
}
