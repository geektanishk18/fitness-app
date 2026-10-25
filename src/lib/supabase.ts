import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolveSupabasePublicConfig } from '../authContracts'

const environment = { url: typeof __VT_SUPABASE_URL__ === 'undefined' ? '' : __VT_SUPABASE_URL__, key: typeof __VT_SUPABASE_PUBLIC_KEY__ === 'undefined' ? '' : __VT_SUPABASE_PUBLIC_KEY__ }
const config = resolveSupabasePublicConfig({ NEXT_PUBLIC_SUPABASE_URL: environment.url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: environment.key })
export const isSupabaseConfigured = Boolean(config.config)
export const supabaseConfigurationError = config.error
export const supabase: SupabaseClient | null = config.config ? createClient(config.config.url, config.config.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null

export async function getAuthenticatedUser() {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}
