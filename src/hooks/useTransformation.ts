import { useCallback, useEffect, useState } from 'react'
import { LocalTransformationRepository, IndexedDbProgressPhotoRepository, type ProgressPhoto } from '../lib/transformationRepository'
import { createMeasurement, type MeasurementInput, type TransformationMeasurement } from '../transformation'
import { enqueueMutation, loadMutationQueue } from '../syncQueue'
import { supabase } from '../lib/supabase'

const measurementRepository = new LocalTransformationRepository()
const photoRepository = new IndexedDbProgressPhotoRepository()

export function useTransformation(userId: string | null = null, online = true) {
  const [records, setRecords] = useState<TransformationMeasurement[]>([])
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setRecords(measurementRepository.listMeasurements())
      setPhotos(await photoRepository.list())
      setError(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Transformation records could not be loaded.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    const client = supabase
    if (!userId || !online || !client) return
    let cancelled = false
    const hydrate = async () => {
      const { data, error: readError } = await client.from('body_measurements').select('id,measured_at,weight_kg,waist_cm,chest_cm,hips_cm,left_arm_cm,right_arm_cm,left_thigh_cm,right_thigh_cm,neck_cm,note').eq('user_id', userId).order('measured_at', { ascending: false }).limit(200)
      if (cancelled) return
      if (readError) { setError('Cloud measurements could not be loaded. Local records remain available.'); return }
      const local = measurementRepository.listMeasurements()
      const localDates = new Set(local.map((record) => record.date))
      const hasPendingMeasurements = loadMutationQueue().some((mutation) => mutation.syncUserId === userId && mutation.entity === 'measurement')
      if (!hasPendingMeasurements) for (const row of data ?? []) {
        const date = row.measured_at as string
        if (localDates.has(date)) continue
        const record = {
          id: row.id as string,
          date,
          ...(row.weight_kg == null ? {} : { weightKg: Number(row.weight_kg) }),
          ...(row.waist_cm == null ? {} : { waistCm: Number(row.waist_cm) }),
          ...(row.chest_cm == null ? {} : { chestCm: Number(row.chest_cm) }),
          ...(row.hips_cm == null ? {} : { hipsCm: Number(row.hips_cm) }),
          ...(row.left_arm_cm == null ? {} : { leftArmCm: Number(row.left_arm_cm) }),
          ...(row.right_arm_cm == null ? {} : { rightArmCm: Number(row.right_arm_cm) }),
          ...(row.left_thigh_cm == null ? {} : { leftThighCm: Number(row.left_thigh_cm) }),
          ...(row.right_thigh_cm == null ? {} : { rightThighCm: Number(row.right_thigh_cm) }),
          ...(row.neck_cm == null ? {} : { neckCm: Number(row.neck_cm) }),
          ...(typeof row.note === 'string' ? { note: row.note } : {}),
        }
        const valid = createMeasurement(record, record.id)
        measurementRepository.saveMeasurement(valid)
        localDates.add(date)
      }
      if (!cancelled) setRecords(measurementRepository.listMeasurements())

      const localPhotos = await photoRepository.list()
      if (cancelled) return
      const queuedPhotoMutations = loadMutationQueue().filter((mutation) => mutation.syncUserId === userId && mutation.entity === 'progress_photo')
      const { data: remotePhotos, error: photoReadError } = await client.from('progress_photos').select('id,object_path,captured_on,content_type').eq('user_id', userId).order('captured_on', { ascending: false }).limit(100)
      if (photoReadError) { if (!cancelled) setError('Cloud photo metadata could not be loaded. Local photos remain available.'); return }
      for (const row of remotePhotos ?? []) {
        const photoId = row.id as string
        if (localPhotos.some((photo) => photo.id === photoId) || queuedPhotoMutations.some((mutation) => mutation.recordId === photoId)) continue
        const download = await client.storage.from('progress-photos').download(row.object_path as string)
        if (download.error) continue
        const photo = { id: photoId, date: row.captured_on as string, name: (row.object_path as string).split('/').at(-1) ?? 'Progress photo', mimeType: row.content_type as string, blob: download.data }
        await photoRepository.save(photo)
      }
      if (!cancelled) setPhotos(await photoRepository.list())
    }
    void hydrate().catch(() => { if (!cancelled) setError('Cloud transformation records could not be loaded. Local records remain available.') })
    return () => { cancelled = true }
  }, [online, userId])

  const save = useCallback((input: MeasurementInput, id?: string) => {
    try {
      const record = createMeasurement(input, id)
      setRecords(measurementRepository.saveMeasurement(record))
      enqueueMutation({ entity: 'measurement', operation: 'upsert', recordId: record.id, payload: record })
      setSuccess('Measurement saved locally.')
      setError(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Measurement could not be saved.') }
  }, [])

  const remove = useCallback((id: string) => {
    try { setRecords(measurementRepository.deleteMeasurement(id)); enqueueMutation({ entity: 'measurement', operation: 'delete', recordId: id, payload: {} }); setSuccess('Measurement removed locally.'); setError(null) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Measurement could not be removed.') }
  }, [])

  const savePhoto = useCallback(async (photo: ProgressPhoto) => {
    try { await photoRepository.save(photo); setPhotos(await photoRepository.list()); enqueueMutation({ entity: 'progress_photo', operation: 'upsert', recordId: photo.id, payload: { id: photo.id, date: photo.date, name: photo.name, mimeType: photo.mimeType } }); setSuccess('Progress photo saved on this device.'); setError(null) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Progress photo could not be saved.') }
  }, [])

  const removePhoto = useCallback(async (id: string) => {
    try { await photoRepository.remove(id); setPhotos(await photoRepository.list()); enqueueMutation({ entity: 'progress_photo', operation: 'delete', recordId: id, payload: {} }); setSuccess('Progress photo removed locally.'); setError(null) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Progress photo could not be removed.') }
  }, [])

  return { records, photos, loading, error, success, setSuccess, setError, save, remove, savePhoto, removePhoto, refresh }
}
