import { nutritionDaySchema, nutritionTargetsSchema, type NutritionDay, type NutritionTargets } from '../nutrition'

export interface NutritionRepository {
  getDay(date: string): NutritionDay
  saveDay(day: NutritionDay): void
  getTargets(): NutritionTargets
  listDays(): NutritionDay[]
  saveTargets(targets: NutritionTargets): void
}

const daysKey = 'v-taper-nutrition-days'
const targetsKey = 'v-taper-nutrition-targets'
export function hasSavedNutritionTargets() { try { return localStorage.getItem(targetsKey) !== null } catch { return false } }

export class LocalNutritionRepository implements NutritionRepository {
  getDay(date: string) {
    const raw = localStorage.getItem(daysKey)
    const records = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    const record = records[date]
    return record ? nutritionDaySchema.parse(record) : nutritionDaySchema.parse({ date, waterMl: 0, entries: [] })
  }

  saveDay(day: NutritionDay) {
    const validated = nutritionDaySchema.parse(day)
    const raw = localStorage.getItem(daysKey)
    const records = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    localStorage.setItem(daysKey, JSON.stringify({ ...records, [validated.date]: validated }))
  }

  getTargets() {
    const raw = localStorage.getItem(targetsKey)
    return raw ? nutritionTargetsSchema.parse(JSON.parse(raw)) : { calories: 2400, protein: 160, carbs: 270, fat: 75 }
  }

  listDays() {
    const raw = localStorage.getItem(daysKey)
    const records = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    return Object.values(records).map((record) => nutritionDaySchema.parse(record)).sort((a, b) => a.date.localeCompare(b.date))
  }

  saveTargets(targets: NutritionTargets) { localStorage.setItem(targetsKey, JSON.stringify(nutritionTargetsSchema.parse(targets))) }
}
