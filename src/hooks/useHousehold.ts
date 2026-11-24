import { useCallback, useEffect, useState } from 'react'
import {
  createHouseholdRemote,
  deleteAssignmentRemote,
  deleteAssignmentsForSlots,
  deleteTripRemote,
  fetchHousehold,
  insertAssignments,
  insertCheckIn,
  insertTrip,
  subscribeHousehold,
  updateTripRemote,
  uploadCarePhoto,
} from '../api/households'
import { prepareCarePhoto } from '../lib/photo'
import { isCloudConfigured } from '../lib/supabase'
import {
  clearLastHouseholdId,
  createHousehold,
  getLastHouseholdId,
  isHouseholdOwner,
  markHouseholdOwner,
  newAssignmentId,
  newCheckInId,
  rememberHouseholdId,
} from '../storage'
import { parseDateKey, toDateKey } from '../lib/careStatus'
import type { Assignment, CheckIn, Household, Trip } from '../types'

function checkInTimestamp(dateKey: string, time: string): string {
  const today = toDateKey(new Date())
  if (dateKey === today) return new Date().toISOString()
  const [hours, minutes] = time.split(':').map((part) => Number(part))
  const stamp = parseDateKey(dateKey)
  stamp.setHours(Number.isFinite(hours) ? hours : 12, Number.isFinite(minutes) ? minutes : 0, 0, 0)
  return stamp.toISOString()
}

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
    async (checkIn: CheckIn, photo?: File | null) => {
      if (!household) return
      setError(null)
      try {
        let photoUrl = checkIn.photoUrl
        if (photo) {
          const prepared = await prepareCarePhoto(photo)
          photoUrl = await uploadCarePhoto(household.id, checkIn.id, prepared)
        }
        const saved: CheckIn = { ...checkIn, photoUrl }
        setHousehold({
          ...household,
          checkIns: [saved, ...household.checkIns],
        })
        await insertCheckIn(household.id, saved)
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

  const updateTrip = useCallback(
    async (trip: Trip) => {
      if (!household || !isHouseholdOwner(household.id)) {
        setError('Only the household creator can edit a trip.')
        return
      }
      setError(null)
      setHousehold({
        ...household,
        trips: household.trips.map((t) => (t.id === trip.id ? trip : t)),
      })
      try {
        await updateTripRemote(trip)
      } catch (err) {
        setError(errorMessage(err, 'Could not update schedule.'))
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

  const saveAssignments = useCallback(
    async (next: Assignment[]) => {
      if (!household || !isHouseholdOwner(household.id)) {
        setError('Only the household creator can assign helpers.')
        return
      }
      if (next.length === 0) return
      setError(null)
      const tripId = next[0].tripId
      const date = next[0].date
      const times = next.map((item) => item.time)
      const kept = household.assignments.filter(
        (item) =>
          !(item.tripId === tripId && item.date === date && times.includes(item.time)),
      )
      setHousehold({
        ...household,
        assignments: [...kept, ...next].sort((a, b) =>
          a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
        ),
      })
      try {
        await deleteAssignmentsForSlots(household.id, tripId, date, times)
        await insertAssignments(household.id, next)
      } catch (err) {
        setError(errorMessage(err, 'Could not save assignments.'))
        await refresh(household.id)
      }
    },
    [household, refresh],
  )

  const removeAssignment = useCallback(
    async (assignmentId: string) => {
      if (!household || !isHouseholdOwner(household.id)) {
        setError('Only the household creator can change assignments.')
        return
      }
      setError(null)
      setHousehold({
        ...household,
        assignments: household.assignments.filter((item) => item.id !== assignmentId),
      })
      try {
        await deleteAssignmentRemote(assignmentId)
      } catch (err) {
        setError(errorMessage(err, 'Could not remove assignment.'))
        await refresh(household.id)
      }
    },
    [household, refresh],
  )

  const claimOpenTask = useCallback(
    async (input: {
      tripId: string
      dateKey: string
      time: string
      tasks: string[]
      personName: string
    }) => {
      if (!household) return
      const personName = input.personName.trim()
      if (!personName) return
      const tasks = [...new Set(input.tasks.map((task) => task.trim()).filter(Boolean))]
      if (tasks.length === 0) return

      setError(null)

      const at = checkInTimestamp(input.dateKey, input.time)
      const checkIns: CheckIn[] = tasks.map((task) => ({
        id: newCheckInId(),
        personName,
        task,
        note: '',
        at,
      }))

      const alreadyAssigned = household.assignments.some(
        (item) =>
          item.tripId === input.tripId &&
          item.date === input.dateKey &&
          item.time === input.time &&
          item.personName.trim().toLowerCase() === personName.toLowerCase(),
      )

      const assignment: Assignment | null = alreadyAssigned
        ? null
        : {
            id: newAssignmentId(),
            tripId: input.tripId,
            date: input.dateKey,
            time: input.time,
            personName,
          }

      setHousehold({
        ...household,
        checkIns: [...checkIns, ...household.checkIns],
        assignments: assignment
          ? [...household.assignments, assignment].sort((a, b) =>
              a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
            )
          : household.assignments,
      })

      try {
        for (const checkIn of checkIns) {
          await insertCheckIn(household.id, checkIn)
        }
        if (assignment) await insertAssignments(household.id, [assignment])
      } catch (err) {
        setError(errorMessage(err, 'Could not assign this care routine.'))
        await refresh(household.id)
        throw err
      }
    },
    [household, refresh],
  )

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
    updateTrip,
    deleteTrip,
    leaveHousehold,
    claimScheduleControl,
    saveAssignments,
    removeAssignment,
    claimOpenTask,
  }
}
