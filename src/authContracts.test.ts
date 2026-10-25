import { describe, expect, it } from 'vitest'
import { authCredentialsSchema, resolveSupabasePublicConfig } from './authContracts'

describe('Supabase public auth configuration', () => {
  it('prefers Marketplace publishable variables and resolves no secrets', () => {
    expect(resolveSupabasePublicConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://fitness.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public' })).toEqual({ config: { url: 'https://fitness.supabase.co', key: 'sb_publishable_public' }, error: null })
  })
  it('rejects partial public configuration', () => {
    expect(resolveSupabasePublicConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://fitness.supabase.co' }).error).toMatch(/configured together/)
  })
  it('does not treat a server-only service-role value as browser configuration', () => {
    expect(resolveSupabasePublicConfig({})).toEqual({ config: null, error: null })
  })
  it('validates sign-in credentials before calling Supabase', () => {
    expect(authCredentialsSchema.safeParse({ email: 'not-email', password: 'short' }).success).toBe(false)
    expect(authCredentialsSchema.safeParse({ email: 'athlete@example.com', password: 'correct-horse' }).success).toBe(true)
  })
})
