import { supabase } from '../lib/supabase'
import {
  DEFAULT_TASKS,
  canonicalTask,
  normalizeSlot,
  type Assignment,
  type CheckIn,
  type Household,
  type Trip,
} from '../types'

const REMOVED_TASKS = new Set(['Gave medication', 'Scooped litter'])

type HouseholdRow = {
  id: string
  name: string
  tasks: string[]
  created_at: string
}

type CheckInRow = {
  id: string
  household_id: string
  person_name: string
  task: string
  note: string
  at: string
  photo_url?: string | null
}

type TripRow = {
  id: string
  household_id: string
  title: string
  start_date: string
  end_date: string
  notes: string
  slots: unknown
  created_at: string
}

type AssignmentRow = {
  id: string
  household_id: string
  trip_id: string
  care_date: string
  care_time: string
  person_name: string
}

function requireClient() {
  if (!supabase) {
    throw new Error('Cloud sync is not configured.')
  }
  return supabase
}

function migrateTasks(tasks: string[]): string[] {
  const renamed = (tasks ?? [...DEFAULT_TASKS])
    .map((task) => canonicalTask(task))
    .filter((task) => !REMOVED_TASKS.has(task))

  const next: string[] = []
  for (const task of renamed) {
    if (!next.includes(task)) next.push(task)
  }
  for (const task of DEFAULT_TASKS) {
    if (!next.includes(task)) next.push(task)
  }
  return next
}

function mapCheckIn(row: CheckInRow): CheckIn {
  return {
    id: row.id,
    personName: row.person_name,
    task: canonicalTask(row.task),
    note: row.note ?? '',
    at: row.at,
    photoUrl: row.photo_url ?? undefined,
  }
}

function mapTrip(row: TripRow): Trip {
  const slots = Array.isArray(row.slots) ? row.slots : []
  return {
    id: row.id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes ?? '',
    slots: slots.map((slot) => normalizeSlot(slot as { id: string; time: string; task?: string; tasks?: string[] })),
  }
}

function mapAssignment(row: AssignmentRow): Assignment {
  return {
    id: row.id,
    tripId: row.trip_id,
    date: row.care_date,
    time: row.care_time,
    personName: row.person_name,
  }
}

export async function fetchHousehold(id: string): Promise<Household | null> {
  const client = requireClient()
  const cleaned = id.trim().toLowerCase()

  const { data: row, error } = await client
    .from('households')
    .select('*')
    .eq('id', cleaned)
    .maybeSingle()

  if (error) throw error
  if (!row) return null

  const household = row as HouseholdRow

  const [
    { data: checkInRows, error: checkInError },
    { data: tripRows, error: tripError },
    { data: assignmentRows, error: assignmentError },
  ] = await Promise.all([
    client
      .from('check_ins')
      .select('*')
      .eq('household_id', cleaned)
      .order('at', { ascending: false }),
    client
      .from('trips')
      .select('*')
      .eq('household_id', cleaned)
      .order('created_at', { ascending: false }),
    client
      .from('assignments')
      .select('*')
      .eq('household_id', cleaned)
      .order('care_date', { ascending: true }),
  ])

  if (checkInError) throw checkInError
  if (tripError) throw tripError
  // Allow loading before assignments.sql has been run.
  if (assignmentError && assignmentError.code !== '42P01' && assignmentError.code !== 'PGRST205') {
    throw assignmentError
  }

  return {
    id: household.id,
    name: household.name,
    tasks: migrateTasks(household.tasks ?? [...DEFAULT_TASKS]),
    createdAt: household.created_at,
    checkIns: ((checkInRows ?? []) as CheckInRow[]).map(mapCheckIn),
    trips: ((tripRows ?? []) as TripRow[]).map(mapTrip),
    assignments: assignmentError
      ? []
      : ((assignmentRows ?? []) as AssignmentRow[]).map(mapAssignment),
  }
}

export async function createHouseholdRemote(household: Household): Promise<Household> {
  const client = requireClient()

  const { error } = await client.from('households').insert({
    id: household.id,
    name: household.name,
    tasks: household.tasks,
    created_at: household.createdAt,
  })

  if (error) throw error
  return household
}

export async function uploadCarePhoto(
  householdId: string,
  checkInId: string,
  blob: Blob,
): Promise<string> {
  const client = requireClient()
  const path = `${householdId}/${checkInId}.jpg`
  const { error } = await client.storage.from('care-photos').upload(path, blob, {
    cacheControl: '3600',
    upsert: true,
    contentType: 'image/jpeg',
  })
  if (error) throw error
  const { data } = client.storage.from('care-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function insertCheckIn(householdId: string, checkIn: CheckIn): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('check_ins').insert({
    id: checkIn.id,
    household_id: householdId,
    person_name: checkIn.personName,
    task: checkIn.task,
    note: checkIn.note,
    at: checkIn.at,
    photo_url: checkIn.photoUrl ?? null,
  })
  if (error) throw error
}

export async function insertTrip(householdId: string, trip: Trip): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('trips').insert({
    id: trip.id,
    household_id: householdId,
    title: trip.title,
    start_date: trip.startDate,
    end_date: trip.endDate,
    notes: trip.notes,
    slots: trip.slots,
  })
  if (error) throw error
}

export async function updateTripRemote(trip: Trip): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('trips')
    .update({
      title: trip.title,
      start_date: trip.startDate,
      end_date: trip.endDate,
      notes: trip.notes,
      slots: trip.slots,
    })
    .eq('id', trip.id)
  if (error) throw error
}

export async function deleteTripRemote(tripId: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('trips').delete().eq('id', tripId)
  if (error) throw error
}

export async function insertAssignments(
  householdId: string,
  assignments: Assignment[],
): Promise<void> {
  const client = requireClient()
  if (assignments.length === 0) return
  const { error } = await client.from('assignments').insert(
    assignments.map((item) => ({
      id: item.id,
      household_id: householdId,
      trip_id: item.tripId,
      care_date: item.date,
      care_time: item.time,
      person_name: item.personName,
    })),
  )
  if (error) throw error
}

export async function deleteAssignmentRemote(assignmentId: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('assignments').delete().eq('id', assignmentId)
  if (error) throw error
}

export async function deleteAssignmentsForSlots(
  householdId: string,
  tripId: string,
  date: string,
  times: string[],
): Promise<void> {
  const client = requireClient()
  if (times.length === 0) return
  const { error } = await client
    .from('assignments')
    .delete()
    .eq('household_id', householdId)
    .eq('trip_id', tripId)
    .eq('care_date', date)
    .in('care_time', times)
  if (error) throw error
}

export function subscribeHousehold(
  householdId: string,
  onChange: () => void,
): () => void {
  const client = requireClient()

  const channel = client
    .channel(`household:${householdId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'check_ins', filter: `household_id=eq.${householdId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trips', filter: `household_id=eq.${householdId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'assignments', filter: `household_id=eq.${householdId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'households', filter: `id=eq.${householdId}` },
      onChange,
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
