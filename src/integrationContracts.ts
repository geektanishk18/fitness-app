import { z } from 'zod'
import { nutritionDaySchema, nutritionTargetsSchema, type NutritionDay, type NutritionTargets } from './nutrition'
import { transformationMeasurementSchema } from './transformation'
import { mutationSchema, type MutationTransportResult } from './syncQueue'
import type { LocalTrainingHistory } from './trainingStorage'
import type { UserSettings, WorkoutState } from './types'

export interface WorkoutRepository { loadActive(date: string): Promise<WorkoutState | null>; saveActive(date: string, workout: WorkoutState): Promise<void>; appendHistory(session: LocalTrainingHistory): Promise<void>; listHistory(from: string, to: string): Promise<LocalTrainingHistory[]> }
export interface NutritionRepository { getDay(date: string): Promise<NutritionDay>; saveDay(day: NutritionDay): Promise<void>; getTargets(): Promise<NutritionTargets>; saveTargets(targets: NutritionTargets): Promise<void> }
export interface ProfileRepository { getPreferences(): Promise<UserSettings>; savePreferences(preferences: UserSettings): Promise<void> }
export interface ProgressPhotoRepository { save(id: string, date: string, blob: Blob, contentType: 'image/jpeg' | 'image/png' | 'image/webp'): Promise<void>; remove(id: string): Promise<void> }
export interface SyncTransport { send(operation: z.infer<typeof mutationSchema>): Promise<MutationTransportResult> }
const settingsArchiveSchema = z.object({ name: z.string().max(80), goal: z.enum(['muscle', 'fat-loss', 'recomposition']), targetWeightKg: z.number().positive().max(500).nullable(), trainingDays: z.union([z.literal(4), z.literal(5), z.literal(6)]), preferredSessionMinutes: z.union([z.literal(45), z.literal(60), z.literal(75)]), units: z.enum(['metric', 'imperial']), measurements: z.enum(['kg-cm', 'lb-in']), nutritionTargets: nutritionTargetsSchema, reminders: z.boolean() })
const sessionIdSchema = z.enum(['upper-a', 'lower-a', 'upper-b', 'lower-b', 'arms', 'conditioning'])
const trainingPreferencesArchiveSchema = z.object({ daysAvailable: z.union([z.literal(4), z.literal(5), z.literal(6)]), weekStart: z.iso.date(), overrides: z.record(z.string(), sessionIdSchema) })
const historyArchiveSchema = z.object({ id: z.string().min(1), sessionDate: z.iso.date(), sessionId: z.string().min(1), completedAt: z.iso.datetime(), volume: z.number().nonnegative() })
export const importedLocalArchiveSchema = z.object({ schemaVersion: z.literal(1), exportedAt: z.iso.datetime(), nutritionDays: z.array(nutritionDaySchema), nutritionTargets: nutritionTargetsSchema, measurements: z.array(transformationMeasurementSchema), workoutHistory: z.array(historyArchiveSchema), settings: settingsArchiveSchema, trainingPreferences: trainingPreferencesArchiveSchema, coachingHistory: z.array(z.string().max(300)) })
export type LocalDataArchive = z.infer<typeof importedLocalArchiveSchema>
export const publicEnvironmentSchema = z.object({
  VITE_SUPABASE_URL: z.url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
}).superRefine((value, context) => {
  const url = value.NEXT_PUBLIC_SUPABASE_URL ?? value.VITE_SUPABASE_URL
  const key = value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? value.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? value.VITE_SUPABASE_ANON_KEY
  if (Boolean(url) !== Boolean(key)) context.addIssue({ code: 'custom', message: 'Supabase public URL and publishable/anon key must be configured together.' })
})
export const serverEnvironmentNames = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GROQ_API_KEY'] as const
export const serverIntegrationEnvironmentSchema = z.object({ SUPABASE_URL: z.url(), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1), GROQ_API_KEY: z.string().min(1) })
