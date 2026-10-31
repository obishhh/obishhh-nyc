import { supabase, unwrap } from './supabase.js';

const deck = () => supabase.from('deck');

// Rows use the database's column names; everything else uses the deck card components'.
const fromRow = ({ posted_on: date, ...row }) => ({ ...row, date });

const toRow = ({ kind, number, type, title, text, rule, place, photo, date }, status) =>
  ({ status, kind, number, type, title, text, rule, place, photo, posted_on: date });

// Newest first, the way the deck box shows them.
export const listDeck = async () =>
  unwrap(await deck().select().order('posted_on', { ascending: false }).order('created_at', { ascending: false })).map(fromRow);

export async function saveDeckCard(id, data, status) {
  const row = toRow(data, status);
  return fromRow(unwrap(await (id ? deck().update(row).eq('id', id) : deck().insert(row)).select().single()));
}

export const deleteDeckCard = async (id) => unwrap(await deck().delete().eq('id', id));

// Just a card's photo, and only if the card is as it was at `since`: the card as saved, or null if it had moved on.
export async function savePhoto(id, photo, since) {
  const [row] = unwrap(await deck().update({ photo }).eq('id', id).eq('updated_at', since).select());
  return row ? fromRow(row) : null;
}
