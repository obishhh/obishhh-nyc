import { supabase, unwrap } from './supabase.js';

const EMAIL_KEY = 'obishhh.admin.email';

export const rememberedEmail = () => localStorage.getItem(EMAIL_KEY);

export const forgetEmail = () => localStorage.removeItem(EMAIL_KEY);

export async function currentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  localStorage.setItem(EMAIL_KEY, email);
  return data.session;
}

// Whether this account may edit. A server that can't be reached throws, rather than answering no.
export const isAdmin = async () => unwrap(await supabase.rpc('is_admin')) === true;

export const signOut = () => supabase.auth.signOut();
