import { describe, expect, it } from 'vitest'
import { calculateTransformationSummary, createMeasurement, deleteMeasurement, transformationMeasurementSchema } from './transformation'

describe('transformation tracking', () => {
  it('validates safe physiological measurement ranges', () => {
    expect(transformationMeasurementSchema.safeParse({ id: 'test', date: '2026-10-25', weightKg: 73.2, waistCm: 82 }).success).toBe(true)
    expect(transformationMeasurementSchema.safeParse({ id: 'test', date: '2026-10-25', weightKg: -1 }).success).toBe(false)
  })

  it('sorts entries by date and calculates weight and waist change', () => {
    const records = [
      createMeasurement({ date: '2026-10-25', weightKg: 72.8, waistCm: 80 }),
      createMeasurement({ date: '2026-09-25', weightKg: 74.1, waistCm: 83 }),
    ]
    const summary = calculateTransformationSummary(records)
    expect(summary.latest?.date).toBe('2026-10-25')
    expect(summary.weightChangeKg).toBe(-1.3)
    expect(summary.waistChangeCm).toBe(-3)
  })

  it('deletes only the selected measurement record', () => {
    const first = createMeasurement({ date: '2026-10-24', weightKg: 73 })
    const second = createMeasurement({ date: '2026-10-25', weightKg: 72.9 })
    expect(deleteMeasurement([first, second], first.id)).toEqual([second])
  })
})
