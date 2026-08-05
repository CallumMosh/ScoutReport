import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// If env vars aren't set, the app falls back to localStorage automatically.
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
export const hasSupabase = !!supabase;
