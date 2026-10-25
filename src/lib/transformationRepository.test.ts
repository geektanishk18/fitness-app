import { beforeEach, describe, expect, it } from 'vitest'
import { LocalTransformationRepository } from './transformationRepository'

describe('LocalTransformationRepository', () => {
  beforeEach(() => localStorage.clear())

  it('persists measurements by date and replaces that date without erasing history', () => {
    const repository = new LocalTransformationRepository()
    repository.saveMeasurement({ id: 'a', date: '2026-10-24', weightKg: 73 })
    repository.saveMeasurement({ id: 'b', date: '2026-10-25', waistCm: 82 })
    repository.saveMeasurement({ id: 'c', date: '2026-10-25', weightKg: 72.8 })
    expect(repository.listMeasurements()).toHaveLength(2)
    expect(repository.listMeasurements()[0].weightKg).toBe(72.8)
  })
})
