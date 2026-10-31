export const SUPABASE_URL = 'https://sevwmqmzawqldbnoyeng.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_GYYPD8WhHH8K-CwCmSwtvA_AXjINfCp';

// Always asked fresh: a kept copy could show an old binder, or one answered for another address and refused here.
async function ask(name) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { headers: { apikey: SUPABASE_KEY }, cache: 'no-store' });
  if (!response.ok) throw new Error(`${name} failed with ${response.status}`);
  return response.json();
}

// Asked as the page is read, before the rest of its code has arrived (see src/pages/early.js): the first to ask after
// gets that answer, and anyone after that asks again.
const early = new Map();
const used = new Set();

export function askEarly(name) {
  if (!used.has(name) && !early.has(name)) early.set(name, ask(name));
  return early.get(name) ?? null;
}

export function rpc(name) {
  used.add(name);
  const answer = early.get(name);
  early.delete(name);
  return answer ?? ask(name);
}
