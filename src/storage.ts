import { DEFAULT_TASKS, normalizeTrip, type Household } from './types'

const REMOVED_TASKS = new Set(['Gave medication', 'Scooped litter'])

function migrateTasks(tasks: string[]): string[] {
  const next = tasks.filter((task) => !REMOVED_TASKS.has(task))
  if (!next.includes('Emptied litter robot')) {
    next.push('Emptied litter robot')
  }
  return next
}

const STORAGE_PREFIX = 'cared4:household:'
const LAST_HOUSEHOLD_KEY = 'cared4:lastHouseholdId'
const LAST_NAME_KEY = 'cared4:lastName'

function makeId(): string {
  return crypto.randomUUID()
}

export function createHouseholdId(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  let id = ''
  for (let i = 0; i < 8; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return id
}

export function createHousehold(name: string): Household {
  return {
    id: createHouseholdId(),
    name: name.trim() || 'My pets',
    tasks: [...DEFAULT_TASKS],
    checkIns: [],
    trips: [],
    createdAt: new Date().toISOString(),
  }
}

export function loadHousehold(id: string): Household | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Household
    return {
      ...parsed,
      tasks: migrateTasks(parsed.tasks ?? [...DEFAULT_TASKS]),
      trips: (parsed.trips ?? []).map(normalizeTrip),
    }
  } catch {
    return null
  }
}

export function saveHousehold(household: Household): void {
  localStorage.setItem(STORAGE_PREFIX + household.id, JSON.stringify(household))
  localStorage.setItem(LAST_HOUSEHOLD_KEY, household.id)
}

export function getLastHouseholdId(): string | null {
  return localStorage.getItem(LAST_HOUSEHOLD_KEY)
}

export function getRememberedName(): string {
  return localStorage.getItem(LAST_NAME_KEY) ?? ''
}

export function rememberName(name: string): void {
  localStorage.setItem(LAST_NAME_KEY, name.trim())
}

export function newCheckInId(): string {
  return makeId()
}

export function newTripId(): string {
  return makeId()
}

export function newSlotId(): string {
  return makeId()
}

export function shareUrl(householdId: string): string {
  const url = new URL(window.location.href)
  url.searchParams.set('h', householdId)
  url.hash = ''
  return url.toString()
}
