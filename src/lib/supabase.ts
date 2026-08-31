import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = createClient(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabasePublishableKey || 'supabase-not-configured',
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  },
)

export async function ensureAnonymousSession() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase ainda não está conectado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session

  const { data: signedIn, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  if (!signedIn.session) throw new Error('Supabase did not return an anonymous session.')

  return signedIn.session
}
