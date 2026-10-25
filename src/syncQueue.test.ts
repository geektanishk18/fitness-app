import { beforeEach, describe, expect, it } from 'vitest'
import { enqueueMutation, loadMutationQueue, processMutationQueue, setSyncAccount, type MutationTransport } from './syncQueue'

describe('offline mutation queue', () => {
  beforeEach(() => { localStorage.clear(); setSyncAccount(null) })
  it('retains failed mutations and marks them for retry', async () => {
    setSyncAccount('test-user')
    enqueueMutation({ entity: 'workout_set', operation: 'upsert', recordId: 'set-1', payload: { completed: true } })
    const transport: MutationTransport = { async send() { throw new Error('offline') } }
    await processMutationQueue(transport)
    expect(loadMutationQueue()[0]?.attempts).toBe(1)
    expect(loadMutationQueue()[0]?.status).toBe('pending')
  })
  it('removes acknowledged mutations and preserves ordering', async () => {
    setSyncAccount('test-user')
    enqueueMutation({ entity: 'workout_set', operation: 'upsert', recordId: 'set-1', payload: { completed: true } })
    const transport: MutationTransport = { async send() { return { status: 'acknowledged' } } }
    await processMutationQueue(transport)
    expect(loadMutationQueue()).toHaveLength(0)
  })
  it('keeps later mutations blocked behind an unresolved conflict', async () => {
    setSyncAccount('test-user')
    enqueueMutation({ entity: 'workout_set', operation: 'upsert', recordId: 'set-1', payload: { completed: true } })
    enqueueMutation({ entity: 'workout_set', operation: 'upsert', recordId: 'set-2', payload: { completed: true } })
    const transport: MutationTransport = { async send(mutation) { return mutation.recordId === 'set-1' ? { status: 'conflict' } : { status: 'acknowledged' } } }
    await processMutationQueue(transport)
    const secondRun = await processMutationQueue({ async send() { return { status: 'acknowledged' } } })
    expect(secondRun.acknowledged).toBe(0)
    expect(loadMutationQueue().map((mutation) => mutation.status)).toEqual(['blocked', 'pending'])
    expect(loadMutationQueue()[1]?.attempts).toBe(0)
  })
  it('binds an existing local queue to one account and rejects another account', () => {
    enqueueMutation({ entity: 'workout_session', operation: 'upsert', recordId: 'session:2026-10-25', payload: {} })
    expect(setSyncAccount('user-a').allowed).toBe(true)
    expect(loadMutationQueue()[0]?.syncUserId).toBeNull()
    expect(setSyncAccount('user-b')).toEqual({ allowed: false, ownerId: 'user-a' })
    expect(() => enqueueMutation({ entity: 'workout_session', operation: 'upsert', recordId: 'session:2026-10-26', payload: {} })).toThrow(/different account/)
  })
  it('persists server versions for subsequent offline mutations', async () => {
    setSyncAccount('user-a')
    enqueueMutation({ entity: 'workout_set', operation: 'upsert', recordId: 'set-1', payload: { reps: 8 } })
    await processMutationQueue({ async send() { return { status: 'acknowledged', serverVersion: 4 } } })
    const next = enqueueMutation({ entity: 'workout_set', operation: 'upsert', recordId: 'set-1', payload: { reps: 9 } })
    expect(next.baseVersion).toBe(4)
  })
})
