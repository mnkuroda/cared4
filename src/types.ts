export const DEFAULT_TASKS = [
  'Feed cat(s)',
  'Feed dog(s)',
  'Let dog(s) out',
  'Refill water',
  'Empty litter robot',
] as const

export interface CheckIn {
  id: string
  personName: string
  task: string
  note: string
  at: string
  photoUrl?: string
}

export interface ScheduleSlot {
  id: string
  time: string
  tasks: string[]
}

/** Older saves used a single `task` string per slot. */
export type LegacyScheduleSlot = {
  id: string
  time: string
  task?: string
  tasks?: string[]
}

export interface Trip {
  id: string
  title: string
  startDate: string
  endDate: string
  notes: string
  slots: ScheduleSlot[]
}

/** Who is covering a specific care time on a specific day. */
export interface Assignment {
  id: string
  tripId: string
  date: string
  time: string
  personName: string
}

export interface Household {
  id: string
  name: string
  tasks: string[]
  checkIns: CheckIn[]
  trips: Trip[]
  assignments: Assignment[]
  createdAt: string
}

export type TabId = 'calendar' | 'checkin' | 'log' | 'schedule'

export function normalizeSlot(slot: LegacyScheduleSlot): ScheduleSlot {
  if (Array.isArray(slot.tasks) && slot.tasks.length > 0) {
    return { id: slot.id, time: slot.time, tasks: [...slot.tasks] }
  }
  if (typeof slot.task === 'string' && slot.task) {
    return { id: slot.id, time: slot.time, tasks: [slot.task] }
  }
  return { id: slot.id, time: slot.time, tasks: [] }
}

export function normalizeTrip(trip: Trip & { slots: LegacyScheduleSlot[] }): Trip {
  return {
    ...trip,
    slots: trip.slots.map(normalizeSlot),
  }
}
