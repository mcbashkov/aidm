/**
 * Tipe database Supabase.
 *
 * Regenerasi tipe akurat setelah skema diterapkan ke project:
 *   supabase gen types typescript --project-id <ref> --schema public > types/database.ts
 *
 * Untuk M0, klien server memakai supabase-js tanpa generic (untyped) sehingga
 * file ini belum wajib di-wire. Placeholder di bawah menjaga import tetap valid.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
