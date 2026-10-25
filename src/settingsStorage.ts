import { z } from 'zod'
import { defaultNutritionTargets, nutritionTargetsSchema } from './nutrition'
import type { UserSettings } from './types'
const key = 'v-taper-user-settings'
export const userSettingsSchema = z.object({ name: z.string().max(80), goal: z.enum(['muscle', 'fat-loss', 'recomposition']), targetWeightKg: z.number().positive().max(500).nullable(), trainingDays: z.union([z.literal(4), z.literal(5), z.literal(6)]), preferredSessionMinutes: z.union([z.literal(45), z.literal(60), z.literal(75)]), units: z.enum(['metric', 'imperial']), measurements: z.enum(['kg-cm', 'lb-in']), nutritionTargets: nutritionTargetsSchema, reminders: z.boolean() })
export function hasSavedUserSettings() { try { return localStorage.getItem(key) !== null } catch { return false } }
export const defaultUserSettings: UserSettings = { name: '', goal: 'recomposition', targetWeightKg: null, trainingDays: 4, preferredSessionMinutes: 60, units: 'metric', measurements: 'kg-cm', nutritionTargets: defaultNutritionTargets, reminders: false }
export function loadUserSettings(): UserSettings { try { const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '{}'); const result = userSettingsSchema.safeParse({ ...defaultUserSettings, ...(parsed as Record<string, unknown>) }); return result.success ? result.data : defaultUserSettings } catch { return defaultUserSettings } }
export function saveUserSettings(settings: UserSettings) { localStorage.setItem(key, JSON.stringify(userSettingsSchema.parse(settings))) }
