export const SUPABASE_URL = 'https://sevwmqmzawqldbnoyeng.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_GYYPD8WhHH8K-CwCmSwtvA_AXjINfCp';

export async function rpc(name) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { headers: { apikey: SUPABASE_KEY } });
  if (!response.ok) throw new Error(`${name} failed with ${response.status}`);
  return response.json();
}
