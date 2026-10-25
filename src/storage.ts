import type { WorkoutState } from './types'

const key = 'v-taper-workout-demo'

export function loadWorkout(): WorkoutState | null {
  let saved: string | null
  try { saved = localStorage.getItem(key) } catch { return null }
  if (!saved) return null
  try { return JSON.parse(saved) as WorkoutState } catch { return null }
}

export function saveWorkout(workout: WorkoutState) {
  try { localStorage.setItem(key, JSON.stringify(workout)); return true } catch { return false }
}
