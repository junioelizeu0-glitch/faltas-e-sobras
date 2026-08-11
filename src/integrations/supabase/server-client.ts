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
    "https://fqffsqgzlkahqcshpxom.supabase.co";

  const key =
    (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZmZzcWd6bGthaHFjc2hweG9tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjEyMTA0OSwiZXhwIjoyMTAxNjk3MDQ5fQ.AelO7YcxqagVpX-8NI3E90Mw5NtzxKhuWq3iPI6mssA";
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
