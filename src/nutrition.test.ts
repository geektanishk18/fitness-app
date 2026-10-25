import { describe, expect, it } from 'vitest'
import { addFoodEntry, addWater, calculateDailyNutrition, createNutritionDay, deleteFoodEntry, editFoodEntry, foodCatalog, nutritionTargetsSchema, type NutritionDay } from './nutrition'

const day: NutritionDay = { date: '2026-10-25', waterMl: 0, entries: [] }

describe('nutrition domain', () => {
  it('validates daily calorie and macro targets', () => {
    expect(nutritionTargetsSchema.parse({ calories: 2400, protein: 160, carbs: 270, fat: 75 })).toEqual({ calories: 2400, protein: 160, carbs: 270, fat: 75 })
    expect(nutritionTargetsSchema.safeParse({ calories: -10, protein: 160, carbs: 270, fat: 75 }).success).toBe(false)
  })

  it('calculates totals from quantity and scale-adjusted serving size', () => {
    const food = foodCatalog.find((item) => item.id === 'dal-tadka')!
    const logged = addFoodEntry(day, food, 'lunch', 200, 1.5)
    expect(logged.entries[0]).toMatchObject({ servingGrams: 200, quantity: 1.5 })
    expect(calculateDailyNutrition(logged).calories).toBe(360)
    expect(calculateDailyNutrition(logged).protein).toBe(27)
  })

  it('edits an entry without changing its identity and deletes only that entry', () => {
    const first = addFoodEntry(day, foodCatalog[0], 'breakfast', 1, 1)
    const second = addFoodEntry(first, foodCatalog[1], 'snacks', 1, 1)
    const id = second.entries[0].id
    const edited = editFoodEntry(second, id, { quantity: 2 })
    expect(edited.entries.find((entry) => entry.id === id)?.quantity).toBe(2)
    expect(deleteFoodEntry(edited, id).entries).toHaveLength(1)
  })

  it('computes remaining targets without returning negative amounts', () => {
    const food = foodCatalog.find((item) => item.id === 'paneer-bhurji')!
    const logged = addFoodEntry(day, food, 'dinner', 100, 6)
    const summary = calculateDailyNutrition(logged, { calories: 1200, protein: 80, carbs: 100, fat: 30 })
    expect(summary.caloriesRemaining).toBe(0)
    expect(summary.proteinRemaining).toBe(0)
  })

  it('tracks water and keeps separate dates independent', () => {
    expect(addWater(day, 500).waterMl).toBe(500)
    expect(addWater(addWater(day, 250), -250).waterMl).toBe(0)
    expect(createNutritionDay('2026-10-24')).toMatchObject({ date: '2026-10-24', entries: [], waterMl: 0 })
  })
})
