import { describe, expect, it } from 'vitest'
import { buildWeeklySchedule } from './scheduler'

describe('buildWeeklySchedule', () => {
  it('selects a deterministic 4-day split from the six-day template', () => {
    const schedule = buildWeeklySchedule({ daysAvailable: 4, weekStart: '2026-10-26' })
    expect(schedule.map((day) => day.sessionId)).toEqual(['upper-a', 'lower-a', 'upper-b', 'lower-b'])
    expect(schedule.map((day) => day.date)).toEqual(['2026-10-26', '2026-10-27', '2026-10-29', '2026-10-30'])
  })

  it('preserves completed history and applies an explicit override', () => {
    const schedule = buildWeeklySchedule({
      daysAvailable: 5,
      weekStart: '2026-10-26',
      completedSessionIds: ['upper-a'],
      overrides: { '2026-10-28': 'conditioning' },
    })
    expect(schedule.find((day) => day.date === '2026-10-26')?.status).toBe('completed')
    expect(schedule.find((day) => day.date === '2026-10-28')?.sessionId).toBe('conditioning')
  })

  it('clamps invalid availability to the supported range', () => {
    expect(buildWeeklySchedule({ daysAvailable: 7, weekStart: '2026-10-26' })).toHaveLength(6)
    expect(buildWeeklySchedule({ daysAvailable: 0, weekStart: '2026-10-26' })).toHaveLength(4)
  })
})
