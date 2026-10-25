import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Check, ChevronRight, Clock3, Flame, Play, RotateCcw, Sparkles, Trophy, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { BottomNav } from './components/BottomNav'
import { ProgressRing } from './components/ProgressRing'
import { Sparkline } from './components/Sparkline'
import { TopBar } from './components/TopBar'
import { exercises } from './data'
import { useWorkoutPersistence } from './hooks/useWorkoutPersistence'
import { buildWeeklySchedule, type SessionId } from './scheduler'
import { hasSavedTrainingPreferences, loadTrainingPreferences, saveTrainingPreferences, trainingPreferencesSchema } from './trainingStorage'
import { NutritionPage } from './components/NutritionPage'
import { useNutrition } from './hooks/useNutrition'
import { TransformationPage } from './components/TransformationPage'
import type { NavKey, SetLog, TrainingPreferences, WorkoutState } from './types'
import { CoachingPage } from './components/CoachingPage'
import { SettingsPage } from './components/SettingsPage'
import { defaultUserSettings, hasSavedUserSettings, loadUserSettings, saveUserSettings, userSettingsSchema } from './settingsStorage'
import { PhysiqueOrb } from './components/PhysiqueOrb'
import { enqueueMutation } from './syncQueue'
import { useSupabaseAuth } from './hooks/useSupabaseAuth'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import { supabase } from './lib/supabase'
import { loadMutationQueue } from './syncQueue'


