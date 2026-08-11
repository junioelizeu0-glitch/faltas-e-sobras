// Server-side Supabase client using the service role key.
// Bypasses RLS — only imported dynamically inside server function handlers
// after the site-gate session check (requireUnlockedSession).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function makeFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    headers.set("apikey", key);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${key}`);
    }
    return fetch(input, { ...init, headers });
  };
}

export function getServerSupabase() {
  const url =
    (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
    "https://mmjiengtszgchogyhuon.supabase.co";

  const key =
    (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_PUBLISHABLE_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    "sb_publishable_XUESwKupgR1i-y5Ad7r1uQ_Jh64YHVG";
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
