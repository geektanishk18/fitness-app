import { z } from 'zod'

export const transformationMeasurementSchema = z.object({
  id: z.string().min(1),
  date: z.iso.date(),
  weightKg: z.number().positive().max(500).optional(),
  waistCm: z.number().positive().max(300).optional(),
  chestCm: z.number().positive().max(300).optional(),
  hipsCm: z.number().positive().max(300).optional(),
  leftArmCm: z.number().positive().max(150).optional(),
  rightArmCm: z.number().positive().max(150).optional(),
  leftThighCm: z.number().positive().max(200).optional(),
  rightThighCm: z.number().positive().max(200).optional(),
  neckCm: z.number().positive().max(100).optional(),
  note: z.string().max(500).optional(),
}).refine((value) => Object.entries(value).some(([key, field]) => key !== 'id' && key !== 'date' && field !== undefined && field !== ''), { message: 'Add at least one body measurement.' })

export type TransformationMeasurement = z.infer<typeof transformationMeasurementSchema>
export type MeasurementInput = Omit<TransformationMeasurement, 'id'>

export const measurementFields = [
  { key: 'weightKg', label: 'Weight', unit: 'kg' },
  { key: 'waistCm', label: 'Waist', unit: 'cm' },
  { key: 'chestCm', label: 'Chest', unit: 'cm' },
  { key: 'hipsCm', label: 'Hips', unit: 'cm' },
  { key: 'leftArmCm', label: 'Left arm', unit: 'cm' },
  { key: 'rightArmCm', label: 'Right arm', unit: 'cm' },
  { key: 'leftThighCm', label: 'Left thigh', unit: 'cm' },
  { key: 'rightThighCm', label: 'Right thigh', unit: 'cm' },
  { key: 'neckCm', label: 'Neck', unit: 'cm' },
] as const

export function createMeasurement(input: MeasurementInput, existingId?: string): TransformationMeasurement {
  const id = existingId ?? globalThis.crypto?.randomUUID?.() ?? `measurement-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return transformationMeasurementSchema.parse({ ...input, id })
}

export function upsertMeasurement(records: TransformationMeasurement[], measurement: TransformationMeasurement) {
  return [measurement, ...records.filter((record) => record.date !== measurement.date)].sort((a, b) => b.date.localeCompare(a.date))
}

export function deleteMeasurement(records: TransformationMeasurement[], id: string) {
  return records.filter((record) => record.id !== id)
}

export function calculateTransformationSummary(records: TransformationMeasurement[]) {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0]
  const latest = sorted.at(-1)
  return {
    first,
    latest,
    weightChangeKg: first?.weightKg !== undefined && latest?.weightKg !== undefined ? Math.round((latest.weightKg - first.weightKg) * 10) / 10 : null,
    waistChangeCm: first?.waistCm !== undefined && latest?.waistCm !== undefined ? Math.round((latest.waistCm - first.waistCm) * 10) / 10 : null,
    chartData: sorted.filter((record) => record.weightKg !== undefined).map((record) => ({ date: record.date, weight: record.weightKg as number })),
  }
}
