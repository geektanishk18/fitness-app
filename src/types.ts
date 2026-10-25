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

export type NavKey = 'dashboard' | 'workout' | 'progress' | 'nutrition' | 'coaching' | 'settings'

export type UserSettings = {
  name: string
  goal: 'muscle' | 'fat-loss' | 'recomposition'
  targetWeightKg: number | null
  trainingDays: 4 | 5 | 6
  preferredSessionMinutes: 45 | 60 | 75
  units: 'metric' | 'imperial'
  measurements: 'kg-cm' | 'lb-in'
  nutritionTargets: { calories: number; protein: number; carbs: number; fat: number }
  reminders: boolean
}

export type TrainingPreferences = {
  daysAvailable: 4 | 5 | 6
  weekStart: string
  overrides: Partial<Record<string, import('./scheduler').SessionId>>
}

export type ProgressionSnapshot = {
  exerciseId: string
  lastWeight: number
  bestWeight: number
  lastReps: number
}
