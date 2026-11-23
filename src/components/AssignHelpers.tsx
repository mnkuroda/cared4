import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { formatSlotTime } from '../lib/careStatus'
import { getKnownNames, newAssignmentId, rememberKnownName } from '../storage'
import type { Assignment, Trip } from '../types'

interface AssignHelpersProps {
  trip: Trip
  assignments: Assignment[]
  knownNames: string[]
  onSave: (assignments: Assignment[]) => void | Promise<void>
  onRemove: (assignmentId: string) => void | Promise<void>
}

function mergeNames(...lists: string[][]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const list of lists) {
    for (const name of list) {
      const trimmed = name.trim()
      if (!trimmed) continue
      const key = trimmed.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      result.push(trimmed)
    }
  }
  return result
}

export function AssignHelpers({
  trip,
  assignments,
  knownNames,
  onSave,
  onRemove,
}: AssignHelpersProps) {
  const [personName, setPersonName] = useState('')
  const [date, setDate] = useState(trip.startDate)
  const [selectedTimes, setSelectedTimes] = useState<string[]>(
    trip.slots[0] ? [trip.slots[0].time] : [],
  )
  const [saving, setSaving] = useState(false)

  const nameOptions = useMemo(
    () => mergeNames(getKnownNames(), knownNames),
    [knownNames],
  )

  const tripAssignments = useMemo(
    () =>
      assignments
        .filter((item) => item.tripId === trip.id)
        .sort((a, b) =>
          a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
        ),
    [assignments, trip.id],
  )

  function toggleTime(time: string) {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((item) => item !== time) : [...prev, time],
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = personName.trim()
    if (!trimmed || !date || selectedTimes.length === 0 || saving) return
    if (date < trip.startDate || date > trip.endDate) return

    rememberKnownName(trimmed)
    setSaving(true)
    try {
      await onSave(
        selectedTimes.map((time) => ({
          id: newAssignmentId(),
          tripId: trip.id,
          date,
          time,
          personName: trimmed,
        })),
      )
      setSelectedTimes(trip.slots[0] ? [trip.slots[0].time] : [])
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="assign-block">
      <header className="panel__header">
        <h3>Assign helpers</h3>
        <p>If someone told you which days they can cover, assign those days and times here.</p>
      </header>

      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          <span>Helper name</span>
          <input
            list="assign-helper-names"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="Who is covering?"
            required
            disabled={saving}
          />
          <datalist id="assign-helper-names">
            {nameOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>

        {nameOptions.length > 0 && (
          <div className="name-picks" role="group" aria-label="Known helpers">
            {nameOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={option === personName ? 'name-pick is-active' : 'name-pick'}
                onClick={() => setPersonName(option)}
                disabled={saving}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        <label>
          <span>Date</span>
          <input
            type="date"
            value={date}
            min={trip.startDate}
            max={trip.endDate}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={saving}
          />
        </label>

        <fieldset className="slots">
          <legend>Care times they will cover</legend>
          <div className="task-checks">
            {trip.slots.map((slot) => {
              const checked = selectedTimes.includes(slot.time)
              return (
                <label key={slot.id} className={checked ? 'is-checked' : undefined}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTime(slot.time)}
                    disabled={saving}
                  />
                  <span>
                    {formatSlotTime(slot.time)} · {slot.tasks.join(', ')}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save assignment'}
        </button>
      </form>

      {tripAssignments.length === 0 ? (
        <p className="empty">No helper assignments yet.</p>
      ) : (
        <ul className="assign-list">
          {tripAssignments.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.personName}</strong>
                <span>
                  {new Date(item.date + 'T12:00:00').toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  · {formatSlotTime(item.time)}
                </span>
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => onRemove(item.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
