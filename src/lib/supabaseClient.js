import { createClient } from '@supabase/supabase-js'

// Read from environment variables ONLY. Keys are never hardcoded.
// The publishable (anon) key is safe for the browser; the secret key must never
// be used here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

if (!isSupabaseConfigured) {
  // Fail loud in dev, but don't crash the whole app — the Home page surfaces
  // a clear message to the user/developer.
  console.error(
    '[Supabase] Missing env vars. Expected VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY. Check your .env file.',
  )
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null

/**
 * Lightweight connectivity check.
 * Pings the Supabase Auth health endpoint, which is reachable with the public
 * publishable key (the REST schema root now requires a secret key, so it is not
 * used here). A 200 proves the project URL is correct, awake, and responding.
 * A thrown error means we could not reach Supabase at all (bad URL / offline).
 */
export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured) {
    return { ok: false, reason: 'Environment variables are not set.' }
  }
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseKey },
    })
    if (res.ok) {
      return { ok: true, status: res.status }
    }
    return { ok: false, reason: `Reached Supabase but got HTTP ${res.status}.` }
  } catch (err) {
    return { ok: false, reason: `Could not reach Supabase: ${err.message}` }
  }
}
