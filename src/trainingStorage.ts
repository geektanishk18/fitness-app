import type { TrainingPreferences } from './types'
import { z } from 'zod'

const preferencesKey = 'v-taper-training-preferences'
const historyKey = 'v-taper-training-history'
const sessionIdSchema = z.enum(['upper-a', 'lower-a', 'upper-b', 'lower-b', 'arms', 'conditioning'])
export const trainingPreferencesSchema = z.object({ daysAvailable: z.union([z.literal(4), z.literal(5), z.literal(6)]), weekStart: z.iso.date(), overrides: z.record(z.string(), sessionIdSchema) })

export function hasSavedTrainingPreferences() { try { return localStorage.getItem(preferencesKey) !== null } catch { return false } }

export type LocalTrainingHistory = {
  id: string
  sessionDate: string
  sessionId: string
  completedAt: string
  volume: number
}

export function loadTrainingPreferences(fallback: TrainingPreferences): TrainingPreferences {
  try {
    const raw = localStorage.getItem(preferencesKey)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    const validated = trainingPreferencesSchema.safeParse(parsed)
    return validated.success ? { ...fallback, ...validated.data } : fallback
  } catch { return fallback }
}

export function saveTrainingPreferences(preferences: TrainingPreferences) { localStorage.setItem(preferencesKey, JSON.stringify(trainingPreferencesSchema.parse(preferences))) }

export function loadTrainingHistory(): LocalTrainingHistory[] {
  try { return JSON.parse(localStorage.getItem(historyKey) ?? '[]') as LocalTrainingHistory[] } catch { return [] }
}

export function saveTrainingHistory(history: LocalTrainingHistory[]) { localStorage.setItem(historyKey, JSON.stringify(history)) }
