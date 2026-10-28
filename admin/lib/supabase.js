import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_KEY, SUPABASE_URL } from '../../src/lib/supabase.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
