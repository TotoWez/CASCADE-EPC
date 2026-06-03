/**
 * Centralised, validated environment access.
 * Keeps `import.meta.env` reads in one place and surfaces a clear error
 * (rather than a silent failure) when Supabase config is missing.
 */
const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const env = {
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  appName: import.meta.env.VITE_APP_NAME ?? "CASCADE-EPC",
  /** True only when both Supabase values are present. */
  hasSupabase: Boolean(url) && Boolean(anonKey),
} as const;
