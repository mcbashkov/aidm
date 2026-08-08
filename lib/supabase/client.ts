import { createBrowserClient } from "@supabase/ssr";

/** Klien Supabase untuk browser (anon key). RLS berlaku. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
