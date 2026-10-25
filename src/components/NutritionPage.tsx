import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Droplets, Minus, Plus, Search, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { foodCatalog, mealCategories, type FoodEntry, type MealCategory, type NutritionTargets } from '../nutrition'
import { useNutrition } from '../hooks/useNutrition'

const categoryLabel: Record<MealCategory, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' }
type NutritionState = ReturnType<typeof useNutrition>

export function NutritionPage({ nutrition }: { nutrition: NutritionState }) {
  const { date, setDate, day, targets, totals, loading, error, success, setSuccess, setError, add, edit, remove, water, updateTargets } = nutrition
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<MealCategory>('breakfast')
  const [foodId, setFoodId] = useState(foodCatalog[0].id)
  const [grams, setGrams] = useState(100)
  const [quantity, setQuantity] = useState(1)
  const [targetDraft, setTargetDraft] = useState<NutritionTargets>(targets)
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => setTargetDraft(targets), [targets])
  

  const results = useMemo(() => foodCatalog.filter((food) => `${food.name} ${food.description}`.toLowerCase().includes(query.toLowerCase())), [query])
  const selectedFood = foodCatalog.find((food) => food.id === foodId) ?? foodCatalog[0]
  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const changeDate = (delta: number) => { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + delta); setDate(next.toISOString().slice(0, 10)); setSuccess(null) }

  const saveTargets = () => {
    const parsed = { calories: Number(targetDraft.calories), protein: Number(targetDraft.protein), carbs: Number(targetDraft.carbs), fat: Number(targetDraft.fat) }
    if (Object.values(parsed).some((value) => !Number.isFinite(value) || value <= 0)) { setError('All daily targets must be greater than zero.'); return }
    updateTargets(parsed)
  }

  return <motion.div className="nutrition-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <header className="nutrition-header"><div><span className="eyebrow lime">Fuel / local log</span><h1>Eat to perform.</h1><p className="support-copy">A clear read on the fuel behind your training.</p></div><div className="date-picker"><button aria-label="Previous day" onClick={() => changeDate(-1)}><ChevronLeft size={17} /></button><label><span className="eyebrow">Daily log</span><strong>{formattedDate}</strong><input aria-label="Choose nutrition date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><button aria-label="Next day" onClick={() => changeDate(1)}><ChevronRight size={17} /></button></div></header>

    {loading && <p className="nutrition-state" role="status">Loading your daily log…</p>}
    {error && <p className="nutrition-state error" role="alert">{error}</p>}
    {success && <button className="nutrition-state success" onClick={() => setSuccess(null)} role="status"><Check size={14} /> {success} <span>Dismiss</span></button>}

    <section className="nutrition-overview"><div className="calorie-card"><div className="nutrition-card-heading"><div><span className="eyebrow">Calories</span><strong>{totals.calories.toLocaleString()} <small>/ {targets.calories.toLocaleString()} kcal</small></strong></div><span className="nutrition-remain">{totals.caloriesRemaining.toLocaleString()} left</span></div><div className="calorie-track"><span style={{ width: `${totals.caloriesProgress}%` }} /></div><div className="macro-grid">{([['Protein', totals.protein, targets.protein, totals.proteinRemaining], ['Carbs', totals.carbs, targets.carbs, totals.carbsRemaining], ['Fat', totals.fat, targets.fat, totals.fatRemaining]] as const).map(([label, value, target, remaining]) => <div className="macro-card" key={label}><span>{label}</span><strong>{value}<small> / {target} g</small></strong><i>{remaining} g remaining</i><div><span style={{ width: `${Math.min(100, (value / target) * 100)}%` }} /></div></div>)}</div></div>
      <div className="water-card"><div className="nutrition-card-heading"><div><span className="eyebrow">Hydration</span><strong><Droplets size={19} /> {(day.waterMl / 1000).toFixed(1)} <small>/ 2.5 L</small></strong></div><span className="nutrition-remain">{Math.max(0, 2500 - day.waterMl)} ml left</span></div><div className="water-track"><span style={{ width: `${Math.min(100, (day.waterMl / 2500) * 100)}%` }} /></div><div className="water-actions">{[250, 500, 750].map((amount) => <button key={amount} onClick={() => water(amount)}><Plus size={13} /> {amount} ml</button>)}<button aria-label="Remove 250 ml water" onClick={() => water(-250)} disabled={day.waterMl < 250}><Minus size={13} /> Undo</button></div></div></section>

    <section className="target-editor"><details><summary>Adjust daily targets</summary><div className="target-fields">{([['calories', 'Calories kcal'], ['protein', 'Protein g'], ['carbs', 'Carbohydrates g'], ['fat', 'Fat g']] as const).map(([key, label]) => <label key={key}>{label}<input type="number" min="1" value={targetDraft[key]} onChange={(event) => setTargetDraft({ ...targetDraft, [key]: Number(event.target.value) })} /></label>)}<button className="small-action" onClick={saveTargets}>Save targets</button></div></details></section>

    <div className="nutrition-layout"><section className="meal-log"><div className="section-heading"><div><span className="eyebrow">Your day</span><h2>Meals & entries</h2></div><span className="demo-tag">{day.entries.length} entries</span></div>
      {mealCategories.map((meal) => <MealSection key={meal} category={meal} entries={day.entries.filter((entry) => entry.category === meal)} onEdit={(entry) => setEditing(entry.id)} onSaveEdit={(entry, changes) => { edit(entry.id, changes); setEditing(null) }} onCancelEdit={() => setEditing(null)} onRemove={remove} editingId={editing} />)}
      {day.entries.length === 0 && !loading && <p className="empty-meals">Nothing logged yet. Add your first meal to start today’s totals.</p>}
    </section>

    <aside className="food-picker"><span className="eyebrow">Food catalog</span><h2>Add to your day</h2><label className="food-search"><Search size={16} /><input aria-label="Search foods" placeholder="Search Indian foods…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="food-results">{results.map((food) => <button key={food.id} className={foodId === food.id ? 'food-result selected' : 'food-result'} onClick={() => setFoodId(food.id)}><span><strong>{food.name}</strong><small>{food.description}</small></span><em>{food.caloriesPer100g} kcal<small>per 100 g</small></em></button>)}{results.length === 0 && <p className="empty-meals">No foods match “{query}”.</p>}</div><div className="entry-form"><label>Meal<select value={category} onChange={(event) => setCategory(event.target.value as MealCategory)}>{mealCategories.map((meal) => <option key={meal} value={meal}>{categoryLabel[meal]}</option>)}</select></label><div className="entry-quantities"><label>Serving size (g)<input type="number" min="1" value={grams} onChange={(event) => setGrams(Number(event.target.value))} /></label><label>Quantity<input type="number" min="0.1" step="0.1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label></div><div className="selected-preview">{Math.round(selectedFood.caloriesPer100g * grams * quantity / 100)} kcal · {Math.round(selectedFood.proteinPer100g * grams * quantity / 100)} g protein</div><button className="primary-button add-food-button" disabled={!selectedFood || grams <= 0 || quantity <= 0} onClick={() => add(selectedFood, category, grams, quantity)}><Plus size={16} /> Add food</button></div></aside></div>
  </motion.div>
}

