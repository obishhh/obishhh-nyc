import { supabase } from './supabase.js';

const LIST_COLUMNS = 'id, title, kind, status, updated_at';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

const posts = () => supabase.from('posts');

export const listPosts = async () =>
  unwrap(await posts().select(LIST_COLUMNS).order('updated_at', { ascending: false }));

export const getPost = async (id) => unwrap(await posts().select().eq('id', id).single());

export const savePost = async (id, fields) =>
  unwrap(await (id ? posts().update(fields).eq('id', id) : posts().insert(fields)).select().single());

export const deletePost = async (id) => unwrap(await posts().delete().eq('id', id));

export const isSlugTaken = (error) => error?.code === '23505';
