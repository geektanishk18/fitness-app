import { describe, expect, it } from 'vitest'
import { withAuthenticatedOwner } from './supabaseMutationTransport'

describe('Supabase ownership boundary', () => {
  it('always overwrites an untrusted owner identifier with the authenticated session user', () => {
    expect(withAuthenticatedOwner('session-user-id', { user_id: 'attacker-id', value: 1 })).toEqual({ user_id: 'session-user-id', value: 1 })
  })
})
