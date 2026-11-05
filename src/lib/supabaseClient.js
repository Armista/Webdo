import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

/** true cuando el archivo .env tiene las credenciales de Supabase */
export const isSupabaseEnabled = Boolean(url && anonKey);

export const supabase = isSupabaseEnabled ? createClient(url, anonKey) : null;
