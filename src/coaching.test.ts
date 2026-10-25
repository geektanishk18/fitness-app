import { describe, expect, it } from 'vitest'
import { buildCoachingSummary, coachingRequestSchema, mockCoachingProvider } from './coaching'

describe('coaching domain', () => {
  it('calculates honest insufficient-data state', () => {
    const summary = buildCoachingSummary([], [], { calories: 2400, protein: 160, carbs: 270, fat: 75 }, [])
    expect(summary.hasEnoughData).toBe(false)
    expect(summary.trainingConsistency).toBe(0)
  })
  it('grounds nutrition adherence in logged days', () => {
    const summary = buildCoachingSummary([], [{ date: '2026-10-25', waterMl: 0, entries: [{ id: 'x', foodId: 'x', foodName: 'Food', category: 'lunch', servingGrams: 100, quantity: 1, caloriesPer100g: 2400, proteinPer100g: 160, carbsPer100g: 270, fatPer100g: 75 }] }], { calories: 2400, protein: 160, carbs: 270, fat: 75 }, [])
    expect(summary.nutritionAdherence).toBe(100)
    expect(summary.nutritionDays).toBe(1)
  })
  it('validates provider requests and returns mock content', async () => {
    const request = coachingRequestSchema.parse({ summary: { trainingSessions: 1, nutritionDays: 1, measurementCount: 0 } })
    const response = await mockCoachingProvider.generate(request)
    expect(response.kind).toBe('mock')
    expect(response.message).toContain('logged training')
  })
})
