import { useCallback, useEffect, useState } from 'react'
import {
  createHousehold,
  getLastHouseholdId,
  loadHousehold,
  saveHousehold,
} from '../storage'
import type { CheckIn, Household, Trip } from '../types'

function householdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('h')
}

export function useHousehold() {
  const [household, setHousehold] = useState<Household | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const fromUrl = householdFromUrl()
    const id = fromUrl ?? getLastHouseholdId()
    if (id) {
      const existing = loadHousehold(id)
      if (existing) {
        setHousehold(existing)
      } else if (fromUrl) {
        // Shared link for a household this browser hasn't created yet —
        // seed an empty shell so helpers can still join the same code.
        const seeded = createHousehold('Shared pets')
        seeded.id = fromUrl
        saveHousehold(seeded)
        setHousehold(seeded)
      }
    }
    setReady(true)
  }, [])

  const persist = useCallback((next: Household) => {
    saveHousehold(next)
    setHousehold(next)
  }, [])

  const startHousehold = useCallback((name: string) => {
    const next = createHousehold(name)
    saveHousehold(next)
    const url = new URL(window.location.href)
    url.searchParams.set('h', next.id)
    window.history.replaceState({}, '', url.toString())
    setHousehold(next)
    return next
  }, [])

  const joinHousehold = useCallback((id: string) => {
    const cleaned = id.trim().toLowerCase()
    const existing = loadHousehold(cleaned)
    if (existing) {
      saveHousehold(existing)
      const url = new URL(window.location.href)
      url.searchParams.set('h', existing.id)
      window.history.replaceState({}, '', url.toString())
      setHousehold(existing)
      return existing
    }
    const seeded = createHousehold('Shared pets')
    seeded.id = cleaned
    saveHousehold(seeded)
    const url = new URL(window.location.href)
    url.searchParams.set('h', seeded.id)
    window.history.replaceState({}, '', url.toString())
    setHousehold(seeded)
    return seeded
  }, [])

  const addCheckIn = useCallback(
    (checkIn: CheckIn) => {
      if (!household) return
      persist({
        ...household,
        checkIns: [checkIn, ...household.checkIns],
      })
    },
    [household, persist],
  )

  const addTrip = useCallback(
    (trip: Trip) => {
      if (!household) return
      persist({
        ...household,
        trips: [trip, ...household.trips],
      })
    },
    [household, persist],
  )

  const updateTrip = useCallback(
    (trip: Trip) => {
      if (!household) return
      persist({
        ...household,
        trips: household.trips.map((t) => (t.id === trip.id ? trip : t)),
      })
    },
    [household, persist],
  )

  const deleteTrip = useCallback(
    (tripId: string) => {
      if (!household) return
      persist({
        ...household,
        trips: household.trips.filter((t) => t.id !== tripId),
      })
    },
    [household, persist],
  )

  const updateTasks = useCallback(
    (tasks: string[]) => {
      if (!household) return
      persist({ ...household, tasks })
    },
    [household, persist],
  )

  const renameHousehold = useCallback(
    (name: string) => {
      if (!household) return
      persist({ ...household, name: name.trim() || household.name })
    },
    [household, persist],
  )

  const leaveHousehold = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('h')
    window.history.replaceState({}, '', url.toString())
    setHousehold(null)
  }, [])

  return {
    household,
    ready,
    startHousehold,
    joinHousehold,
    addCheckIn,
    addTrip,
    updateTrip,
    deleteTrip,
    updateTasks,
    renameHousehold,
    leaveHousehold,
  }
}
