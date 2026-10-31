import { supabase, unwrap } from './supabase.js';

const pokedex = () => supabase.from('pokedex');

// Rows use the database's column names; everything else uses the Pokédex components'.
const fromRow = ({ dex_number: dex, card_set: set, card_number: number, ...row }) => ({ ...row, dex, set, number });

const toRow = ({ name, dex, set, number, note, photo }, status) =>
  ({ status, name, dex_number: dex, card_set: set, card_number: number, note, photo });

export const listPokedex = async () => unwrap(await pokedex().select().order('position').order('created_at')).map(fromRow);

export async function savePull(id, data, status) {
  const row = toRow(data, status);
  return fromRow(unwrap(await (id ? pokedex().update(row).eq('id', id) : pokedex().insert(row)).select().single()));
}

export const deletePull = async (id) => unwrap(await pokedex().delete().eq('id', id));

export const reorderPokedex = async (ids) => unwrap(await supabase.rpc('reorder_pokedex', { ids }));
