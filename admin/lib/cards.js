import { supabase } from './supabase.js';

const BUCKET = 'card-art';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

const cards = () => supabase.from('cards');
const art = () => supabase.storage.from(BUCKET);

// Rows use the database's column names; everything else uses the card component's.
const fromRow = ({ first_print: firstPrint, ...row }) => ({ ...row, firstPrint });

const toRow = ({ number, title, stage, type, finish, rarity, minutes, firstPrint, dex, move, stats, flavor, art }, status) =>
  ({ status, number, title, stage, type, finish, rarity, minutes, first_print: firstPrint, dex, move, stats, flavor, art });

export const listCards = async () =>
  unwrap(await cards().select().order('position').order('created_at')).map(fromRow);

export async function saveCard(id, card, status) {
  const row = toRow(card, status);
  return fromRow(unwrap(await (id ? cards().update(row).eq('id', id) : cards().insert(row)).select().single()));
}

export const deleteCard = async (id) => unwrap(await cards().delete().eq('id', id));

export const reorderCards = async (ids) => unwrap(await supabase.rpc('reorder_cards', { ids }));

const publicUrl = (name) => art().getPublicUrl(name).data.publicUrl;

export const listUploads = async () =>
  unwrap(await art().list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } }))
    .filter(({ id, name }) => id && !name.startsWith('.'))
    .map(({ name }) => publicUrl(name));

export async function uploadArt(image) {
  const name = `${crypto.randomUUID()}.${image.type.split('/')[1]}`;
  unwrap(await art().upload(name, image, { contentType: image.type, cacheControl: '31536000' }));
  return publicUrl(name);
}
