import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Singleton Supabase browser client.
 *
 * When env vars are absent (e.g. first-run before a project is provisioned)
 * we still construct a client against placeholder values so imports don't
 * throw; callers should guard real network use with `env.hasSupabase`.
 */
export const supabase: SupabaseClient = createClient(
  env.supabaseUrl || "http://localhost:54321",
  env.supabaseAnonKey || "public-anon-key-placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
