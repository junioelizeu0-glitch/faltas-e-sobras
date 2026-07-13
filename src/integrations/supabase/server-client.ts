// Server-side Supabase client using the publishable key.
// Safe on Lovable Cloud (service role key is not available).
// App-level security is enforced by the SITE_PASSWORD cookie gate before any
// server function reaches this client.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function makeFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    // sb_ keys are opaque, not JWTs — strip default Authorization bearer.
    if ((key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) &&
        headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

export function getServerSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
  }
  return createClient<Database>(url, key, {
    global: { fetch: makeFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
