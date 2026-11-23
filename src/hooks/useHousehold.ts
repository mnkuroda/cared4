import { useCallback, useEffect, useState } from 'react'
import {
  createHouseholdRemote,
  deleteTripRemote,
  fetchHousehold,
  insertCheckIn,
  insertTrip,
  subscribeHousehold,
} from '../api/households'
import { isCloudConfigured } from '../lib/supabase'
import {
  clearLastHouseholdId,
  createHousehold,
  getLastHouseholdId,
  isHouseholdOwner,
  markHouseholdOwner,
  rememberHouseholdId,
} from '../storage'
import type { CheckIn, Household, Trip } from '../types'

function householdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('h')
}

function setUrlHousehold(id: string | null) {
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('h', id)
  else url.searchParams.delete('h')
  window.history.replaceState({}, '', url.toString())
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

export function useHousehold() {
  const [household, setHousehold] = useState<Household | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  const refresh = useCallback(async (id: string) => {
    const next = await fetchHousehold(id)
    if (next) {
      setHousehold(next)
      rememberHouseholdId(next.id)
    }
    return next
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      if (!isCloudConfigured) {
        setReady(true)
        return
      }

      const fromUrl = householdFromUrl()
      const id = fromUrl ?? getLastHouseholdId()
      if (!id) {
        setReady(true)
        return
      }

      try {
        const existing = await fetchHousehold(id)
        if (cancelled) return
        if (existing) {
          setHousehold(existing)
          rememberHouseholdId(existing.id)
          setUrlHousehold(existing.id)
          setIsOwner(isHouseholdOwner(existing.id))
        } else if (fromUrl) {
          setError('That household code was not found. Ask for a fresh share link.')
          clearLastHouseholdId()
          setUrlHousehold(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err, 'Could not load household.'))
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!household || !isCloudConfigured) return

    const unsubscribe = subscribeHousehold(household.id, () => {
      void refresh(household.id)
    })

    return unsubscribe
  }, [household?.id, refresh])

  const startHousehold = useCallback(async (name: string) => {
    setError(null)
    setBusy(true)
    try {
      const next = createHousehold(name)
      await createHouseholdRemote(next)
      markHouseholdOwner(next.id)
      rememberHouseholdId(next.id)
      setUrlHousehold(next.id)
      setHousehold(next)
      setIsOwner(true)
      return next
    } catch (err) {
      setError(errorMessage(err, 'Could not create household.'))
      throw err
    } finally {
      setBusy(false)
    }
  }, [])

  const joinHousehold = useCallback(async (id: string) => {
    setError(null)
    setBusy(true)
    try {
      const cleaned = id.trim().toLowerCase()
      const existing = await fetchHousehold(cleaned)
      if (!existing) {
        setError('No household found for that code. Check the link or code and try again.')
        return null
      }
      rememberHouseholdId(existing.id)
      setUrlHousehold(existing.id)
      setHousehold(existing)
      setIsOwner(isHouseholdOwner(existing.id))
      return existing
    } catch (err) {
      setError(errorMessage(err, 'Could not join household.'))
      throw err
    } finally {
      setBusy(false)
    }
  }, [])

  const addCheckIn = useCallback(
    async (checkIn: CheckIn) => {
      if (!household) return
      setError(null)
      setHousehold({
        ...household,
        checkIns: [checkIn, ...household.checkIns],
      })
      try {
        await insertCheckIn(household.id, checkIn)
      } catch (err) {
        setError(errorMessage(err, 'Could not save check-in.'))
        await refresh(household.id)
      }
    },
    [household, refresh],
  )

  const addTrip = useCallback(
    async (trip: Trip) => {
      if (!household || !isHouseholdOwner(household.id)) {
        setError('Only the household creator can add a trip.')
        return
      }
      if (household.trips.length > 0) {
        setError('Remove the current trip before adding a new one.')
        return
      }
      setError(null)
      setHousehold({
        ...household,
        trips: [trip],
      })
      try {
        await insertTrip(household.id, trip)
      } catch (err) {
        setError(errorMessage(err, 'Could not save schedule.'))
        await refresh(household.id)
      }
    },
    [household, refresh],
  )

  const deleteTrip = useCallback(
    async (tripId: string) => {
      if (!household || !isHouseholdOwner(household.id)) {
        setError('Only the household creator can remove a trip.')
        return
      }
      setError(null)
      setHousehold({
        ...household,
        trips: household.trips.filter((t) => t.id !== tripId),
      })
      try {
        await deleteTripRemote(tripId)
      } catch (err) {
        setError(errorMessage(err, 'Could not remove schedule.'))
        await refresh(household.id)
      }
    },
    [household, refresh],
  )

  const leaveHousehold = useCallback(() => {
    clearLastHouseholdId()
    setUrlHousehold(null)
    setHousehold(null)
    setIsOwner(false)
    setError(null)
  }, [])

  const claimScheduleControl = useCallback(() => {
    if (!household) return
    markHouseholdOwner(household.id)
    setIsOwner(true)
    setError(null)
  }, [household])

  return {
    household,
    ready,
    busy,
    error,
    isOwner,
    cloudReady: isCloudConfigured,
    startHousehold,
    joinHousehold,
    addCheckIn,
    addTrip,
    deleteTrip,
    leaveHousehold,
    claimScheduleControl,
  }
}
