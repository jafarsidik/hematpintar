import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function envValue(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

const supabaseUrl = envValue(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = envValue(import.meta.env.VITE_SUPABASE_ANON_KEY)

function createOptionalClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null

  try {
    const parsedUrl = new URL(supabaseUrl)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return null
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } catch {
    // Invalid configuration must not prevent the local-only app from booting.
    return null
  }
}

/**
 * Supabase is optional. Missing or invalid env keeps `supabase` null and the
 * app runs in local-only mode. Only the browser-safe anon/publishable key may
 * ever be used here; never a service role key.
 */
export const supabase = createOptionalClient()

export const isSupabaseConfigured = supabase !== null
