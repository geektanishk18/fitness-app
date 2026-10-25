export type Exercise = {
  id: string
  name: string
  focus: string
  sets: number
  reps: string
  targetWeight: number
  unit: 'kg'
}

export type SetLog = { weight: number; reps: number; completed: boolean }

export type WorkoutState = Record<string, SetLog[]>

export type NavKey = 'dashboard' | 'workout' | 'progress' | 'nutrition' | 'settings'
