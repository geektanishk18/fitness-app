import { z } from 'zod'
import { exercises } from '../data'
import { nutritionDaySchema } from '../nutrition'
import { transformationMeasurementSchema } from '../transformation'
import type { MutationTransport, MutationTransportResult, QueuedMutation } from '../syncQueue'
import { getAuthenticatedUser, supabase } from './supabase'
import { IndexedDbProgressPhotoRepository } from './transformationRepository'

const photoRepository = new IndexedDbProgressPhotoRepository()
const setValueSchema = z.object({ weight: z.number().finite().nonnegative(), reps: z.number().int().positive(), completed: z.boolean() })
const workoutSetPayloadSchema = z.object({ exerciseId: z.string(), exerciseName: z.string().optional(), setIndex: z.number().int().nonnegative(), sessionDate: z.iso.date().optional(), set: setValueSchema })
const sessionSchema = z.object({ id: z.uuid(), status: z.enum(['in_progress', 'completed']), version: z.number().int().positive() })
const exerciseLogSchema = z.object({ id: z.uuid() })
const setLogSchema = z.object({ id: z.uuid(), weight_kg: z.number(), reps: z.number(), completed: z.boolean(), version: z.number().int().positive() })
const versionSchema = z.object({ version: z.number().int().positive() })
const profileSchema = z.object({ preferences: z.record(z.string(), z.unknown()), version: z.number().int().positive() })
const nutritionRowSchema = z.object({ id: z.uuid(), version: z.number().int().positive(), water_ml: z.number().int() })

export function withAuthenticatedOwner<T extends Record<string, unknown>>(userId: string, row: T) { return { ...row, user_id: userId } }

function failure(error: { code?: string }): MutationTransportResult {
  const reasonCode = error.code === 'PGRST205' || error.code === '42P01' ? 'schema_not_ready' : error.code === '42501' ? 'rls_denied' : error.code === '23505' ? 'duplicate_conflict' : 'supabase_request_failed'
  return error.code === '42501' || error.code === '22P02' ? { status: 'permanent_error', reasonCode } : { status: 'retryable_error', reasonCode }
}

