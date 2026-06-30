import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when both env vars are present. The app degrades to a clear setup
 *  screen instead of throwing a cryptic error when they're missing. */
export const isSupabaseConfigured = Boolean(url && anonKey)

// A single shared client. `as string` is safe: every call site is gated on
// isSupabaseConfigured (see App.tsx), so we never reach Supabase unconfigured.
export const supabase = createClient(url as string, anonKey as string, {
  realtime: { params: { eventsPerSecond: 5 } },
})
