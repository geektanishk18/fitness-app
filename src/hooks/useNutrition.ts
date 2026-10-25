import { useCallback, useEffect, useMemo, useState } from 'react'
import { addWater, calculateDailyNutrition, createNutritionDay, defaultNutritionTargets, type Food, type MealCategory, type NutritionDay, type NutritionTargets, addFoodEntry, deleteFoodEntry, editFoodEntry, nutritionDaySchema, nutritionTargetsSchema } from '../nutrition'
import { LocalNutritionRepository, hasSavedNutritionTargets } from '../lib/nutritionRepository'
import { enqueueMutation, loadMutationQueue } from '../syncQueue'
import { supabase } from '../lib/supabase'

const repository = new LocalNutritionRepository()
function today() { return new Date().toISOString().slice(0, 10) }

export function useNutrition(userId: string | null = null, online = true) {
  const [date, setDate] = useState(today)
  const [day, setDay] = useState<NutritionDay>(() => createNutritionDay(today()))
  const [targets, setTargets] = useState<NutritionTargets>(defaultNutritionTargets)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    try { setDay(repository.getDay(date)); setTargets(repository.getTargets()); setError(null) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Nutrition data could not be loaded.') }
    finally { setLoading(false) }
  }, [date])

  useEffect(() => {
    const client = supabase
    if (!userId || !online || !client) return
    let cancelled = false
    const hydrate = async () => {
      const dayHasLocalData = (() => { try { const localDay = repository.getDay(date); return localDay.entries.length > 0 || localDay.waterMl > 0 } catch { return false } })()
      const dayQueued = loadMutationQueue().some((mutation) => mutation.syncUserId === userId && mutation.entity === 'nutrition_day' && mutation.recordId === date)
      if (!dayHasLocalData && !dayQueued) {
        const { data, error: readError } = await client.from('nutrition_days').select('local_date,water_ml,nutrition_entries(id,food_id,food_name,meal_category,serving_grams,quantity,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)').eq('user_id', userId).eq('local_date', date).maybeSingle()
        if (!cancelled && readError) setError('Cloud nutrition could not be loaded. Local logging remains available.')
        if (!cancelled && data) {
          const parsed = nutritionDaySchema.safeParse({ date: data.local_date, waterMl: data.water_ml, entries: data.nutrition_entries.map((entry) => ({ id: entry.id, foodId: entry.food_id, foodName: entry.food_name, category: entry.meal_category, servingGrams: Number(entry.serving_grams), quantity: Number(entry.quantity), caloriesPer100g: Number(entry.calories_per_100g), proteinPer100g: Number(entry.protein_per_100g), carbsPer100g: Number(entry.carbs_per_100g), fatPer100g: Number(entry.fat_per_100g) })) })
          if (parsed.success) { repository.saveDay(parsed.data); if (date === new Date().toISOString().slice(0, 10)) setDay(parsed.data) }
        }
      }
      const targetsSavedLocally = hasSavedNutritionTargets()
      const targetQueued = loadMutationQueue().some((mutation) => mutation.syncUserId === userId && mutation.entity === 'profile' && mutation.recordId === 'nutrition-targets')
      if (!targetsSavedLocally && !targetQueued) {
        const { data: profile, error: profileError } = await client.from('user_preferences').select('preferences').eq('user_id', userId).maybeSingle()
        if (!cancelled && profileError) setError('Cloud nutrition targets could not be loaded. Local targets remain available.')
        const remoteTargets = nutritionTargetsSchema.safeParse(profile?.preferences && typeof profile.preferences === 'object' ? (profile.preferences as Record<string, unknown>).nutritionTargets : undefined)
        if (!cancelled && remoteTargets.success) { repository.saveTargets(remoteTargets.data); setTargets(remoteTargets.data) }
      }
    }
    void hydrate().catch(() => { if (!cancelled) setError('Cloud nutrition could not be loaded. Local logging remains available.') })
    return () => { cancelled = true }
  }, [date, online, userId])

  const commit = useCallback((next: NutritionDay, message: string) => {
    try { repository.saveDay(next); setDay(next); enqueueMutation({ entity: 'nutrition_day', operation: 'upsert', recordId: next.date, payload: next }); setSuccess(message); setError(null) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Nutrition data could not be saved.'); setSuccess(null) }
  }, [])
  const add = useCallback((food: Food, category: MealCategory, grams: number, quantity: number) => {
    try { commit(addFoodEntry(day, food, category, grams, quantity), `${food.name} added.`) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Food entry could not be added.') }
  }, [commit, day])
  const edit = useCallback((id: string, changes: Parameters<typeof editFoodEntry>[2]) => {
    try { commit(editFoodEntry(day, id, changes), 'Meal updated.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Meal entry could not be updated.') }
  }, [commit, day])
  const remove = useCallback((id: string) => {
    try { commit(deleteFoodEntry(day, id), 'Entry removed.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Food entry could not be removed.') }
  }, [commit, day])
  const water = useCallback((amount: number) => {
    try { commit(addWater(day, amount), `${amount} ml water added.`) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Water could not be logged.') }
  }, [commit, day])
  const updateTargets = useCallback((next: NutritionTargets) => {
    try { repository.saveTargets(next); setTargets(next); enqueueMutation({ entity: 'profile', operation: 'upsert', recordId: 'nutrition-targets', payload: { nutritionTargets: next } }); setSuccess('Daily targets saved locally.'); setError(null) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Targets could not be saved.') }
  }, [])
  const totals = useMemo(() => calculateDailyNutrition(day, targets), [day, targets])
  return { date, setDate, day, targets, totals, loading, error, success, setSuccess, setError, add, edit, remove, water, updateTargets }
}
