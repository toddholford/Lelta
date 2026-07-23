import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Null when env vars are missing — the app then runs in demo mode with
 * in-memory data so the UI is explorable before Supabase is set up.
 *
 * flowType 'implicit' makes magic links cross-device: the tokens arrive in the
 * URL fragment itself, so a link requested on the laptop can be opened on the
 * phone. (The PKCE default requires the code verifier stored on the requesting
 * device, so the link only works where it was requested.)
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          flowType: 'implicit',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null

export const isDemoMode = supabase === null
