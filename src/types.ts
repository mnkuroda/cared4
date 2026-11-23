export const DEFAULT_TASKS = [
  'Fed cats',
  'Fed dogs',
  'Let dogs out',
  'Refilled water',
  'Gave medication',
  'Scooped litter',
] as const

export interface CheckIn {
  id: string
  personName: string
  task: string
  note: string
  at: string
}

export interface ScheduleSlot {
  id: string
  time: string
  task: string
}

export interface Trip {
  id: string
  title: string
  startDate: string
  endDate: string
  notes: string
  slots: ScheduleSlot[]
}

export interface Household {
  id: string
  name: string
  tasks: string[]
  checkIns: CheckIn[]
  trips: Trip[]
  createdAt: string
}

export type TabId = 'checkin' | 'log' | 'schedule'
