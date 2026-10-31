import { supabase, unwrap } from './supabase.js';

const cards = () => supabase.from('cards');

// Rows use the database's column names; everything else uses the card component's.
const fromRow = ({ first_print: firstPrint, ...row }) => ({ ...row, firstPrint });

const toRow = ({ number, title, type, finish, rarity, minutes, firstPrint, dex, move, stats, flavor, art, slug, body }, status) =>
  ({ status, number, title, type, finish, rarity, minutes, first_print: firstPrint, dex, move, stats, flavor, art, slug, body });

export const listCards = async () =>
  unwrap(await cards().select().order('position').order('created_at')).map(fromRow);

export async function saveCard(id, card, status) {
  const row = toRow(card, status);
  const saved = await (id ? cards().update(row).eq('id', id) : cards().insert(row)).select().single();
  if (saved.error?.code === '23505') throw new Error('Another card already uses that address.');
  return fromRow(unwrap(saved));
}

export const deleteCard = async (id) => unwrap(await cards().delete().eq('id', id));

// Just a card's art, and only if the card is as it was at `since`: the card as saved, or null if it had moved on.
export async function saveArt(id, art, since) {
  const [row] = unwrap(await cards().update({ art }).eq('id', id).eq('updated_at', since).select());
  return row ? fromRow(row) : null;
}

export const reorderCards = async (ids) => unwrap(await supabase.rpc('reorder_cards', { ids }));
