import { describe, expect, it } from 'vitest'
import { defaultWorkout, exercises } from './data'

describe('demo workout data', () => {
  it('creates one log row per prescribed set', () => {
    expect(Object.keys(defaultWorkout)).toHaveLength(exercises.length)
    expect(Object.values(defaultWorkout).flat()).toHaveLength(14)
    expect(Object.values(defaultWorkout).flat().every((set) => set.completed === false)).toBe(true)
  })
})
