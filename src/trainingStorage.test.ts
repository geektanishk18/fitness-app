import { describe, expect, it } from 'vitest'
import { loadTrainingHistory } from './trainingStorage'

describe('local training persistence', () => {
  it('returns an empty history when storage is unavailable or empty', () => {
    expect(loadTrainingHistory()).toEqual([])
  })
})