async function stableUuid(scope: string, value: string) {
  if (z.string().uuid().safeParse(value).success) return value
  if (!globalThis.crypto?.subtle) throw new Error('Secure id derivation is unavailable.')
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${scope}:${value}`)))
  const bytes = digest.slice(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function sessionDate(mutation: QueuedMutation) {
  const fromPayload = mutation.payload.sessionDate
  if (typeof fromPayload === 'string' && z.iso.date().safeParse(fromPayload).success) return fromPayload
  return mutation.recordId.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? mutation.createdAt.slice(0, 10)
}

class SupabaseMutationTransport implements MutationTransport {
  async send(mutation: QueuedMutation): Promise<MutationTransportResult> {
    if (!supabase) return { status: 'retryable_error', reasonCode: 'supabase_not_configured' }
    const user = await getAuthenticatedUser()
    if (!user) return { status: 'retryable_error', reasonCode: 'auth_required' }
    const { data: ledger, error: ledgerError } = await supabase.from('sync_operations').select('status,server_version').eq('user_id', user.id).eq('operation_id', mutation.id).maybeSingle()
    if (ledgerError) return failure(ledgerError)
    const operation = ledger as { status: string; server_version: number | null } | null
    if (operation?.status === 'acknowledged') return { status: 'acknowledged', serverVersion: operation.server_version ?? undefined }
    if (operation?.status === 'conflict') return { status: 'conflict', serverVersion: operation.server_version ?? undefined }
    if (!operation) {
      const { error } = await supabase.from('sync_operations').insert(withAuthenticatedOwner(user.id, { operation_id: mutation.id, entity: mutation.entity, operation: mutation.operation, status: 'pending' }))
      if (error && error.code !== '23505') return failure(error)
    }
    const result = await this.apply(user.id, mutation)
    if (result.status === 'retryable_error') return result
    const status = result.status === 'acknowledged' ? 'acknowledged' : result.status === 'conflict' ? 'conflict' : 'permanent_error'
    const serverVersion = 'serverVersion' in result ? result.serverVersion ?? null : null
    const reasonCode = 'reasonCode' in result ? result.reasonCode ?? null : null
    const { error } = await supabase.from('sync_operations').update({ status, server_version: serverVersion, reason_code: reasonCode, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('operation_id', mutation.id)
    return error ? failure(error) : result
  }

  private async apply(userId: string, mutation: QueuedMutation): Promise<MutationTransportResult> {
    try {
      switch (mutation.entity) {
        case 'profile': return await this.profile(userId, mutation)
        case 'workout_set': return await this.workoutSet(userId, mutation)
        case 'workout_session': return await this.workoutSession(userId, mutation)
        case 'nutrition_day': return await this.nutritionDay(userId, mutation)
        case 'measurement': return await this.measurement(userId, mutation)
        case 'coaching_checkin': return await this.checkin(userId, mutation)
        case 'progress_photo': return await this.progressPhoto(userId, mutation)
      }
    } catch { return { status: 'retryable_error', reasonCode: 'operation_interrupted' } }
  }

  private async session(userId: string, date: string): Promise<z.infer<typeof sessionSchema>> {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.from('workout_sessions').select('id,status,version').eq('user_id', userId).eq('session_date', date).maybeSingle()
    if (error) throw error
    if (data) return sessionSchema.parse(data)
    const { data: created, error: insertError } = await supabase.from('workout_sessions').insert(withAuthenticatedOwner(userId, { session_date: date, status: 'in_progress' })).select('id,status,version').single()
    if (insertError?.code === '23505') return this.session(userId, date)
    if (insertError) throw insertError
    return sessionSchema.parse(created)
  }

  private async exerciseLog(sessionId: string, exerciseId: string, name?: string): Promise<z.infer<typeof exerciseLogSchema>> {
    if (!supabase) throw new Error('Supabase is not configured.')
    const exercise = exercises.find((candidate) => candidate.id === exerciseId)
    if (!exercise) throw new Error('Unknown exercise id.')
    const exerciseName = name ?? exercise.name
    const { data, error } = await supabase.from('exercise_logs').select('id').eq('session_id', sessionId).eq('exercise_name', exerciseName).maybeSingle()
    if (error) throw error
    if (data) return exerciseLogSchema.parse(data)
    const { data: created, error: insertError } = await supabase.from('exercise_logs').insert({ session_id: sessionId, exercise_name: exerciseName, focus: exercise.focus, sort_order: exercises.indexOf(exercise) }).select('id').single()
    if (insertError?.code === '23505') return this.exerciseLog(sessionId, exerciseId, exerciseName)
    if (insertError) throw insertError
    return exerciseLogSchema.parse(created)
  }

  private async workoutSet(userId: string, mutation: QueuedMutation): Promise<MutationTransportResult> {
    if (!supabase) return { status: 'retryable_error', reasonCode: 'supabase_not_configured' }
    const parsed = workoutSetPayloadSchema.safeParse(mutation.payload)
    if (!parsed.success) return { status: 'permanent_error', reasonCode: 'invalid_workout_set' }
    const { exerciseId, exerciseName, setIndex, set } = parsed.data
    const session = await this.session(userId, sessionDate(mutation))
    const log = await this.exerciseLog(session.id, exerciseId, exerciseName)
    const setNumber = setIndex + 1
    const { data, error } = await supabase.from('set_logs').select('id,weight_kg,reps,completed,version').eq('exercise_log_id', log.id).eq('set_number', setNumber).maybeSingle()
    if (error) return failure(error)
    if (!data) {
      const { data: inserted, error: insertError } = await supabase.from('set_logs').insert({ exercise_log_id: log.id, set_number: setNumber, weight_kg: set.weight, reps: set.reps, completed: set.completed, completed_at: set.completed ? new Date().toISOString() : null }).select('version').single()
      if (insertError?.code === '23505') return this.workoutSet(userId, mutation)
      return insertError ? failure(insertError) : { status: 'acknowledged', serverVersion: versionSchema.parse(inserted).version }
    }
    const current = setLogSchema.parse(data)
    if (current.weight_kg === set.weight && current.reps === set.reps && current.completed === set.completed) return { status: 'acknowledged', serverVersion: current.version }
    if (mutation.baseVersion === undefined || mutation.baseVersion !== current.version) return { status: 'conflict', serverVersion: current.version, canonical: current }
    const { data: updated, error: updateError } = await supabase.from('set_logs').update({ weight_kg: set.weight, reps: set.reps, completed: set.completed, completed_at: set.completed ? new Date().toISOString() : null, version: current.version + 1 }).eq('id', current.id).eq('version', current.version).select('version').maybeSingle()
    if (updateError) return failure(updateError)
    return updated ? { status: 'acknowledged', serverVersion: versionSchema.parse(updated).version } : { status: 'conflict', serverVersion: current.version, canonical: current }
  }

  private async workoutSession(userId: string, mutation: QueuedMutation): Promise<MutationTransportResult> {
    if (!supabase) return { status: 'retryable_error', reasonCode: 'supabase_not_configured' }
    const session = await this.session(userId, sessionDate(mutation))
    if (session.status === 'completed') return { status: 'acknowledged', serverVersion: session.version }
    if (mutation.baseVersion !== undefined && mutation.baseVersion !== session.version) return { status: 'conflict', serverVersion: session.version, canonical: { status: session.status } }
    const completedAt = typeof mutation.payload.completedAt === 'string' ? mutation.payload.completedAt : new Date().toISOString()
    const { data, error } = await supabase.from('workout_sessions').update({ status: 'completed', completed_at: completedAt, version: session.version + 1 }).eq('id', session.id).eq('user_id', userId).eq('version', session.version).select('version').maybeSingle()
    if (error) return failure(error)
    return data ? { status: 'acknowledged', serverVersion: versionSchema.parse(data).version } : { status: 'conflict', serverVersion: session.version }
  }

  private async profile(userId: string, mutation: QueuedMutation): Promise<MutationTransportResult> {
    if (!supabase) return { status: 'retryable_error', reasonCode: 'supabase_not_configured' }
    const key = mutation.recordId === 'training-preferences' ? 'trainingPreferences' : mutation.recordId === 'nutrition-targets' ? 'nutritionTargets' : 'settings'
    const patch: Record<string, unknown> = { [key]: key === 'settings' ? mutation.payload : mutation.payload[key] ?? mutation.payload }
    const { data, error } = await supabase.from('user_preferences').select('preferences,version').eq('user_id', userId).maybeSingle()
    if (error) return failure(error)
    if (!data) {
      const { data: inserted, error: insertError } = await supabase.from('user_preferences').insert(withAuthenticatedOwner(userId, { preferences: patch, version: 1 })).select('version').single()
      if (insertError?.code === '23505') return this.profile(userId, mutation)
      return insertError ? failure(insertError) : { status: 'acknowledged', serverVersion: versionSchema.parse(inserted).version }
    }
    const current = profileSchema.parse(data)
    if (JSON.stringify(current.preferences[key]) === JSON.stringify(patch[key])) return { status: 'acknowledged', serverVersion: current.version }
    if (mutation.baseVersion === undefined && current.preferences[key] !== undefined) return { status: 'conflict', serverVersion: current.version, canonical: current.preferences }
    if (mutation.baseVersion !== undefined && current.version !== mutation.baseVersion) return { status: 'conflict', serverVersion: current.version, canonical: current.preferences }
    const { data: updated, error: updateError } = await supabase.from('user_preferences').update({ preferences: { ...current.preferences, ...patch }, version: current.version + 1, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('version', current.version).select('version').maybeSingle()
    if (updateError) return failure(updateError)
    return updated ? { status: 'acknowledged', serverVersion: versionSchema.parse(updated).version } : { status: 'conflict', serverVersion: current.version, canonical: current.preferences }
  }

  private async nutritionDay(userId: string, mutation: QueuedMutation): Promise<MutationTransportResult> {
    if (!supabase) return { status: 'retryable_error', reasonCode: 'supabase_not_configured' }
    const parsed = nutritionDaySchema.safeParse(mutation.payload)
    if (!parsed.success) return { status: 'permanent_error', reasonCode: 'invalid_nutrition_day' }
    const day = parsed.data
    const { data, error } = await supabase.from('nutrition_days').select('id,version,water_ml').eq('user_id', userId).eq('local_date', day.date).maybeSingle()
    if (error) return failure(error)
    let dayId: string
    let currentVersion = 0
    if (!data) {
      const { data: inserted, error: insertError } = await supabase.from('nutrition_days').insert(withAuthenticatedOwner(userId, { local_date: day.date, water_ml: day.waterMl, version: 1 })).select('id,version,water_ml').single()
      if (insertError?.code === '23505') return this.nutritionDay(userId, mutation)
      if (insertError) return failure(insertError)
      const row = nutritionRowSchema.parse(inserted); dayId = row.id; currentVersion = row.version
    } else {
      const row = nutritionRowSchema.parse(data); dayId = row.id; currentVersion = row.version
      if (mutation.baseVersion === undefined || mutation.baseVersion !== row.version) return { status: 'conflict', serverVersion: row.version, canonical: { date: day.date, waterMl: row.water_ml } }
    }
    const clientIds: string[] = []
    for (const entry of day.entries) {
      const id = await stableUuid(userId, `nutrition-entry:${day.date}:${entry.id}`)
      clientIds.push(id)
      const { error: entryError } = await supabase.from('nutrition_entries').upsert({ id, nutrition_day_id: dayId, food_id: entry.foodId, food_name: entry.foodName, meal_category: entry.category, serving_grams: entry.servingGrams, quantity: entry.quantity, calories_per_100g: entry.caloriesPer100g, protein_per_100g: entry.proteinPer100g, carbs_per_100g: entry.carbsPer100g, fat_per_100g: entry.fatPer100g }, { onConflict: 'id' })
      if (entryError) return failure(entryError)
    }
    const { data: remoteEntries, error: listError } = await supabase.from('nutrition_entries').select('id').eq('nutrition_day_id', dayId)
    if (listError) return failure(listError)
    const staleIds = ((remoteEntries ?? []) as Array<{ id: string }>).map((entry) => entry.id).filter((id) => !clientIds.includes(id))
    if (staleIds.length) {
      const { error: deleteError } = await supabase.from('nutrition_entries').delete().eq('nutrition_day_id', dayId).in('id', staleIds)
      if (deleteError) return failure(deleteError)
    }
    if (currentVersion === 0) return { status: 'acknowledged', serverVersion: 1 }
    const { data: updated, error: updateError } = await supabase.from('nutrition_days').update({ water_ml: day.waterMl, version: currentVersion + 1, updated_at: new Date().toISOString() }).eq('id', dayId).eq('version', currentVersion).select('version').maybeSingle()
    if (updateError) return failure(updateError)
    return updated ? { status: 'acknowledged', serverVersion: versionSchema.parse(updated).version } : { status: 'conflict', serverVersion: currentVersion }
  }

  private async measurement(userId: string, mutation: QueuedMutation): Promise<MutationTransportResult> {
    if (!supabase) return { status: 'retryable_error', reasonCode: 'supabase_not_configured' }
    if (mutation.operation === 'delete') {
      const id = await stableUuid(userId, `measurement:${mutation.recordId}`)
      const { error } = await supabase.from('body_measurements').delete().eq('user_id', userId).eq('id', id)
      return error ? failure(error) : { status: 'acknowledged' }
    }
    const parsed = transformationMeasurementSchema.safeParse(mutation.payload)
    if (!parsed.success) return { status: 'permanent_error', reasonCode: 'invalid_measurement' }
    const record = parsed.data
    const id = await stableUuid(userId, `measurement:${record.id}`)
    const values = { measured_at: record.date, weight_kg: record.weightKg ?? null, waist_cm: record.waistCm ?? null, chest_cm: record.chestCm ?? null, hips_cm: record.hipsCm ?? null, left_arm_cm: record.leftArmCm ?? null, right_arm_cm: record.rightArmCm ?? null, left_thigh_cm: record.leftThighCm ?? null, right_thigh_cm: record.rightThighCm ?? null, neck_cm: record.neckCm ?? null, note: record.note ?? null }
    const { data, error } = await supabase.from('body_measurements').select('id,version,measured_at,weight_kg,waist_cm,chest_cm,hips_cm,left_arm_cm,right_arm_cm,left_thigh_cm,right_thigh_cm,neck_cm,note').eq('user_id', userId).eq('id', id).maybeSingle()
    if (error) return failure(error)
    if (!data) {
      const { data: inserted, error: insertError } = await supabase.from('body_measurements').insert(withAuthenticatedOwner(userId, { id, ...values, version: 1 })).select('version').single()
      return insertError ? failure(insertError) : { status: 'acknowledged', serverVersion: versionSchema.parse(inserted).version }
    }
    const current = data as typeof values & { id: string; version: number }
    if (Object.entries(values).every(([key, value]) => current[key as keyof typeof values] === value)) return { status: 'acknowledged', serverVersion: current.version }
    if (mutation.baseVersion === undefined || mutation.baseVersion !== current.version) return { status: 'conflict', serverVersion: current.version, canonical: current }
    const { data: updated, error: updateError } = await supabase.from('body_measurements').update({ ...values, version: current.version + 1 }).eq('id', id).eq('user_id', userId).eq('version', current.version).select('version').maybeSingle()
    if (updateError) return failure(updateError)
    return updated ? { status: 'acknowledged', serverVersion: versionSchema.parse(updated).version } : { status: 'conflict', serverVersion: current.version, canonical: current }
  }

  private async checkin(userId: string, mutation: QueuedMutation): Promise<MutationTransportResult> {
    if (!supabase) return { status: 'retryable_error', reasonCode: 'supabase_not_configured' }
    const id = await stableUuid(userId, `checkin:${mutation.recordId}`)
    if (mutation.operation === 'delete') {
      const { error } = await supabase.from('coaching_checkins').delete().eq('user_id', userId).eq('id', id)
      return error ? failure(error) : { status: 'acknowledged' }
    }
    const { error } = await supabase.from('coaching_checkins').upsert(withAuthenticatedOwner(userId, { id, checked_in_at: mutation.payload.checkedInAt, energy: mutation.payload.energy, focus: mutation.payload.focus, note: mutation.payload.responseTitle }), { onConflict: 'id' })
    return error ? failure(error) : { status: 'acknowledged' }
  }

  private async progressPhoto(userId: string, mutation: QueuedMutation): Promise<MutationTransportResult> {
    if (!supabase) return { status: 'retryable_error', reasonCode: 'supabase_not_configured' }
    const id = await stableUuid(userId, `progress-photo:${mutation.recordId}`)
    if (mutation.operation === 'delete') {
      const { data, error } = await supabase.from('progress_photos').select('object_path').eq('user_id', userId).eq('id', id).maybeSingle()
      if (error) return failure(error)
      if (data?.object_path) {
        const { error: storageError } = await supabase.storage.from('progress-photos').remove([data.object_path])
        if (storageError) return storageError.status === 403 ? { status: 'permanent_error', reasonCode: 'rls_denied' } : { status: 'retryable_error', reasonCode: 'storage_request_failed' }
        const { error: deleteError } = await supabase.from('progress_photos').delete().eq('user_id', userId).eq('id', id)
        if (deleteError) return failure(deleteError)
      }
      return { status: 'acknowledged' }
    }
    const { data: existing, error } = await supabase.from('progress_photos').select('id').eq('user_id', userId).eq('id', id).maybeSingle()
    if (error) return failure(error)
    if (existing) return { status: 'acknowledged' }
    const localId = typeof mutation.payload.id === 'string' ? mutation.payload.id : mutation.recordId
    const photo = (await photoRepository.list()).find((item) => item.id === localId)
    if (!photo) return { status: 'permanent_error', reasonCode: 'local_photo_missing' }
    const extension = photo.mimeType === 'image/png' ? 'png' : photo.mimeType === 'image/webp' ? 'webp' : 'jpg'
    const path = `${userId}/${id}.${extension}`
    const { error: uploadError } = await supabase.storage.from('progress-photos').upload(path, photo.blob, { contentType: photo.mimeType, upsert: false })
    if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) return uploadError.status === 403 ? { status: 'permanent_error', reasonCode: 'rls_denied' } : { status: 'retryable_error', reasonCode: 'storage_upload_failed' }
    const { error: insertError } = await supabase.from('progress_photos').insert(withAuthenticatedOwner(userId, { id, object_path: path, captured_on: photo.date, content_type: photo.mimeType }))
    return insertError ? failure(insertError) : { status: 'acknowledged' }
  }
}

export const supabaseMutationTransport: MutationTransport = new SupabaseMutationTransport()
