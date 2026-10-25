import { useCallback, useEffect, useState } from 'react'
import { defaultWorkout } from '../data'
import { loadWorkout, saveWorkout } from '../storage'
import type { SetLog, WorkoutState } from '../types'
import { completeWorkout, loadOrCreateWorkout, persistWorkoutSet, type WorkoutHistoryItem } from '../lib/workoutRepository'

export function useWorkoutPersistence() {
  const [workout, setWorkout] = useState<WorkoutState>(() => loadWorkout() ?? defaultWorkout)
  const [mode, setMode] = useState<'loading' | 'demo' | 'supabase'>('loading')
  const [modeReason, setModeReason] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const hydrate = useCallback(async () => {
    setMode('loading'); setError(null)
    try {
      const result = await loadOrCreateWorkout()
      if (result.mode === 'demo') { setMode('demo'); setModeReason(result.reason); return }
      setMode('supabase'); setSessionId(result.sessionId); setWorkout(result.workout); setHistory(result.history); setModeReason('Synced to your private Supabase workspace.')
    } catch (reason) { setMode('demo'); setModeReason('Supabase could not be reached. Your local demo is still available.'); setError(reason instanceof Error ? reason.message : 'Unable to load your workout.') }
  }, [])

  useEffect(() => { void hydrate() }, [hydrate])
  useEffect(() => { if (mode !== 'loading') saveWorkout(workout) }, [mode, workout])

  const updateSet = useCallback((exerciseId: string, setIndex: number, field: keyof Pick<SetLog, 'weight' | 'reps'>, value: number) => {
    setWorkout((current) => ({ ...current, [exerciseId]: current[exerciseId].map((set, index) => index === setIndex ? { ...set, [field]: value } : set) }))
  }, [])
  const toggleSet = useCallback(async (exerciseId: string, exerciseName: string, setIndex: number) => {
    let nextSet: SetLog | undefined
    setWorkout((current) => {
      const next = current[exerciseId].map((set, index) => index === setIndex ? { ...set, completed: !set.completed } : set)
      nextSet = next[setIndex]
      return { ...current, [exerciseId]: next }
    })
    if (mode === 'supabase' && sessionId && nextSet) {
      try { await persistWorkoutSet(sessionId, exerciseName, setIndex, nextSet); setSuccess('Set synced') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Set could not be synced.') }
    }
  }, [mode, sessionId])
  const finish = useCallback(async () => {
    if (mode === 'supabase' && sessionId) { try { await completeWorkout(sessionId); setSuccess('Workout saved to history'); await hydrate() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Workout could not be completed.') } } else setSuccess('Demo workout complete. Sign in to save it to history.')
  }, [hydrate, mode, sessionId])
  return { workout, setWorkout, mode, modeReason, sessionId, history, error, success, setError, setSuccess, updateSet, toggleSet, finish, hydrate }
}
