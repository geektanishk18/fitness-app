import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getMutationQueueRevision, loadMutationQueue, processMutationQueue, subscribeMutationQueue } from '../syncQueue'
import { supabaseMutationTransport } from '../lib/supabaseMutationTransport'

export type SyncState = 'local_only' | 'account_mismatch' | 'offline' | 'ready' | 'syncing' | 'pending' | 'conflict'

export function useSupabaseSync(input: { userId: string | null; configured: boolean; accountAllowed: boolean; online: boolean; refreshPendingCount: () => void }) {
  const revision = useSyncExternalStore(subscribeMutationQueue, getMutationQueueRevision, getMutationQueueRevision)
  const [state, setState] = useState<SyncState>('local_only')
  const [retry, setRetry] = useState(0)
  const inFlight = useRef(false)
  const repeatRequested = useRef(false)
  const queued = loadMutationQueue()
  const pending = input.userId ? queued.filter((mutation) => mutation.syncUserId === input.userId).length : 0
  const localOnly = queued.filter((mutation) => !mutation.syncUserId).length
  const otherAccount = queued.filter((mutation) => Boolean(mutation.syncUserId) && mutation.syncUserId !== input.userId).length

  useEffect(() => { input.refreshPendingCount() }, [input.refreshPendingCount, revision])

  useEffect(() => {
    if (!input.configured || !input.userId) { setState('local_only'); return }
    if (!input.accountAllowed) { setState('account_mismatch'); return }
    if (!input.online) { setState('offline'); return }
    if (pending === 0) { setState(localOnly > 0 ? 'local_only' : 'ready'); return }
    if (inFlight.current) { repeatRequested.current = true; return }

    inFlight.current = true
    setState('syncing')
    void processMutationQueue(supabaseMutationTransport).then((result) => {
      input.refreshPendingCount()
      if (result.conflicts > 0) setState('conflict')
      else if (result.failed > 0) setState('pending')
      else setState(localOnly > 0 ? 'local_only' : 'ready')
    }).catch(() => setState('pending')).finally(() => {
      inFlight.current = false
      if (repeatRequested.current) { repeatRequested.current = false; setRetry((value) => value + 1) }
    })
  }, [input.accountAllowed, input.configured, input.online, input.refreshPendingCount, input.userId, pending, retry, revision])

  return { state, pending, localOnly, otherAccount }
}
