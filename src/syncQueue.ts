import { z } from 'zod'

export const mutationSchema = z.object({ id: z.string().min(1), entity: z.enum(['workout_set', 'workout_session', 'nutrition_day', 'measurement', 'profile', 'coaching_checkin', 'progress_photo']), operation: z.enum(['upsert', 'delete']), recordId: z.string().min(1), payload: z.record(z.string(), z.unknown()), createdAt: z.string(), attempts: z.number().int().nonnegative(), status: z.enum(['pending', 'blocked']), syncUserId: z.string().min(1).nullable().optional(), baseVersion: z.number().int().nonnegative().optional() })
export type QueuedMutation = z.infer<typeof mutationSchema>
export type MutationInput = Pick<QueuedMutation, 'entity' | 'operation' | 'recordId' | 'payload'>
export type MutationTransportResult = { status: 'acknowledged'; serverVersion?: number } | { status: 'conflict'; serverVersion?: number; canonical?: unknown } | { status: 'retryable_error'; reasonCode?: string } | { status: 'permanent_error'; reasonCode?: string }
export interface MutationTransport { send(mutation: QueuedMutation): Promise<MutationTransportResult> }
const queueKey = 'v-taper-offline-mutations'
const accountKey = 'v-taper-sync-account'
const remoteVersionsKey = 'v-taper-sync-versions'
let activeSyncAccountId: string | null = null
let queueRevision = 0
const queueListeners = new Set<() => void>()
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`
function notifyQueueChanged() { queueRevision++; for (const listener of queueListeners) listener() }
export function subscribeMutationQueue(listener: () => void) { queueListeners.add(listener); return () => queueListeners.delete(listener) }
export function getMutationQueueRevision() { return queueRevision }
function boundAccountId() { try { return localStorage.getItem(accountKey) } catch { return null } }
function versionMap(): Record<string, number> { try { return JSON.parse(localStorage.getItem(remoteVersionsKey) ?? '{}') as Record<string, number> } catch { return {} } }
function versionMapKey(entity: QueuedMutation['entity'], recordId: string) { return `${activeSyncAccountId}:${entity}:${recordId}` }
export function setSyncAccount(userId: string | null) {
  activeSyncAccountId = userId
  if (!userId) return { allowed: !boundAccountId(), ownerId: boundAccountId() }
  try {
    const existing = boundAccountId()
    if (existing && existing !== userId) return { allowed: false, ownerId: existing }
    if (!existing) {
      const localOnlyQueue = loadMutationQueue().map((mutation) => ({ ...mutation, syncUserId: null }))
      localStorage.setItem(queueKey, JSON.stringify(localOnlyQueue))
      localStorage.setItem(accountKey, userId)
      notifyQueueChanged()
    }
    return { allowed: true, ownerId: userId }
  } catch { return { allowed: false, ownerId: boundAccountId() } }
}
export function loadMutationQueue(): QueuedMutation[] { try { const parsed: unknown = JSON.parse(localStorage.getItem(queueKey) ?? '[]'); return z.array(mutationSchema).parse(parsed) } catch { return [] } }
export function enqueueMutation(input: MutationInput): QueuedMutation {
  const ownerId = boundAccountId()
  if (ownerId && ownerId !== activeSyncAccountId) throw new Error('The local sync queue belongs to a different account. Sign in to that account before queuing sync changes.')
  const baseVersion = activeSyncAccountId ? versionMap()[versionMapKey(input.entity, input.recordId)] : undefined
  const mutation = mutationSchema.parse({ ...input, id: makeId(), createdAt: new Date().toISOString(), attempts: 0, status: 'pending', syncUserId: activeSyncAccountId && activeSyncAccountId === ownerId ? activeSyncAccountId : null, ...(baseVersion === undefined ? {} : { baseVersion }) })
  const queue = loadMutationQueue()
  const existing = queue.findIndex((item) => item.entity === mutation.entity && item.recordId === mutation.recordId && item.operation === mutation.operation)
  if (existing >= 0) queue.splice(existing, 1)
  queue.push(mutation)
  try { localStorage.setItem(queueKey, JSON.stringify(queue)); notifyQueueChanged() } catch { throw new Error('Local storage is full. Export or remove stored data before continuing.') }
  return mutation
}
export async function processMutationQueue(transport: MutationTransport): Promise<{ acknowledged: number; conflicts: number; failed: number }> {
  const queue = loadMutationQueue(); let acknowledged = 0; let conflicts = 0; let failed = 0
  if (!activeSyncAccountId || boundAccountId() !== activeSyncAccountId) return { acknowledged, conflicts, failed: Math.max(1, queue.length) }
  for (const mutation of queue) {
    if (mutation.syncUserId !== activeSyncAccountId) continue
    if (mutation.status === 'blocked') break
    try {
      if (mutation.baseVersion === undefined && activeSyncAccountId) mutation.baseVersion = versionMap()[versionMapKey(mutation.entity, mutation.recordId)]
      const result = await transport.send(mutation)
      if (result.status === 'conflict') { mutation.status = 'blocked'; conflicts++; break }
      if (result.status === 'permanent_error') { mutation.status = 'blocked'; failed++; break }
      if (result.status === 'retryable_error') { mutation.attempts++; failed++; break }
      queue.splice(queue.indexOf(mutation), 1); acknowledged++
      if (result.serverVersion !== undefined) {
        try { localStorage.setItem(remoteVersionsKey, JSON.stringify({ ...versionMap(), [versionMapKey(mutation.entity, mutation.recordId)]: result.serverVersion })) } catch { failed++ }
      }
    } catch { mutation.attempts++; failed++; break }
  }
  try { localStorage.setItem(queueKey, JSON.stringify(queue)) } catch { failed++ }
  return { acknowledged, conflicts, failed }
}
