import { z } from 'zod'

export const mealCategories = ['breakfast', 'lunch', 'dinner', 'snacks'] as const
export type MealCategory = (typeof mealCategories)[number]

export const nutritionTargetsSchema = z.object({
  calories: z.number().finite().positive().max(10000),
  protein: z.number().finite().nonnegative().max(1000),
  carbs: z.number().finite().nonnegative().max(1500),
  fat: z.number().finite().nonnegative().max(1000),
})
export type NutritionTargets = z.infer<typeof nutritionTargetsSchema>

export const foodSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  caloriesPer100g: z.number().nonnegative(),
  proteinPer100g: z.number().nonnegative(),
  carbsPer100g: z.number().nonnegative(),
  fatPer100g: z.number().nonnegative(),
})
export type Food = z.infer<typeof foodSchema>

export const foodEntrySchema = z.object({
  id: z.string().min(1),
  foodId: z.string().min(1),
  foodName: z.string().min(1),
  category: z.enum(mealCategories),
  servingGrams: z.number().positive().max(5000),
  quantity: z.number().positive().max(100),
  caloriesPer100g: z.number().nonnegative(),
  proteinPer100g: z.number().nonnegative(),
  carbsPer100g: z.number().nonnegative(),
  fatPer100g: z.number().nonnegative(),
})
export type FoodEntry = z.infer<typeof foodEntrySchema>

export const nutritionDaySchema = z.object({
  date: z.iso.date(),
  waterMl: z.number().int().nonnegative().max(20000),
  entries: z.array(foodEntrySchema),
})
export type NutritionDay = z.infer<typeof nutritionDaySchema>

export const defaultNutritionTargets: NutritionTargets = { calories: 2400, protein: 160, carbs: 270, fat: 75 }

export const foodCatalog: Food[] = [
  { id: 'idli', name: 'Idli', description: 'Steamed rice and lentil cakes', caloriesPer100g: 146, proteinPer100g: 4.5, carbsPer100g: 30, fatPer100g: 0.7 },
  { id: 'masala-dosa', name: 'Masala dosa', description: 'Crisp dosa with potato masala', caloriesPer100g: 168, proteinPer100g: 3.8, carbsPer100g: 28, fatPer100g: 4.8 },
  { id: 'poha', name: 'Poha', description: 'Flattened rice with peas and peanuts', caloriesPer100g: 180, proteinPer100g: 4.2, carbsPer100g: 29, fatPer100g: 5.1 },
  { id: 'dal-tadka', name: 'Dal tadka', description: 'Yellow lentils tempered with spices', caloriesPer100g: 120, proteinPer100g: 9, carbsPer100g: 16, fatPer100g: 3.5 },
  { id: 'chicken-curry', name: 'Chicken curry', description: 'Home-style chicken curry', caloriesPer100g: 165, proteinPer100g: 19, carbsPer100g: 5, fatPer100g: 7.5 },
  { id: 'paneer-bhurji', name: 'Paneer bhurji', description: 'Scrambled paneer with tomato and spices', caloriesPer100g: 220, proteinPer100g: 14, carbsPer100g: 7, fatPer100g: 15 },
  { id: 'roti', name: 'Whole-wheat roti', description: 'Whole-wheat flatbread', caloriesPer100g: 297, proteinPer100g: 9.8, carbsPer100g: 52, fatPer100g: 4.5 },
  { id: 'curd', name: 'Plain curd', description: 'Unsweetened whole-milk yogurt', caloriesPer100g: 61, proteinPer100g: 3.5, carbsPer100g: 4.7, fatPer100g: 3.3 },
  { id: 'rice', name: 'Cooked basmati rice', description: 'Steamed basmati rice', caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
  { id: 'chana-masala', name: 'Chana masala', description: 'Chickpeas in spiced tomato gravy', caloriesPer100g: 165, proteinPer100g: 8.5, carbsPer100g: 24, fatPer100g: 4.5 },
  { id: 'banana', name: 'Banana', description: 'Fresh banana', caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 22.8, fatPer100g: 0.3 },
]

function entryId() {
  return globalThis.crypto?.randomUUID?.() ?? `food-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createNutritionDay(date: string): NutritionDay { return nutritionDaySchema.parse({ date, waterMl: 0, entries: [] }) }

export function addFoodEntry(day: NutritionDay, food: Food, category: MealCategory, servingGrams: number, quantity = 1): NutritionDay {
  const entry = foodEntrySchema.parse({ id: entryId(), foodId: food.id, foodName: food.name, category, servingGrams, quantity, caloriesPer100g: food.caloriesPer100g, proteinPer100g: food.proteinPer100g, carbsPer100g: food.carbsPer100g, fatPer100g: food.fatPer100g })
  return nutritionDaySchema.parse({ ...day, entries: [...day.entries, entry] })
}

export function editFoodEntry(day: NutritionDay, id: string, changes: Partial<Pick<FoodEntry, 'category' | 'servingGrams' | 'quantity'>>): NutritionDay {
  return nutritionDaySchema.parse({ ...day, entries: day.entries.map((entry) => entry.id === id ? foodEntrySchema.parse({ ...entry, ...changes }) : entry) })
}

export function deleteFoodEntry(day: NutritionDay, id: string): NutritionDay {
  return nutritionDaySchema.parse({ ...day, entries: day.entries.filter((entry) => entry.id !== id) })
}

export function addWater(day: NutritionDay, amountMl: number): NutritionDay {
  if (!Number.isInteger(amountMl)) throw new Error('Water amounts must be whole millilitres.')
  return nutritionDaySchema.parse({ ...day, waterMl: Math.max(0, day.waterMl + amountMl) })
}

export function calculateDailyNutrition(day: NutritionDay, targets: NutritionTargets = defaultNutritionTargets) {
  const sum = (key: 'calories' | 'protein' | 'carbs' | 'fat') => day.entries.reduce((total, entry) => {
    const per100 = key === 'calories' ? entry.caloriesPer100g : key === 'protein' ? entry.proteinPer100g : key === 'carbs' ? entry.carbsPer100g : entry.fatPer100g
    return total + (per100 * entry.servingGrams * entry.quantity) / 100
  }, 0)
  const calories = Math.round(sum('calories'))
  const protein = Math.round(sum('protein') * 10) / 10
  const carbs = Math.round(sum('carbs') * 10) / 10
  const fat = Math.round(sum('fat') * 10) / 10
  return {
    calories, protein, carbs, fat,
    caloriesRemaining: Math.max(0, targets.calories - calories),
    proteinRemaining: Math.max(0, Math.round((targets.protein - protein) * 10) / 10),
    carbsRemaining: Math.max(0, Math.round((targets.carbs - carbs) * 10) / 10),
    fatRemaining: Math.max(0, Math.round((targets.fat - fat) * 10) / 10),
    caloriesProgress: Math.min(100, Math.round((calories / targets.calories) * 100)),
  }
}
