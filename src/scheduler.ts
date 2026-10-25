export type SessionId = 'upper-a' | 'lower-a' | 'upper-b' | 'lower-b' | 'arms' | 'conditioning'

export type ScheduleDay = {
  date: string
  sessionId: SessionId
  status: 'planned' | 'completed'
}

export type ScheduleInput = {
  daysAvailable: number
  weekStart: string
  completedSessionIds?: SessionId[]
  overrides?: Partial<Record<string, SessionId>>
}

const template: SessionId[] = ['upper-a', 'lower-a', 'upper-b', 'lower-b', 'arms', 'conditioning']

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function buildWeeklySchedule(input: ScheduleInput): ScheduleDay[] {
  const count = Math.min(6, Math.max(4, Math.trunc(input.daysAvailable)))
  const completed = new Set(input.completedSessionIds ?? [])
  const selected = template.slice(0, count)
  const days: ScheduleDay[] = []
  let cursor = 0

  for (let dayIndex = 0; dayIndex < 6 && days.length < count; dayIndex += 1) {
    const date = addDays(input.weekStart, dayIndex)
    if (dayIndex > 0 && dayIndex < 5 && count === 4 && dayIndex === 2) continue
    const sessionId = input.overrides?.[date] ?? selected[cursor]
    if (sessionId) {
      days.push({ date, sessionId, status: completed.has(sessionId) ? 'completed' : 'planned' })
      cursor += 1
    }
  }
  return days
}
