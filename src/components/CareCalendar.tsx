import { useMemo, useState } from 'react'
import {
  activeTripOn,
  daySlotStatuses,
  eachDay,
  formatSlotTime,
  monthMatrix,
  parseDateKey,
  toDateKey,
} from '../lib/careStatus'
import { personColor, personInitials } from '../lib/people'
import type { Assignment, CheckIn, Trip } from '../types'

interface CareCalendarProps {
  trips: Trip[]
  checkIns: CheckIn[]
  assignments: Assignment[]
  onCheckIn: () => void
}

type CalendarMode = 'status' | 'people'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const name of names) {
    const key = name.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(name.trim())
  }
  return result
}

export function CareCalendar({ trips, checkIns, assignments, onCheckIn }: CareCalendarProps) {
  const todayKey = toDateKey(new Date())
  const [mode, setMode] = useState<CalendarMode>('people')
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedKey, setSelectedKey] = useState(todayKey)

  const weeks = useMemo(
    () => monthMatrix(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  )

  const tripDays = useMemo(() => {
    const set = new Set<string>()
    for (const trip of trips) {
      for (const day of eachDay(trip.startDate, trip.endDate)) set.add(day)
    }
    return set
  }, [trips])

  const assignmentsByDay = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    for (const item of assignments) {
      const list = map.get(item.date) ?? []
      list.push(item)
      map.set(item.date, list)
    }
    return map
  }, [assignments])

  const selectedTrip = activeTripOn(trips, selectedKey)
  const slotStatuses = selectedTrip
    ? daySlotStatuses(selectedTrip.slots, checkIns, selectedKey)
    : []
  const dayAssignments = assignmentsByDay.get(selectedKey) ?? []

  const coverageDays = useMemo(() => {
    if (!selectedTrip) return [] as string[]
    return eachDay(selectedTrip.startDate, selectedTrip.endDate)
  }, [selectedTrip])

  const helperLegend = useMemo(() => {
    const names = uniqueNames(
      (selectedTrip
        ? assignments.filter((item) => item.tripId === selectedTrip.id)
        : assignments
      ).map((item) => item.personName),
    )
    return names
  }, [assignments, selectedTrip])

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric' },
  )

  const selectedLabel = parseDateKey(selectedKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  function daySummary(dateKey: string): 'none' | 'open' | 'done' | 'partial' {
    const trip = activeTripOn(trips, dateKey)
    if (!trip) return 'none'
    const statuses = daySlotStatuses(trip.slots, checkIns, dateKey)
    const open = statuses.reduce((n, s) => n + s.openCount, 0)
    const done = statuses.reduce((n, s) => n + s.doneCount, 0)
    if (done === 0 && open > 0) return 'open'
    if (open === 0 && done > 0) return 'done'
    if (open > 0 && done > 0) return 'partial'
    return 'open'
  }

  function peopleForDay(dateKey: string): string[] {
    return uniqueNames((assignmentsByDay.get(dateKey) ?? []).map((item) => item.personName))
  }

  return (
    <section className="panel calendar">
      <header className="panel__header">
        <h2>Care calendar</h2>
        <p>
          {mode === 'people'
            ? 'See who is covering each day and care time.'
            : 'See open care times and what is already logged.'}
        </p>
      </header>

      <div className="mode-toggle cal-mode" role="tablist" aria-label="Calendar view">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'people'}
          className={mode === 'people' ? 'is-active' : undefined}
          onClick={() => setMode('people')}
        >
          Who&apos;s on
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'status'}
          className={mode === 'status' ? 'is-active' : undefined}
          onClick={() => setMode('status')}
        >
          Care status
        </button>
      </div>

      <div className="cal-nav">
        <button type="button" className="btn btn--ghost" onClick={() => shiftMonth(-1)}>
          Previous
        </button>
        <p className="cal-nav__label">{monthLabel}</p>
        <button type="button" className="btn btn--ghost" onClick={() => shiftMonth(1)}>
          Next
        </button>
      </div>

      <div className="cal-grid" role="grid" aria-label={monthLabel}>
        {WEEKDAYS.map((day) => (
          <div key={day} className="cal-grid__head">
            {day}
          </div>
        ))}
        {weeks.flatMap((week, wi) =>
          week.map((dateKey, di) => {
            if (!dateKey) {
              return <div key={`e-${wi}-${di}`} className="cal-cell cal-cell--empty" />
            }
            const summary = daySummary(dateKey)
            const people = peopleForDay(dateKey)
            const isSelected = dateKey === selectedKey
            const isToday = dateKey === todayKey
            const inTrip = tripDays.has(dateKey)
            return (
              <button
                key={dateKey}
                type="button"
                className={[
                  'cal-cell',
                  mode === 'people' ? 'cal-cell--people' : undefined,
                  inTrip ? 'cal-cell--trip' : undefined,
                  isSelected ? 'is-selected' : undefined,
                  isToday ? 'is-today' : undefined,
                  mode === 'status' && summary !== 'none' ? `is-${summary}` : undefined,
                  mode === 'people' && people.length > 0 ? 'has-people' : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedKey(dateKey)}
                aria-pressed={isSelected}
                aria-label={parseDateKey(dateKey).toLocaleDateString()}
              >
                <span className="cal-cell__day">{Number(dateKey.slice(-2))}</span>
                {mode === 'status' && summary !== 'none' && (
                  <span className="cal-cell__dot" aria-hidden="true" />
                )}
                {mode === 'people' && people.length > 0 && (
                  <span className="cal-cell__avatars" aria-hidden="true">
                    {people.slice(0, 3).map((name) => {
                      const color = personColor(name)
                      return (
                        <i
                          key={name}
                          className="cal-avatar"
                          style={{ background: color.bg, color: color.fg }}
                          title={name}
                        >
                          {personInitials(name)}
                        </i>
                      )
                    })}
                  </span>
                )}
              </button>
            )
          }),
        )}
      </div>

      {mode === 'status' ? (
        <div className="cal-legend" aria-hidden="true">
          <span>
            <i className="dot dot--open" /> Open
          </span>
          <span>
            <i className="dot dot--partial" /> Partly done
          </span>
          <span>
            <i className="dot dot--done" /> Complete
          </span>
        </div>
      ) : (
        <div className="cal-legend cal-legend--people">
          {helperLegend.length === 0 ? (
            <span>No helpers assigned yet — add them under Schedule.</span>
          ) : (
            helperLegend.map((name) => {
              const color = personColor(name)
              return (
                <span key={name} className="person-chip">
                  <i className="cal-avatar" style={{ background: color.bg, color: color.fg }}>
                    {personInitials(name)}
                  </i>
                  {name}
                </span>
              )
            })
          )}
        </div>
      )}

      {mode === 'people' && selectedTrip && (
        <div className="coverage-board">
          <h3>Coverage board</h3>
          <p className="coverage-board__sub">{selectedTrip.title}</p>
          <ul className="coverage-days">
            {coverageDays.map((dateKey) => {
              const dayPeople = peopleForDay(dateKey)
              const trip = selectedTrip
              return (
                <li key={dateKey}>
                  <button
                    type="button"
                    className={
                      dateKey === selectedKey
                        ? 'coverage-day is-selected'
                        : 'coverage-day'
                    }
                    onClick={() => setSelectedKey(dateKey)}
                  >
                    <strong>
                      {parseDateKey(dateKey).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </strong>
                    <div className="coverage-day__slots">
                      {trip.slots.map((slot) => {
                        const names = uniqueNames(
                          (assignmentsByDay.get(dateKey) ?? [])
                            .filter((item) => item.time === slot.time)
                            .map((item) => item.personName),
                        )
                        return (
                          <div key={slot.id} className="coverage-slot">
                            <span className="coverage-slot__time">
                              {formatSlotTime(slot.time)}
                            </span>
                            {names.length === 0 ? (
                              <em className="coverage-slot__open">Unassigned</em>
                            ) : (
                              <span className="coverage-slot__people">
                                {names.map((name) => {
                                  const color = personColor(name)
                                  return (
                                    <span
                                      key={name}
                                      className="person-chip person-chip--sm"
                                      style={{ background: color.bg, color: color.fg }}
                                    >
                                      {name}
                                    </span>
                                  )
                                })}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {dayPeople.length === 0 && (
                      <em className="coverage-day__empty">No one assigned</em>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="cal-day">
        <div className="cal-day__head">
          <h3>{selectedLabel}</h3>
          {selectedTrip ? (
            <p>{selectedTrip.title}</p>
          ) : (
            <p>No trip scheduled this day.</p>
          )}
        </div>

        {!selectedTrip ? (
          <p className="empty">
            Add a trip under Schedule to show care times on the calendar.
          </p>
        ) : slotStatuses.length === 0 ? (
          <p className="empty">This trip has no daily care times yet.</p>
        ) : (
          <ul className="cal-slots">
            {slotStatuses.map(({ slot, tasks, openCount }) => {
              const assignees = uniqueNames(
                dayAssignments
                  .filter((item) => item.time === slot.time)
                  .map((item) => item.personName),
              )
              return (
                <li
                  key={slot.id}
                  className={openCount > 0 ? 'cal-slot is-open' : 'cal-slot is-done'}
                >
                  <div className="cal-slot__time">
                    <strong>{formatSlotTime(slot.time)}</strong>
                    <span>
                      {mode === 'people'
                        ? assignees.length > 0
                          ? `${assignees.length} assigned`
                          : 'Unassigned'
                        : openCount > 0
                          ? `${openCount} open`
                          : 'All done'}
                    </span>
                  </div>
                  {assignees.length > 0 && (
                    <div className="cal-slot__people">
                      {assignees.map((name) => {
                        const color = personColor(name)
                        return (
                          <span
                            key={name}
                            className="person-chip"
                            style={{ background: color.bg, color: color.fg }}
                          >
                            <i className="cal-avatar cal-avatar--inline">
                              {personInitials(name)}
                            </i>
                            {name}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {mode === 'status' && (
                    <ul className="cal-slot__tasks">
                      {tasks.map((item) => (
                        <li
                          key={`${slot.id}-${item.task}`}
                          className={item.done ? 'is-done' : 'is-open'}
                        >
                          <span>{item.task}</span>
                          {item.done ? (
                            <em>
                              {item.by}
                              {item.at
                                ? ` · ${new Date(item.at).toLocaleTimeString(undefined, {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}`
                                : ''}
                            </em>
                          ) : (
                            <em>Still open</em>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {mode === 'people' && (
                    <p className="cal-slot__tasks-line">{slot.tasks.join(' · ')}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {selectedTrip && (
          <button type="button" className="btn btn--primary" onClick={onCheckIn}>
            Log a check-in
          </button>
        )}

        {selectedTrip?.notes ? (
          <p className="cal-day__notes">{selectedTrip.notes}</p>
        ) : null}
      </div>
    </section>
  )
}
