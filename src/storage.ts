import type { WorkoutState } from './types'

const key = 'v-taper-workout-demo'

export function loadWorkout(): WorkoutState | null {
  const saved = localStorage.getItem(key)
  if (!saved) return null
  try { return JSON.parse(saved) as WorkoutState } catch { return null }
}

export function saveWorkout(workout: WorkoutState) {
  localStorage.setItem(key, JSON.stringify(workout))
}
