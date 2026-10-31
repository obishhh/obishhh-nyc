export const SUPABASE_URL = 'https://sevwmqmzawqldbnoyeng.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_GYYPD8WhHH8K-CwCmSwtvA_AXjINfCp';

// Always asked fresh: a kept copy could show an old binder, or one answered for another address and refused here.
export async function rpc(name) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { headers: { apikey: SUPABASE_KEY }, cache: 'no-store' });
  if (!response.ok) throw new Error(`${name} failed with ${response.status}`);
  return response.json();
}