function MealSection({ category, entries, onEdit, onSaveEdit, onCancelEdit, onRemove, editingId }: { category: MealCategory; entries: FoodEntry[]; onEdit: (entry: FoodEntry) => void; onSaveEdit: (entry: FoodEntry, changes: Pick<FoodEntry, 'servingGrams' | 'quantity' | 'category'>) => void; onCancelEdit: () => void; onRemove: (id: string) => void; editingId: string | null }) {
  const editForm = useRef<HTMLDivElement>(null)
  const calories = Math.round(entries.reduce((sum, entry) => sum + entry.caloriesPer100g * entry.servingGrams * entry.quantity / 100, 0))
  return <section className="meal-section"><div className="meal-heading"><h3>{categoryLabel[category]}</h3><span>{calories} kcal</span></div>{entries.length === 0 ? <p className="meal-empty">No entries</p> : entries.map((entry) => <div className="meal-entry" key={entry.id}><div className="meal-entry-top"><div><strong>{entry.foodName}</strong><span>{entry.servingGrams} g × {entry.quantity}</span></div><strong>{Math.round(entry.caloriesPer100g * entry.servingGrams * entry.quantity / 100)} kcal</strong></div>{editingId === entry.id ? <div className="edit-entry" ref={editForm}><label>Grams<input aria-label="Edit serving size" name="grams" type="number" min="1" defaultValue={entry.servingGrams} /></label><label>Quantity<input aria-label="Edit quantity" name="quantity" type="number" min="0.1" step="0.1" defaultValue={entry.quantity} /></label><label>Meal<select aria-label="Edit meal category" name="category" defaultValue={entry.category}>{mealCategories.map((meal) => <option key={meal} value={meal}>{categoryLabel[meal]}</option>)}</select></label><button onClick={() => { const form = editForm.current; if (!form) return; onSaveEdit(entry, { servingGrams: Number(form.querySelector<HTMLInputElement>('[name="grams"]')?.value), quantity: Number(form.querySelector<HTMLInputElement>('[name="quantity"]')?.value), category: (form.querySelector<HTMLSelectElement>('[name="category"]')?.value ?? entry.category) as MealCategory }) }}>Save</button><button onClick={onCancelEdit}>Cancel</button></div> : <div className="meal-entry-bottom"><span>P {Math.round(entry.proteinPer100g * entry.servingGrams * entry.quantity / 100 * 10) / 10} g · C {Math.round(entry.carbsPer100g * entry.servingGrams * entry.quantity / 100 * 10) / 10} g · F {Math.round(entry.fatPer100g * entry.servingGrams * entry.quantity / 100 * 10) / 10} g</span><span><button aria-label={`Edit ${entry.foodName}`} onClick={() => onEdit(entry)}>Edit</button><button aria-label={`Delete ${entry.foodName}`} onClick={() => onRemove(entry.id)}><Trash2 size={14} /></button></span></div>}</div>)}</section>
}
