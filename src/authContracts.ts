import { z } from 'zod'

export const authCredentialsSchema = z.object({ email: z.email(), password: z.string().min(8).max(128) })
export const supabasePublicConfigSchema = z.object({ url: z.url(), key: z.string().min(1) })

export type SupabasePublicVariables = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
}

export function resolveSupabasePublicConfig(environment: SupabasePublicVariables) {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL || environment.VITE_SUPABASE_URL || ''
  const key = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || environment.NEXT_PUBLIC_SUPABASE_ANON_KEY || environment.VITE_SUPABASE_ANON_KEY || ''
  if (!url && !key) return { config: null, error: null }
  if (!url || !key) return { config: null, error: 'Supabase public URL and publishable/anon key must be configured together.' }
  const parsed = supabasePublicConfigSchema.safeParse({ url, key })
  return parsed.success ? { config: parsed.data, error: null } : { config: null, error: 'Supabase public configuration is invalid.' }
}
