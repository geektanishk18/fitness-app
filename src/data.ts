import type { Exercise } from './types'

export const exercises: Exercise[] = [
  { id: 'lat-pulldown', name: 'Neutral-grip lat pulldown', focus: 'Lats / width', sets: 4, reps: '8–10', targetWeight: 68, unit: 'kg' },
  { id: 'incline-press', name: 'Incline dumbbell press', focus: 'Upper chest', sets: 3, reps: '8–10', targetWeight: 28, unit: 'kg' },
  { id: 'lateral-raise', name: 'Cable lateral raise', focus: 'Lateral delts', sets: 4, reps: '12–15', targetWeight: 9, unit: 'kg' },
  { id: 'chest-supported-row', name: 'Chest-supported row', focus: 'Mid-back', sets: 3, reps: '10–12', targetWeight: 52, unit: 'kg' },
]

export const defaultWorkout = Object.fromEntries(
  exercises.map((exercise) => [exercise.id, Array.from({ length: exercise.sets }, () => ({ weight: exercise.targetWeight, reps: Number(exercise.reps.split('–')[0]), completed: false }))]),
)

export const sampleWeight = [
  { day: 'W1', weight: 74.2 }, { day: 'W2', weight: 73.8 }, { day: 'W3', weight: 74.1 },
  { day: 'W4', weight: 73.6 }, { day: 'W5', weight: 73.4 }, { day: 'W6', weight: 73.1 },
]
