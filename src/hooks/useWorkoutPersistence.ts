import { useCallback, useEffect, useState } from 'react'
import { defaultWorkout } from '../data'
import { loadWorkout, saveWorkout } from '../storage'
import type { SetLog, WorkoutState } from '../types'
import { listWorkoutHistory, type WorkoutHistoryItem } from '../lib/workoutRepository'
import { loadTrainingHistory, saveTrainingHistory } from '../trainingStorage'
import { enqueueMutation, loadMutationQueue } from '../syncQueue'
import { isSupabaseConfigured } from '../lib/supabase'
import { loadOrCreateWorkout } from '../lib/workoutRepository'

function localSessionDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

export function useWorkoutPersistence(userId: string | null = null, online = true) {
  const [workout, setWorkout] = useState<WorkoutState>(() => loadWorkout() ?? defaultWorkout)
  const [mode, setMode] = useState<'loading' | 'demo' | 'supabase'>('demo')
  const [modeReason, setModeReason] = useState('Workout edits are saved on this device first.')
  const [pendingCount, setPendingCount] = useState(() => loadMutationQueue().length)
  const [history, setHistory] = useState<WorkoutHistoryItem[]>(() => loadTrainingHistory().map((item) => ({ id: item.id, sessionDate: item.sessionDate, status: 'completed', completedAt: item.completedAt })))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const hydrate = useCallback(async () => { setWorkout(loadWorkout() ?? defaultWorkout); setHistory(loadTrainingHistory().map((item) => ({ id: item.id, sessionDate: item.sessionDate, status: 'completed', completedAt: item.completedAt }))) }, [])
  const refreshPendingCount = useCallback(() => setPendingCount(loadMutationQueue().length), [])
  useEffect(() => { if (!saveWorkout(workout)) setError('Device storage is unavailable or full. Workout changes may not survive reload.') }, [workout])
  useEffect(() => {
    if (!userId || !online || !isSupabaseConfigured) { setMode('demo'); return }
    const localWorkout = loadWorkout() ?? defaultWorkout
    const localTrainingHistory = loadTrainingHistory()
    const hasLocalHistory = localTrainingHistory.length > 0
    const hasLocalEdits = JSON.stringify(localWorkout) !== JSON.stringify(defaultWorkout)
    const hasLocalQueue = loadMutationQueue().some((mutation) => mutation.entity === 'workout_set' || mutation.entity === 'workout_session')
    let cancelled = false
    if (hasLocalHistory || hasLocalEdits || hasLocalQueue) {
      setMode('demo'); setModeReason('Existing workout records stay on this device; only new post-sign-in changes are synced.')
      void listWorkoutHistory().then((remoteHistory) => {
        if (cancelled || !remoteHistory.length) return
        const localDates = new Set(localTrainingHistory.map((item) => item.sessionDate))
        setHistory((current) => [...current, ...remoteHistory.filter((item) => !localDates.has(item.sessionDate))])
      }).catch(() => undefined)
      return () => { cancelled = true }
    }
    setMode('loading')
    void loadOrCreateWorkout().then((result) => {
      if (cancelled) return
      if (result.mode === 'demo') { setMode('demo'); setModeReason(result.reason); return }
      setWorkout(result.workout); saveWorkout(result.workout); setHistory(result.history); setMode('supabase'); setModeReason('Workout plan loaded from your authenticated Supabase account.')
    }).catch(() => { if (!cancelled) { setMode('demo'); setModeReason('Supabase could not load the workout. Local logging remains available.') } })
    return () => { cancelled = true }
  }, [userId, online])

  const updateSet = useCallback((exerciseId: string, setIndex: number, field: keyof Pick<SetLog, 'weight' | 'reps'>, value: number) => {
    const updated = { ...workout, [exerciseId]: workout[exerciseId].map((set, index) => index === setIndex ? { ...set, [field]: value } : set) }
    setWorkout(updated); saveWorkout(updated)
    const sessionDate = localSessionDate()
    try { enqueueMutation({ entity: 'workout_set', operation: 'upsert', recordId: `${sessionDate}:${exerciseId}:${setIndex}`, payload: { exerciseId, setIndex, sessionDate, set: updated[exerciseId][setIndex] } }); setPendingCount(loadMutationQueue().length) } catch { setError('Saved in the active session, but the offline queue is full.') }
  }, [workout])
  const resetSession = useCallback(() => {
    setWorkout(defaultWorkout); saveWorkout(defaultWorkout)
    const sessionDate = localSessionDate()
    try {
      for (const [exerciseId, sets] of Object.entries(defaultWorkout)) sets.forEach((set, setIndex) => enqueueMutation({ entity: 'workout_set', operation: 'upsert', recordId: `${sessionDate}:${exerciseId}:${setIndex}`, payload: { exerciseId, setIndex, sessionDate, set } }))
      setPendingCount(loadMutationQueue().length)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Workout reset locally, but could not be added to the pending sync queue.') }
  }, [])
  const toggleSet = useCallback(async (exerciseId: string, exerciseName: string, setIndex: number) => {
    const next = workout[exerciseId].map((set, index) => index === setIndex ? { ...set, completed: !set.completed } : set)
    const updated = { ...workout, [exerciseId]: next }; setWorkout(updated); saveWorkout(updated)
    const sessionDate = localSessionDate()
    try { enqueueMutation({ entity: 'workout_set', operation: 'upsert', recordId: `${sessionDate}:${exerciseId}:${setIndex}`, payload: { exerciseId, exerciseName, setIndex, sessionDate, set: next[setIndex] } }); setPendingCount(loadMutationQueue().length); setSuccess('Saved on this device · pending sync') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Set saved, but its future sync record could not be queued.') }
  }, [workout])
  const finish = useCallback(async () => {
    {
      const completedAt = new Date().toISOString()
      const sessionDate = localSessionDate()
      try {
        for (const [exerciseId, sets] of Object.entries(workout)) sets.forEach((set, setIndex) => enqueueMutation({ entity: 'workout_set', operation: 'upsert', recordId: `${sessionDate}:${exerciseId}:${setIndex}`, payload: { exerciseId, setIndex, sessionDate, set } }))
        enqueueMutation({ entity: 'workout_session', operation: 'upsert', recordId: `session:${sessionDate}`, payload: { completedAt, sessionDate, workout } })
        setPendingCount(loadMutationQueue().length)
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Workout is saved locally, but its pending sync queue could not be updated.') }
      const next = [{ id: `local-${completedAt}`, sessionDate, sessionId: 'upper-a', completedAt, volume: Object.values(workout).flat().reduce((sum, set) => sum + (set.completed ? set.weight * set.reps : 0), 0) }, ...loadTrainingHistory()]
      saveTrainingHistory(next)
      setHistory(next.map((item) => ({ id: item.id, sessionDate: item.sessionDate, status: 'completed', completedAt: item.completedAt })))
      setSuccess('Workout saved to local history.')
    }
  }, [workout])
  return { workout, setWorkout, mode, modeReason, pendingCount, refreshPendingCount, resetSession, sessionId: null, history, error, success, setError, setSuccess, updateSet, toggleSet, finish, hydrate }
}
