import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  if (!url || !secretKey) {
    throw new Error("SUPABASE_URL ve SUPABASE_SECRET_KEY ayarlanmamis");
  }
  client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function getSupabaseAnon(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL ve SUPABASE_ANON_KEY ayarlanmamis");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
