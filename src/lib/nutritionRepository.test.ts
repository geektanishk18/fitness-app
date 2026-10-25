import { beforeEach, describe, expect, it } from 'vitest'
import { LocalNutritionRepository } from './nutritionRepository'

describe('LocalNutritionRepository', () => {
  beforeEach(() => localStorage.clear())

  it('persists nutrition days independently by date and targets across reloads', () => {
    const first = new LocalNutritionRepository()
    first.saveDay({ date: '2026-10-25', waterMl: 500, entries: [] })
    first.saveTargets({ calories: 2300, protein: 150, carbs: 250, fat: 70 })
    const restored = new LocalNutritionRepository()
    expect(restored.getDay('2026-10-25').waterMl).toBe(500)
    expect(restored.getDay('2026-10-24').entries).toEqual([])
    expect(restored.getTargets().calories).toBe(2300)
  })
})