function App() {
  const [active, setActive] = useState<NavKey>('dashboard')
  const [preferences, setPreferences] = useState<TrainingPreferences>(() => loadTrainingPreferences({ daysAvailable: 4, weekStart: mondayOf(new Date()), overrides: {} }))
  const auth = useSupabaseAuth()
  const [online, setOnline] = useState(() => navigator.onLine)
  const nutrition = useNutrition(auth.accountSyncAllowed ? auth.user?.id ?? null : null, online)
  const [settings, setSettings] = useState(() => ({ ...loadUserSettings(), trainingDays: preferences.daysAvailable, nutritionTargets: nutrition.targets }))
  const { workout, mode, modeReason, pendingCount, refreshPendingCount, resetSession, history, error, success, setError, setSuccess, updateSet, toggleSet, finish } = useWorkoutPersistence(auth.accountSyncAllowed ? auth.user?.id ?? null : null, online)
  const [timer, setTimer] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const cloudSync = useSupabaseSync({ userId: auth.user?.id ?? null, configured: auth.configured, accountAllowed: auth.accountSyncAllowed, online, refreshPendingCount })
  const completedSets = useMemo(() => Object.values(workout).flat().filter((set) => set.completed).length, [workout])
  const totalSets = Object.values(workout).flat().length
  const workoutComplete = completedSets === totalSets
  const schedule = useMemo(() => buildWeeklySchedule({ ...preferences, completedSessionIds: history.map(() => 'upper-a') }), [history, preferences])

  useEffect(() => { if (!timerRunning) return; const interval = window.setInterval(() => setTimer((value) => value + 1), 1000); return () => window.clearInterval(interval) }, [timerRunning])
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) } }, [])
  useEffect(() => { refreshPendingCount() }, [active, nutrition.success, preferences, settings, refreshPendingCount])
  useEffect(() => { setSettings((current) => current.trainingDays === preferences.daysAvailable ? current : { ...current, trainingDays: preferences.daysAvailable }) }, [preferences.daysAvailable])
  useEffect(() => { setSettings((current) => Object.keys(nutrition.targets).every((key) => current.nutritionTargets[key as keyof typeof nutrition.targets] === nutrition.targets[key as keyof typeof nutrition.targets]) ? current : { ...current, nutritionTargets: nutrition.targets }) }, [nutrition.targets])
  useEffect(() => {
    const userId = auth.accountSyncAllowed ? auth.user?.id : null
    const client = supabase
    if (!userId || !online || !client) return
    let cancelled = false
    const hydratePreferences = async () => {
      const { data, error: readError } = await client.from('user_preferences').select('preferences').eq('user_id', userId).maybeSingle()
      if (cancelled || readError || !data) return
      const preferencesData = data.preferences as Record<string, unknown>
      const queue = loadMutationQueue()
      const profileQueued = (recordId: string) => queue.some((mutation) => mutation.syncUserId === userId && mutation.entity === 'profile' && mutation.recordId === recordId)
      if (!hasSavedUserSettings() && !profileQueued('user-settings')) {
        const parsed = userSettingsSchema.safeParse(preferencesData.settings)
        if (parsed.success) { saveUserSettings(parsed.data); setSettings(parsed.data) }
      }
      if (!hasSavedTrainingPreferences() && !profileQueued('training-preferences')) {
        const parsed = trainingPreferencesSchema.safeParse(preferencesData.trainingPreferences)
        if (parsed.success) { saveTrainingPreferences(parsed.data); setPreferences(parsed.data) }
      }
    }
    void hydratePreferences().catch(() => undefined)
    return () => { cancelled = true }
  }, [auth.accountSyncAllowed, auth.user?.id, online])
  const resetWorkout = () => { resetSession(); setTimer(0); setTimerRunning(false) }

  const updatePreferences = (next: TrainingPreferences) => { setPreferences(next); saveTrainingPreferences(next); try { enqueueMutation({ entity: 'profile', operation: 'upsert', recordId: 'training-preferences', payload: { trainingPreferences: next } }) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Preferences saved locally, but could not be queued.') } }
  const updateSettings = (next: typeof defaultUserSettings) => { setSettings(next); saveUserSettings(next); try { enqueueMutation({ entity: 'profile', operation: 'upsert', recordId: 'user-settings', payload: next }) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Settings saved locally, but could not be queued.') }; if (next.trainingDays !== preferences.daysAvailable) updatePreferences({ ...preferences, daysAvailable: next.trainingDays }); if (Object.keys(next.nutritionTargets).some((key) => next.nutritionTargets[key as keyof typeof next.nutritionTargets] !== nutrition.targets[key as keyof typeof nutrition.targets])) nutrition.updateTargets(next.nutritionTargets) }
  return <div className="app-shell"><TopBar /><main className="page"><div className="page-inner"><SyncBanner mode={mode} reason={`${online ? 'Online' : 'Offline'} · ${pendingCount} changes pending locally · ${cloudSync.state.replace('_', ' ')} · ${modeReason}`} error={error} success={success} onDismiss={() => { setError(null); setSuccess(null) }} />{active === 'dashboard' && <><Dashboard completedSets={completedSets} onWorkout={() => setActive('workout')} schedule={schedule} preferences={preferences} updatePreferences={updatePreferences} /><NutritionSummary nutrition={nutrition} onOpen={() => setActive('nutrition')} /></>}{active === 'workout' && <WorkoutPage workout={workout} completedSets={completedSets} totalSets={totalSets} workoutComplete={workoutComplete} toggleSet={(exerciseId, exerciseName, index) => void toggleSet(exerciseId, exerciseName, index)} updateSet={updateSet} timer={timer} timerRunning={timerRunning} setTimerRunning={setTimerRunning} resetWorkout={resetWorkout} onComplete={() => void finish()} history={history} />}{active === 'progress' && <ProgressPage history={history} />}{active === 'nutrition' && <NutritionPage nutrition={nutrition} />}{active === 'coaching' && <CoachingPage settings={settings} />}{active === 'settings' && <SettingsPage settings={settings} onChange={updateSettings} auth={auth} />}</div></main><BottomNav active={active} onChange={setActive} /></div>
}

function mondayOf(date: Date) { const copy = new Date(date); const day = copy.getDay(); copy.setDate(copy.getDate() - ((day + 6) % 7)); return copy.toISOString().slice(0, 10) }
function sessionLabel(id: SessionId) { return id.replace('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }

function SyncBanner({ mode, reason, error, success, onDismiss }: { mode: 'loading' | 'demo' | 'supabase'; reason: string; error: string | null; success: string | null; onDismiss: () => void }) {
  const message = error ?? success ?? reason
  if (!message && mode !== 'loading') return null
  return <div className={error ? 'sync-banner error' : success ? 'sync-banner success' : 'sync-banner'} role="status"><span className="sync-dot" /><span>{mode === 'loading' ? 'Loading workout…' : mode === 'supabase' ? 'Supabase account' : 'Local mode'} · {message}</span>{(error || success) && <button onClick={onDismiss} aria-label="Dismiss status">×</button>}</div>
}

function Dashboard({ completedSets, onWorkout, schedule, preferences, updatePreferences }: { completedSets: number; onWorkout: () => void; schedule: ReturnType<typeof buildWeeklySchedule>; preferences: TrainingPreferences; updatePreferences: (preferences: TrainingPreferences) => void }) {
  return <motion.div className="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><section className="hero-grid"><div className="hero-copy"><span className="eyebrow lime">{sessionLabel(schedule[0]?.sessionId ?? 'upper-a')} / adaptive plan</span><h1>Build the<br /><span>silhouette.</span></h1><p className="hero-sub">A focused session for the shape you’re after. One deliberate set at a time.</p><button className="primary-button" onClick={onWorkout}><Play size={16} fill="currentColor" /> Start today’s workout <ArrowUpRight size={16} /></button><div className="hero-meta"><span><span className="meta-dot" /> Local plan</span><span><Clock3 size={14} /> 52 min</span></div></div><div className="hero-visual"><div className="orb-label"><span>01</span><strong>Shape<br />protocol</strong></div><PhysiqueOrb /><div className="orb-caption">Lat / delt / upper chest<br /><span>V-Taper focus · Week 06</span></div></div></section><section className="section-heading"><div><span className="eyebrow">Your operating picture</span><h2>Today, at a glance</h2></div><span className="demo-tag"><Sparkles size={13} /> Local data</span></section><section className="metric-grid"><div className="metric-panel workout-panel"><div className="panel-top"><div><span className="eyebrow">Today’s session</span><h3>{sessionLabel(schedule[0]?.sessionId ?? 'upper-a')}</h3></div><ProgressRing value={Math.round((completedSets / 14) * 100)} label="done" /></div><div className="session-line"><span><DumbbellMark /> 4 movements</span><span><Clock3 size={14} /> ~52 min</span><span className="status-pill"><span /> In progress</span></div><button className="text-button" onClick={onWorkout}>Open session <ChevronRight size={15} /></button></div><div className="metric-panel streak-panel"><div className="panel-top"><div><span className="eyebrow">Consistency</span><h3>Keep the chain</h3></div><Flame className="accent-icon" size={20} /></div><div className="streak-number">06 <span>days</span></div><div className="week-dots">{['M','T','W','T','F','S','S'].map((day, index) => <span key={`${day}-${index}`} className={index < 6 ? 'done' : ''}><i>{index < 6 ? <Check size={11} /> : ''}</i>{day}</span>)}</div><div className="trend-note"><Zap size={14} /> +18% from last month</div></div><div className="metric-panel body-panel"><div className="panel-top"><div><span className="eyebrow">Bodyweight</span><h3>Moving with intent</h3></div><span className="delta">−1.1 kg</span></div><div className="body-value">73.1 <span>kg</span></div><Sparkline /><div className="chart-footer"><span>6 week trend</span><span>Target 72.0 kg</span></div></div></section><TrainingPlan schedule={schedule} preferences={preferences} updatePreferences={updatePreferences} /><section className="quote-strip"><Trophy size={18} /><p>“The best physique work is the work you can repeat.”</p><span>VT / principle 04</span></section></motion.div>
}

function TrainingPlan({ schedule, preferences, updatePreferences }: { schedule: ReturnType<typeof buildWeeklySchedule>; preferences: TrainingPreferences; updatePreferences: (preferences: TrainingPreferences) => void }) {
  return <section className="training-plan"><div className="section-heading"><div><span className="eyebrow">Training plan</span><h2>This week, by design</h2></div><div className="availability"><span className="eyebrow">Days</span>{([4, 5, 6] as const).map((days) => <button key={days} className={preferences.daysAvailable === days ? 'active' : ''} onClick={() => updatePreferences({ ...preferences, daysAvailable: days })}>{days}</button>)}</div></div><div className="schedule-grid">{schedule.map((day) => <div className="schedule-day" key={day.date}><span>{new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}</span><strong>{sessionLabel(day.sessionId)}</strong><small>{day.status === 'completed' ? 'Completed' : day.date === schedule[0]?.date ? 'Today' : 'Planned'}</small><select aria-label={`Override ${day.date}`} value={preferences.overrides[day.date] ?? day.sessionId} onChange={(event) => updatePreferences({ ...preferences, overrides: { ...preferences.overrides, [day.date]: event.target.value as SessionId } })}><option value={day.sessionId}>Keep session</option><option value="upper-a">Upper A</option><option value="lower-a">Lower A</option><option value="upper-b">Upper B</option><option value="lower-b">Lower B</option><option value="arms">Arms</option><option value="conditioning">Conditioning</option></select></div>)}</div></section>
}

function NutritionSummary({ nutrition, onOpen }: { nutrition: ReturnType<typeof useNutrition>; onOpen: () => void }) {
  const logDate = new Date(`${nutrition.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return <button className="nutrition-summary" onClick={onOpen}><span className="eyebrow">Nutrition log · {logDate}</span><strong>{nutrition.totals.calories.toLocaleString()} <small>/ {nutrition.targets.calories.toLocaleString()} kcal</small></strong><span>{nutrition.totals.protein} g protein · {nutrition.day.waterMl} ml water</span><i><span style={{ width: `${nutrition.totals.caloriesProgress}%` }} /></i></button>
}

function DumbbellMark() { return <span className="dumbbell-mark">▮━▮</span> }

type WorkoutProps = { sessionLabel?: string; workout: WorkoutState; completedSets: number; totalSets: number; workoutComplete: boolean; toggleSet: (id: string, name: string, index: number) => void; updateSet: (id: string, index: number, field: keyof Pick<SetLog, 'weight' | 'reps'>, value: number) => void; timer: number; timerRunning: boolean; setTimerRunning: (value: boolean) => void; resetWorkout: () => void; onComplete: () => void; history: Array<{ id: string; sessionDate: string; status: 'in_progress' | 'completed'; completedAt: string | null }> }
function WorkoutPage({ sessionLabel: currentSession = 'Upper A', workout, completedSets, totalSets, workoutComplete, toggleSet, updateSet, timer, timerRunning, setTimerRunning, resetWorkout, onComplete, history }: WorkoutProps) {
  void currentSession
  const minutes = String(Math.floor(timer / 60)).padStart(2, '0'); const seconds = String(timer % 60).padStart(2, '0')
  return <motion.div className="workout-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><div className="workout-header"><div><span className="eyebrow lime">Session 06 / upper focus</span><h1>Train with intent.</h1><p>Saturday · {completedSets}/{totalSets} sets complete</p></div><div className="timer-card"><span className="eyebrow">Rest timer</span><strong>{minutes}:{seconds}</strong><div><button onClick={() => setTimerRunning(!timerRunning)}>{timerRunning ? 'Pause' : 'Start'}</button><button onClick={() => { setTimerRunning(false); resetWorkout() }} aria-label="Reset workout"><RotateCcw size={13} /></button></div></div></div><div className="progress-track"><span style={{ width: `${(completedSets / totalSets) * 100}%` }} /></div>{workoutComplete && <div className="complete-banner"><Trophy size={20} /><div><strong>Session complete.</strong><span>{history.length ? `${history.length} sessions in history.` : 'Ready to save this session.'}</span></div><button onClick={onComplete}>Save workout</button><button onClick={resetWorkout} aria-label="Reset demo"><RotateCcw size={13} /></button></div>}<div className="exercise-list">{exercises.map((exercise, exerciseIndex) => <section className="exercise-card" key={exercise.id}><div className="exercise-head"><div><span className="exercise-index">0{exerciseIndex + 1}</span><h2>{exercise.name}</h2><p>{exercise.focus} · {exercise.sets} sets · {exercise.reps} reps</p></div><span className="exercise-status">{workout[exercise.id].filter((set) => set.completed).length}/{exercise.sets}</span></div><div className="set-head"><span>Set</span><span>Weight / kg</span><span>Reps</span><span>Done</span></div>{workout[exercise.id].map((set, index) => <div className={set.completed ? 'set-row complete' : 'set-row'} key={index}><span className="set-number">{index + 1}</span><input aria-label={`${exercise.name} set ${index + 1} weight`} type="number" value={set.weight} onChange={(event) => updateSet(exercise.id, index, 'weight', Number(event.target.value))} /><input aria-label={`${exercise.name} set ${index + 1} reps`} type="number" value={set.reps} onChange={(event) => updateSet(exercise.id, index, 'reps', Number(event.target.value))} /><button className="set-check" aria-label={`Mark set ${index + 1} complete`} onClick={() => toggleSet(exercise.id, exercise.name, index)}>{set.completed ? <Check size={16} /> : ''}</button></div>)}</section>)}</div>{history.length > 0 && <section className="history-panel"><span className="eyebrow">Workout history</span><h3>Recent sessions</h3>{history.slice(0, 5).map((item) => <div className="history-row" key={item.id}><span>{item.sessionDate}</span><strong>{item.status.replace('_', ' ')}</strong></div>)}</section>}</motion.div>
}

function ProgressPage(_props: { history: Array<{ id: string; sessionDate: string; status: 'in_progress' | 'completed'; completedAt: string | null }> }) { return <TransformationPage /> }

export default App
