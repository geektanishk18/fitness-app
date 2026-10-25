import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { authCredentialsSchema } from '../authContracts'
import { isSupabaseConfigured, supabase, supabaseConfigurationError } from '../lib/supabase'
import { setSyncAccount } from '../syncQueue'

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(supabaseConfigurationError)
  const [message, setMessage] = useState<string | null>(null)
  const [accountSyncAllowed, setAccountSyncAllowed] = useState(true)

  useEffect(() => {
    if (!supabase) return
    let mounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setAccountSyncAllowed(setSyncAccount(session?.user.id ?? null).allowed)
      setLoading(false)
    })
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return
      setUser(data.session?.user ?? null)
      setAccountSyncAllowed(setSyncAccount(data.session?.user.id ?? null).allowed)
      setLoading(false)
      setError(sessionError?.message ?? null)
    }).catch(() => { if (mounted) { setLoading(false); setError('Could not restore the saved Supabase session.') } })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const signIn = useCallback(async (input: { email: string; password: string }) => {
    if (!supabase) return setError(supabaseConfigurationError ?? 'Supabase authentication is unavailable in this build.')
    const parsed = authCredentialsSchema.safeParse(input)
    if (!parsed.success) return setError('Enter a valid email and a password of at least 8 characters.')
    setLoading(true); setError(null); setMessage(null)
    try { const { error: authError } = await supabase.auth.signInWithPassword(parsed.data); if (authError) setError(authError.message) }
    catch { setError('Supabase could not be reached. Your locally saved data is unchanged.') }
    finally { setLoading(false) }
  }, [])

  const signUp = useCallback(async (input: { email: string; password: string }) => {
    if (!supabase) return setError(supabaseConfigurationError ?? 'Supabase authentication is unavailable in this build.')
    const parsed = authCredentialsSchema.safeParse(input)
    if (!parsed.success) return setError('Enter a valid email and a password of at least 8 characters.')
    setLoading(true); setError(null); setMessage(null)
    try {
      const { data, error: authError } = await supabase.auth.signUp(parsed.data)
      if (authError) setError(authError.message)
      else if (!data.session) setMessage('Check your email to confirm your account.')
      else setMessage('Your account is ready.')
    } catch { setError('Supabase could not be reached. Your locally saved data is unchanged.') }
    finally { setLoading(false) }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError(null); setMessage(null)
    try {
      const { error: authError } = await supabase.auth.signOut({ scope: 'local' })
      if (authError) setError(authError.message)
      else setMessage('Signed out on this device.')
    } catch { setError('The local Supabase session could not be cleared.') }
    finally { setLoading(false) }
  }, [])

  return { configured: isSupabaseConfigured, user, loading, error, message, accountSyncAllowed, signIn, signUp, signOut }
}
