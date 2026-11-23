import { DEFAULT_TASKS, type Household } from './types'

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

export function getLastHouseholdId(): string | null {
  return localStorage.getItem(LAST_HOUSEHOLD_KEY)
}

export function rememberHouseholdId(id: string): void {
  localStorage.setItem(LAST_HOUSEHOLD_KEY, id)
}

export function clearLastHouseholdId(): void {
  localStorage.removeItem(LAST_HOUSEHOLD_KEY)
}

function ownerKey(householdId: string): string {
  return `cared4:owner:${householdId}`
}

/** Creator's browser can manage the schedule; helpers cannot. */
export function markHouseholdOwner(householdId: string): void {
  localStorage.setItem(ownerKey(householdId), '1')
}

export function isHouseholdOwner(householdId: string): boolean {
  return localStorage.getItem(ownerKey(householdId)) === '1'
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
