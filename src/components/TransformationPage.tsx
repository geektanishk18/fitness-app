import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Camera, Check, Ruler, Trash2, Weight } from 'lucide-react'
import { motion } from 'framer-motion'
import { measurementFields, calculateTransformationSummary, type MeasurementInput, type TransformationMeasurement } from '../transformation'
import { useTransformation } from '../hooks/useTransformation'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import type { ProgressPhoto } from '../lib/transformationRepository'

type MeasurementKey = (typeof measurementFields)[number]['key']
type Draft = Record<MeasurementKey, string> & { date: string; note: string }
function today() { return new Date().toISOString().slice(0, 10) }
function emptyDraft(): Draft { return { date: today(), note: '', weightKg: '', waistCm: '', chestCm: '', hipsCm: '', leftArmCm: '', rightArmCm: '', leftThighCm: '', rightThighCm: '', neckCm: '' } }

export function TransformationPage() {
  const auth = useSupabaseAuth()
  const tracking = useTransformation(auth.accountSyncAllowed ? auth.user?.id ?? null : null, navigator.onLine)
  const { records, photos, loading, error, success, setSuccess, setError, save, remove, savePhoto, removePhoto } = tracking
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const measurementDate = useRef<HTMLInputElement>(null)
  const summary = useMemo(() => calculateTransformationSummary(records), [records])
  const latestWeight = summary.latest?.weightKg
  const delta = summary.weightChangeKg

  const saveMeasurement = () => {
    const input: MeasurementInput = { date: measurementDate.current?.value ?? draft.date, note: draft.note || undefined }
    for (const field of measurementFields) {
      const value = draft[field.key]
      if (value.trim()) input[field.key] = Number(value)
    }
    save(input, editingId ?? undefined)
    setDraft((current) => ({ ...current, date: input.date }))
    setEditingId(null)
  }

  const editMeasurement = (record: TransformationMeasurement) => {
    setEditingId(record.id)
    setDraft({ date: record.date, note: record.note ?? '', ...Object.fromEntries(measurementFields.map(({ key }) => [key, record[key]?.toString() ?? ''])) as Record<MeasurementKey, string> })
  }

  const onPhoto = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Choose an image smaller than 10 MB.'); return }
    const photo: ProgressPhoto = { id: globalThis.crypto?.randomUUID?.() ?? `photo-${Date.now()}`, date: today(), name: file.name, mimeType: file.type, blob: file }
    await savePhoto(photo)
  }

  return <motion.div className="transformation-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <header className="transformation-header"><div><span className="eyebrow lime">Progress / transformation</span><h1>Measure what matters.</h1><p className="support-copy">Bodyweight, measurements, and private progress photos in one timeline.</p></div><span className="demo-tag">Stored on this device</span></header>
    {loading && <p className="transformation-state" role="status">Loading your progress…</p>}
    {error && <p className="transformation-state error" role="alert">{error}</p>}
    {success && <button className="transformation-state success" role="status" onClick={() => setSuccess(null)}><Check size={14} /> {success} <span>Dismiss</span></button>}

    <section className="transformation-stats"><div className="transform-stat"><span className="eyebrow">Latest weight</span><strong>{latestWeight === undefined ? '—' : `${latestWeight} kg`}</strong><small>{summary.latest?.date ?? 'Add your first measurement'}</small></div><div className="transform-stat"><span className="eyebrow">Weight change</span><strong className={delta === null ? '' : delta <= 0 ? 'positive' : 'caution'}>{delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta} kg`}</strong><small>{records.length < 2 ? 'Log another date to see change' : `${summary.first?.date} to ${summary.latest?.date}`}</small></div><div className="transform-stat"><span className="eyebrow">Waist change</span><strong>{summary.waistChangeCm === null ? '—' : `${summary.waistChangeCm > 0 ? '+' : ''}${summary.waistChangeCm} cm`}</strong><small>{summary.latest?.waistCm === undefined ? 'No waist reading yet' : `Latest ${summary.latest.waistCm} cm`}</small></div></section>

    <div className="transformation-grid"><section className="transform-card"><div className="section-heading"><div><span className="eyebrow">Bodyweight</span><h2>Your trend</h2></div><Weight size={18} className="accent-icon" /></div>{summary.chartData.length > 1 ? <div className="transform-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={summary.chartData} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}><defs><linearGradient id="transform-weight-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9f36a" stopOpacity={0.24} /><stop offset="100%" stopColor="#c9f36a" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#2b352e" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} axisLine={false} tickLine={false} tick={{ fill: '#7f8a82', fontSize: 10 }} /><YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fill: '#7f8a82', fontSize: 10 }} width={42} /><Tooltip contentStyle={{ background: '#181e1b', border: '1px solid #2e3932', borderRadius: 10, color: '#eef4ed' }} formatter={(value) => [`${value} kg`, 'Weight']} /><Area type="monotone" dataKey="weight" stroke="#c9f36a" strokeWidth={2} fill="url(#transform-weight-fill)" /></AreaChart></ResponsiveContainer></div> : <p className="transform-empty">{summary.chartData.length === 1 ? 'Add another weigh-in on a different date to reveal your trend.' : 'Your weight trend will appear here after you log measurements.'}</p>}</section>

      <section className="transform-card measurement-form"><div className="section-heading"><div><span className="eyebrow">Check-in</span><h2>{editingId ? 'Update measurements' : 'Log a measurement'}</h2></div><Ruler size={18} className="accent-icon" /></div><label className="transform-date">Date<input ref={measurementDate} key={editingId ?? 'new'} type="date" defaultValue={draft.date} /></label><div className="measurement-fields">{measurementFields.map(({ key, label, unit }) => <label key={key}>{label} <span>{unit}</span><input type="number" step="0.1" min="0.1" placeholder="—" value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}</div><label className="transform-note">Note <textarea maxLength={500} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Optional context for this check-in" /></label><div className="transform-form-actions"><button className="primary-button" onClick={saveMeasurement}>{editingId ? 'Save changes' : 'Save check-in'}</button>{editingId && <button onClick={() => { setEditingId(null); setDraft(emptyDraft()) }}>Cancel</button>}</div></section></div>

    <section className="transform-card measurement-history"><div className="section-heading"><div><span className="eyebrow">Your record</span><h2>Measurement history</h2></div><span className="demo-tag">{records.length} check-ins</span></div>{records.length === 0 ? <p className="transform-empty">No check-ins yet. Add your first weight or measurement above.</p> : records.map((record) => <article className="measurement-row" key={record.id}><div className="measurement-date"><strong>{new Date(`${record.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>{record.note && <small>{record.note}</small>}</div><div className="measurement-values">{measurementFields.filter(({ key }) => record[key] !== undefined).map(({ key, label, unit }) => <span key={key}>{label} <strong>{record[key]} {unit}</strong></span>)}</div><div className="measurement-actions"><button aria-label={`Edit measurements for ${record.date}`} onClick={() => editMeasurement(record)}>Edit</button><button aria-label={`Delete measurements for ${record.date}`} onClick={() => remove(record.id)}><Trash2 size={14} /></button></div></article>)}</section>

    <section className="transform-card photo-section"><div className="section-heading"><div><span className="eyebrow">Private gallery</span><h2>Progress photos</h2></div><label className="photo-add"><Camera size={15} /> Add photo<input aria-label="Add progress photo" type="file" accept="image/*" onChange={(event) => { void onPhoto(event.target.files?.[0]); event.target.value = '' }} /></label></div><p className="photo-privacy">Photos are stored in this browser on this device. They are not uploaded or synced.</p>{photos.length === 0 ? <p className="transform-empty">A private visual timeline can complement your measurements.</p> : <div className="photo-grid">{photos.map((photo) => <ProgressPhotoTile key={photo.id} photo={photo} onRemove={() => void removePhoto(photo.id)} />)}</div>}</section>
  </motion.div>
}

function ProgressPhotoTile({ photo, onRemove }: { photo: ProgressPhoto; onRemove: () => void }) {
  const [url, setUrl] = useState('')
  useEffect(() => { const next = URL.createObjectURL(photo.blob); setUrl(next); return () => URL.revokeObjectURL(next) }, [photo.blob])
  return <figure className="photo-tile"><img src={url} alt={`Progress photo from ${photo.date}`} /><figcaption>{photo.date}<button aria-label={`Delete photo ${photo.name}`} onClick={onRemove}><Trash2 size={14} /></button></figcaption></figure>
}
