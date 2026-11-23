import { useState } from 'react'
import type { FormEvent } from 'react'
import { newSlotId, newTripId } from '../storage'
import type { ScheduleSlot, Trip } from '../types'

interface ScheduleViewProps {
  trips: Trip[]
  tasks: string[]
  onAdd: (trip: Trip) => void
  onDelete: (tripId: string) => void
}

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  }
  const a = new Date(start + 'T12:00:00')
  const b = new Date(end + 'T12:00:00')
  return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, opts)}`
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function defaultSlots(taskOptions: string[]): ScheduleSlot[] {
  const starter = taskOptions.slice(0, 1)
  return [
    { id: newSlotId(), time: '08:00', tasks: [...starter] },
    { id: newSlotId(), time: '18:00', tasks: [...starter] },
  ]
}

export function ScheduleView({ trips, tasks, onAdd, onDelete }: ScheduleViewProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [slots, setSlots] = useState<ScheduleSlot[]>(() => defaultSlots(tasks))

  function updateSlotTime(id: string, time: string) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, time } : s)))
  }

  function toggleSlotTask(id: string, task: string) {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const has = s.tasks.includes(task)
        return {
          ...s,
          tasks: has ? s.tasks.filter((t) => t !== task) : [...s.tasks, task],
        }
      }),
    )
  }

  function addSlot() {
    setSlots((prev) => [
      ...prev,
      { id: newSlotId(), time: '12:00', tasks: tasks.slice(0, 1) },
    ])
  }

  function removeSlot(id: string) {
    setSlots((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)))
  }

  function resetForm() {
    setTitle('')
    setStartDate('')
    setEndDate('')
    setNotes('')
    setSlots(defaultSlots(tasks))
    setOpen(false)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || !startDate || !endDate) return

    const cleaned = slots
      .map((slot) => ({
        ...slot,
        tasks: slot.tasks.filter(Boolean),
      }))
      .filter((slot) => slot.tasks.length > 0)
      .sort((a, b) => a.time.localeCompare(b.time))

    if (cleaned.length === 0) return

    onAdd({
      id: newTripId(),
      title: title.trim(),
      startDate,
      endDate,
      notes: notes.trim(),
      slots: cleaned,
    })
    resetForm()
  }

  return (
    <section className="panel schedule">
      <header className="panel__header panel__header--row">
        <div>
          <h2>Care schedule</h2>
          <p>Set when you&apos;re away and what needs doing each day.</p>
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Cancel' : 'New trip'}
        </button>
      </header>

      {open && (
        <form className="stack-form schedule__form" onSubmit={handleSubmit}>
          <label>
            <span>Trip name</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekend in Asheville"
              required
            />
          </label>

          <div className="field-row">
            <label>
              <span>Away from</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Through</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
          </div>

          <fieldset className="slots">
            <legend>Daily care times</legend>
            <p className="slots__hint">Pick a time, then check everything needed at that time.</p>
            {slots.map((slot) => (
              <div key={slot.id} className="slot-block">
                <div className="slot-block__time">
                  <label className="sr-only" htmlFor={`time-${slot.id}`}>
                    Time
                  </label>
                  <input
                    id={`time-${slot.id}`}
                    type="time"
                    value={slot.time}
                    onChange={(e) => updateSlotTime(slot.id, e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn--icon"
                    aria-label="Remove time"
                    onClick={() => removeSlot(slot.id)}
                  >
                    ×
                  </button>
                </div>
                <div className="task-checks" role="group" aria-label={`Tasks at ${slot.time}`}>
                  {tasks.map((item) => {
                    const checked = slot.tasks.includes(item)
                    return (
                      <label key={item} className={checked ? 'is-checked' : undefined}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSlotTask(slot.id, item)}
                        />
                        <span>{item}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn--ghost" onClick={addSlot}>
              Add another time
            </button>
          </fieldset>

          <label>
            <span>Notes for helpers (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Treat jar on fridge, leash by door…"
              rows={2}
            />
          </label>

          <button type="submit" className="btn btn--primary">
            Save schedule
          </button>
        </form>
      )}

      {trips.length === 0 && !open ? (
        <p className="empty">No trips yet. Add one when you&apos;ll be out of town.</p>
      ) : (
        <ul className="trip-list">
          {trips.map((trip) => (
            <li key={trip.id} className="trip">
              <div className="trip__top">
                <div>
                  <h3>{trip.title}</h3>
                  <p className="trip__dates">{formatRange(trip.startDate, trip.endDate)}</p>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => onDelete(trip.id)}
                >
                  Remove
                </button>
              </div>
              <ul className="trip__slots">
                {trip.slots.map((slot) => (
                  <li key={slot.id}>
                    <strong>{formatTime(slot.time)}</strong>
                    <span>{slot.tasks.join(' · ')}</span>
                  </li>
                ))}
              </ul>
              {trip.notes ? <p className="trip__notes">{trip.notes}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
