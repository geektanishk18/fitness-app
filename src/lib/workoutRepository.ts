import { z } from 'zod'
import { exercises } from '../data'
import type { SetLog, WorkoutState } from '../types'
import { getAuthenticatedUser, supabase } from './supabase'

const setSchema = z.object({ weight: z.number().finite().nonnegative(), reps: z.number().int().positive(), completed: z.boolean() })
export type WorkoutHistoryItem = { id: string; sessionDate: string; status: 'in_progress' | 'completed'; completedAt: string | null }

export async function listWorkoutHistory(): Promise<WorkoutHistoryItem[]> {
  if (!supabase) return []
  const user = await getAuthenticatedUser()
  if (!user) return []
  const { data, error } = await supabase.from('workout_sessions').select('id, session_date, status, completed_at').eq('user_id', user.id).order('session_date', { ascending: false }).limit(100)
  if (error) throw new Error('Workout history could not be loaded from Supabase.')
  return (data ?? []).map((item) => ({ id: item.id as string, sessionDate: item.session_date as string, status: item.status as WorkoutHistoryItem['status'], completedAt: item.completed_at as string | null }))
}

export async function loadOrCreateWorkout(): Promise<{ mode: 'supabase'; sessionId: string; workout: WorkoutState; history: WorkoutHistoryItem[] } | { mode: 'demo'; reason: string }> {
  if (!supabase) return { mode: 'demo', reason: 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sync.' }
  const user = await getAuthenticatedUser()
  if (!user) return { mode: 'demo', reason: 'Sign in with Supabase to sync workouts. The local demo remains available.' }

  const today = new Date().toISOString().slice(0, 10)
  const { data: existing, error: existingError } = await supabase.from('workout_sessions').select('id, status').eq('user_id', user.id).eq('session_date', today).maybeSingle()
  if (existingError) throw new Error(existingError.message)

  let sessionId = existing?.id as string | undefined
  if (!sessionId) {
    const { data: created, error: createError } = await supabase.from('workout_sessions').insert({ user_id: user.id, session_date: today, status: 'in_progress' }).select('id').single()
    if (createError) throw new Error(createError.message)
    sessionId = created.id as string
    for (const exercise of exercises) {
      const { data: exerciseLog, error: exerciseError } = await supabase.from('exercise_logs').insert({ session_id: sessionId, exercise_name: exercise.name, focus: exercise.focus, sort_order: exercises.indexOf(exercise) }).select('id').single()
      if (exerciseError) throw new Error(exerciseError.message)
      const rows = Array.from({ length: exercise.sets }, (_, setIndex) => ({ exercise_log_id: exerciseLog.id, set_number: setIndex + 1, weight_kg: exercise.targetWeight, reps: Number(exercise.reps.split('–')[0]), completed: false }))
      const { error: setError } = await supabase.from('set_logs').insert(rows)
      if (setError) throw new Error(setError.message)
    }
  }

  const { data: logs, error: logsError } = await supabase.from('exercise_logs').select('id, exercise_name, set_logs(id, set_number, weight_kg, reps, completed)').eq('session_id', sessionId).order('sort_order')
  if (logsError) throw new Error(logsError.message)
  const workout: WorkoutState = {}
  for (const exercise of exercises) {
    const log = (logs ?? []).find((item) => item.exercise_name === exercise.name)
    workout[exercise.id] = ((log?.set_logs ?? []) as Array<{ id: string; set_number: number; weight_kg: number; reps: number; completed: boolean }>).sort((a, b) => a.set_number - b.set_number).map((set) => ({ weight: set.weight_kg, reps: set.reps, completed: set.completed }))
  }

  const { data: history, error: historyError } = await supabase.from('workout_sessions').select('id, session_date, status, completed_at').eq('user_id', user.id).order('session_date', { ascending: false }).limit(20)
  if (historyError) throw new Error(historyError.message)
  return { mode: 'supabase', sessionId, workout, history: (history ?? []).map((item) => ({ id: item.id as string, sessionDate: item.session_date as string, status: item.status as WorkoutHistoryItem['status'], completedAt: item.completed_at as string | null })) }
}

export async function persistWorkoutSet(sessionId: string, exerciseName: string, setIndex: number, set: SetLog) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const user = await getAuthenticatedUser()
  if (!user) throw new Error('Your session has expired. Sign in again to sync this set.')
  const parsed = setSchema.safeParse(set)
  if (!parsed.success) throw new Error('Set values must contain a non-negative weight and positive reps.')
  const { data: exerciseLog, error: exerciseError } = await supabase.from('exercise_logs').select('id, workout_sessions!inner(user_id)').eq('exercise_name', exerciseName).eq('session_id', sessionId).single()
  if (exerciseError) throw new Error(exerciseError.message)
  const { error } = await supabase.from('set_logs').update({ weight_kg: parsed.data.weight, reps: parsed.data.reps, completed: parsed.data.completed }).eq('exercise_log_id', exerciseLog.id).eq('set_number', setIndex + 1)
  if (error) throw new Error(error.message)
}

export async function completeWorkout(sessionId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const user = await getAuthenticatedUser()
  if (!user) throw new Error('Your session has expired. Sign in again to complete this workout.')
  const { error } = await supabase.from('workout_sessions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', sessionId).eq('user_id', user.id)
  if (error) throw new Error(error.message)
}
