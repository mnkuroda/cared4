import { canonicalTask, type CheckIn, type ScheduleSlot, type Trip } from '../types'

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key: string): Date {
  return new Date(key + 'T12:00:00')
}

export function eachDay(startKey: string, endKey: string): string[] {
  const days: string[] = []
  const cursor = parseDateKey(startKey)
  const end = parseDateKey(endKey)
  while (cursor <= end) {
    days.push(toDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function activeTripOn(trips: Trip[], dateKey: string): Trip | null {
  return (
    trips.find((trip) => trip.startDate <= dateKey && trip.endDate >= dateKey) ?? null
  )
}

export function checkInsOnDay(checkIns: CheckIn[], dateKey: string): CheckIn[] {
  return checkIns.filter((entry) => toDateKey(new Date(entry.at)) === dateKey)
}

export type SlotTaskStatus = {
  task: string
  done: boolean
  by?: string
  at?: string
}

export type DaySlotStatus = {
  slot: ScheduleSlot
  tasks: SlotTaskStatus[]
  openCount: number
  doneCount: number
}

export function daySlotStatuses(
  slots: ScheduleSlot[],
  checkIns: CheckIn[],
  dateKey: string,
): DaySlotStatus[] {
  const dayLogs = checkInsOnDay(checkIns, dateKey)
  const used = new Set<string>()

  return [...slots]
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((slot) => {
      const uniqueTasks = [...new Set(slot.tasks.map(canonicalTask).filter(Boolean))]
      const tasks = uniqueTasks.map((task) => {
        const match = dayLogs.find(
          (entry) => canonicalTask(entry.task) === task && !used.has(entry.id),
        )
        if (match) used.add(match.id)
        return {
          task,
          done: Boolean(match),
          by: match?.personName,
          at: match?.at,
        }
      })
      const doneCount = tasks.filter((t) => t.done).length
      return {
        slot: { ...slot, tasks: uniqueTasks },
        tasks,
        doneCount,
        openCount: tasks.length - doneCount,
      }
    })
}

export function formatSlotTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** Friendly visit name for a care time (helpers usually do the whole group). */
export function routineLabel(time: string): string {
  const hour = Number(time.split(':')[0])
  if (!Number.isFinite(hour)) return 'Care Routine'
  if (hour < 10) return 'Morning Routine'
  if (hour < 14) return 'Midday Routine'
  if (hour < 17) return 'Afternoon Routine'
  if (hour < 21) return 'Evening Routine'
  return 'Night Routine'
}

export function monthMatrix(year: number, monthIndex: number): (string | null)[][] {
  const first = new Date(year, monthIndex, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < startPad; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toDateKey(new Date(year, monthIndex, day)))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}
