import { z } from 'zod'
import { calculateDailyNutrition, nutritionDaySchema, type NutritionDay, type NutritionTargets } from './nutrition'
import type { LocalTrainingHistory } from './trainingStorage'
import type { TransformationMeasurement } from './transformation'

export const coachingRequestSchema = z.object({ question: z.string().max(500).optional(), summary: z.object({ trainingSessions: z.number(), nutritionDays: z.number(), measurementCount: z.number() }) })
export const coachingResponseSchema = z.object({ kind: z.literal('mock'), title: z.string(), message: z.string(), action: z.string().optional() })
export type CoachingRequest = z.infer<typeof coachingRequestSchema>
export type CoachingResponse = z.infer<typeof coachingResponseSchema>
export type CoachingProvider = { generate(request: CoachingRequest): Promise<CoachingResponse> }
export const mockCoachingProvider: CoachingProvider = { async generate(request) { const validated = coachingRequestSchema.parse(request); return coachingResponseSchema.parse({ kind: 'mock', title: validated.summary.trainingSessions ? 'Keep the repeatable win' : 'Start with one signal', message: validated.summary.trainingSessions ? 'Your logged training is the strongest signal this week. Protect the next planned session and keep nutrition logging simple.' : 'There is not enough logged training yet for a personalised call. Complete one session, then check in again.', action: validated.summary.trainingSessions ? 'Complete the next scheduled session' : 'Log your first workout' }) } }
export function buildCoachingSummary(history: LocalTrainingHistory[], days: NutritionDay[], targets: NutritionTargets, measurements: TransformationMeasurement[]) {
  const nutrition = days.map((day) => calculateDailyNutrition(day, targets)).filter((day) => day.calories > 0)
  const trainingSessions = history.length
  const nutritionAdherence = nutrition.length ? Math.round((nutrition.filter((day) => day.protein >= targets.protein * .8 && day.calories >= targets.calories * .8).length / nutrition.length) * 100) : 0
  return { trainingSessions, trainingTarget: 4, trainingConsistency: Math.min(100, Math.round((trainingSessions / 4) * 100)), nutritionDays: nutrition.length, nutritionAdherence, averageProtein: nutrition.length ? Math.round(nutrition.reduce((sum, day) => sum + day.protein, 0) / nutrition.length) : 0, measurementCount: measurements.length, hasEnoughData: trainingSessions > 0 || nutrition.length > 0 || measurements.length > 0 }
}
export function parseNutritionDays(raw: string | null): NutritionDay[] { try { const data = raw ? JSON.parse(raw) as Record<string, unknown> : {}; return Object.values(data).map((day) => nutritionDaySchema.parse(day)) } catch { return [] } }
