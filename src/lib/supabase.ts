import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || supabaseUrl === 'VOTRE_URL_ICI') {
  console.warn('[Supabase] URL non configurée. La synchronisation cloud est désactivée.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseUrl !== 'VOTRE_URL_ICI' && supabaseKey && supabaseKey !== '';
};
