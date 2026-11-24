import { useMemo, useState } from 'react'
import {
  activeTripOn,
  daySlotStatuses,
  eachDay,
  formatSlotTime,
  monthMatrix,
  parseDateKey,
  routineLabel,
  toDateKey,
  type DaySlotStatus,
} from '../lib/careStatus'
import { personColor, personInitials } from '../lib/people'
import type { Assignment, CheckIn, Trip } from '../types'
import { ClaimOpenTask, type ClaimTarget } from './ClaimOpenTask'

interface CareCalendarProps {
  trips: Trip[]
  checkIns: CheckIn[]
  assignments: Assignment[]
  knownNames?: string[]
  onCheckIn: () => void
  onClaimOpenTask: (input: {
    tripId: string
    dateKey: string
    time: string
    tasks: string[]
    personName: string
  }) => void | Promise<void>
}

type CalendarZoom = 'month' | 'week' | 'day'

const WEEKDAYS = [
  { short: 'S', label: 'Sunday' },
  { short: 'M', label: 'Monday' },
  { short: 'T', label: 'Tuesday' },
  { short: 'W', label: 'Wednesday' },
  { short: 'T', label: 'Thursday' },
  { short: 'F', label: 'Friday' },
  { short: 'S', label: 'Saturday' },
] as const

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

function startOfWeek(dateKey: string): Date {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() - date.getDay())
  return date
}

function weekKeys(anchorKey: string): string[] {
  const start = startOfWeek(anchorKey)
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return toDateKey(day)
  })
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

function slotStatusLabel(openCount: number, assigneeCount: number): string {
  const care =
    openCount > 0 ? (openCount === 1 ? '1 open' : `${openCount} open`) : 'All done'
  const people =
    assigneeCount > 0
      ? assigneeCount === 1
        ? '1 assigned'
        : `${assigneeCount} assigned`
      : 'Unassigned'
  return `${people} · ${care}`
}

function PersonChip({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const color = personColor(name)
  return (
    <span
      className={size === 'sm' ? 'person-chip person-chip--sm' : 'person-chip'}
      style={{ background: color.bg, color: color.fg }}
      title={name}
    >
      <i className={size === 'sm' ? 'cal-avatar' : 'cal-avatar cal-avatar--inline'}>
        {personInitials(name)}
      </i>
      <span>{name}</span>
    </span>
  )
}

function DaySlotList({
  slotStatuses,
  dayAssignments,
  onClaimRoutine,
}: {
  slotStatuses: DaySlotStatus[]
  dayAssignments: Assignment[]
  onClaimRoutine: (time: string, openTasks: string[]) => void
}) {
  if (slotStatuses.length === 0) {
    return <p className="empty">This trip has no daily care times yet.</p>
  }

  return (
    <ul className="cal-slots">
      {slotStatuses.map(({ slot, tasks, openCount }) => {
        const assignees = uniqueNames(
          dayAssignments
            .filter((item) => item.time === slot.time)
            .map((item) => item.personName),
        )
        const openTasks = tasks.filter((item) => !item.done).map((item) => item.task)
        return (
          <li
            key={slot.id}
            className={openCount > 0 ? 'cal-slot is-open' : 'cal-slot is-done'}
          >
            <div className="cal-slot__time">
              <div className="cal-slot__title">
                <strong>{routineLabel(slot.time)}</strong>
                <span className="cal-slot__clock">{formatSlotTime(slot.time)}</span>
              </div>
              <span>{slotStatusLabel(openCount, assignees.length)}</span>
            </div>
            {assignees.length > 0 ? (
              <div className="cal-slot__people">
                {assignees.map((name) => (
                  <PersonChip key={name} name={name} />
                ))}
              </div>
            ) : (
              <p className="cal-slot__unassigned">No one assigned yet</p>
            )}
            <ul className="cal-slot__details">
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
                    <em>Open</em>
                  )}
                </li>
              ))}
            </ul>
            {openTasks.length > 0 && (
              <button
                type="button"
                className="btn btn--primary routine-claim"
                onClick={() => onClaimRoutine(slot.time, openTasks)}
              >
                Assign this routine
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function CareCalendar({
  trips,
  checkIns,
  assignments,
  knownNames = [],
  onCheckIn,
  onClaimOpenTask,
}: CareCalendarProps) {
  const todayKey = toDateKey(new Date())
  const [zoom, setZoom] = useState<CalendarZoom>('week')
  const [claimTarget, setClaimTarget] = useState<ClaimTarget | null>(null)
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedKey, setSelectedKey] = useState(todayKey)

  const weeks = useMemo(
    () => monthMatrix(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  )

  const currentWeek = useMemo(() => weekKeys(selectedKey), [selectedKey])

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

  const weekLabel = useMemo(() => {
    const start = parseDateKey(currentWeek[0])
    const end = parseDateKey(currentWeek[6])
    const startText = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const endText = end.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return `${startText} – ${endText}`
  }, [currentWeek])

  const selectedLabel = parseDateKey(selectedKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  const navLabel = zoom === 'month' ? monthLabel : zoom === 'week' ? weekLabel : selectedLabel

  function syncCursor(dateKey: string) {
    const date = parseDateKey(dateKey)
    setCursor({ year: date.getFullYear(), month: date.getMonth() })
  }

  function selectDay(dateKey: string, nextZoom?: CalendarZoom) {
    setSelectedKey(dateKey)
    syncCursor(dateKey)
    if (nextZoom) setZoom(nextZoom)
  }

  function shiftRange(delta: number) {
    if (zoom === 'month') {
      setCursor((prev) => {
        const next = new Date(prev.year, prev.month + delta, 1)
        return { year: next.getFullYear(), month: next.getMonth() }
      })
      return
    }
    const step = zoom === 'week' ? 7 : 1
    const nextKey = shiftDateKey(selectedKey, delta * step)
    selectDay(nextKey)
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

  function openClaim(dateKey: string, time: string, tasks: string[]) {
    const trip = activeTripOn(trips, dateKey)
    if (!trip || tasks.length === 0) return
    setSelectedKey(dateKey)
    setClaimTarget({
      dateKey,
      time,
      tasks,
      tripId: trip.id,
      tripTitle: trip.title,
    })
  }

  function renderDayDetail(dateKey: string) {
    const trip = activeTripOn(trips, dateKey)
    const statuses = trip ? daySlotStatuses(trip.slots, checkIns, dateKey) : []
    const assigns = assignmentsByDay.get(dateKey) ?? []
    const label = parseDateKey(dateKey).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })

    return (
      <div className="cal-day">
        <div className="cal-day__head">
          <h3>{label}</h3>
          {trip ? <p>{trip.title}</p> : <p>No trip scheduled this day.</p>}
        </div>

        {!trip ? (
          <p className="empty">
            Add a trip under Schedule to show care times on the calendar.
          </p>
        ) : (
          <DaySlotList
            slotStatuses={statuses}
            dayAssignments={assigns}
            onClaimRoutine={(time, openTasks) => openClaim(dateKey, time, openTasks)}
          />
        )}

        {trip && (
          <button type="button" className="btn btn--primary" onClick={onCheckIn}>
            Log a check-in
          </button>
        )}

        {trip?.notes ? <p className="cal-day__notes">{trip.notes}</p> : null}
      </div>
    )
  }

  return (
    <section className="panel calendar">
      <header className="panel__header">
        <h2>Care calendar</h2>
        <p>Each care time is one visit. Assign the whole routine, with tasks listed as details.</p>
      </header>

      <div className="mode-toggle cal-zoom" role="tablist" aria-label="Calendar zoom">
        <button
          type="button"
          role="tab"
          aria-selected={zoom === 'month'}
          className={zoom === 'month' ? 'is-active' : undefined}
          onClick={() => setZoom('month')}
        >
          Month
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={zoom === 'week'}
          className={zoom === 'week' ? 'is-active' : undefined}
          onClick={() => setZoom('week')}
        >
          Week
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={zoom === 'day'}
          className={zoom === 'day' ? 'is-active' : undefined}
          onClick={() => setZoom('day')}
        >
          Day
        </button>
      </div>

      <div className="cal-nav">
        <button type="button" className="btn btn--ghost" onClick={() => shiftRange(-1)}>
          Previous
        </button>
        <p className="cal-nav__label">{navLabel}</p>
        <button type="button" className="btn btn--ghost" onClick={() => shiftRange(1)}>
          Next
        </button>
      </div>

      {zoom === 'month' && (
        <div className="cal-grid" role="grid" aria-label={monthLabel}>
          {WEEKDAYS.map((day, index) => (
            <div key={`${day.label}-${index}`} className="cal-grid__head" title={day.label}>
              <span className="cal-grid__head-full">{day.label.slice(0, 3)}</span>
              <span className="cal-grid__head-short" aria-label={day.label}>
                {day.short}
              </span>
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
                    'cal-cell--people',
                    inTrip ? 'cal-cell--trip' : undefined,
                    isSelected ? 'is-selected' : undefined,
                    isToday ? 'is-today' : undefined,
                    summary !== 'none' ? `is-${summary}` : undefined,
                    people.length > 0 ? 'has-people' : undefined,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => selectDay(dateKey)}
                  onDoubleClick={() => selectDay(dateKey, 'day')}
                  aria-pressed={isSelected}
                  aria-label={parseDateKey(dateKey).toLocaleDateString()}
                >
                  <span className="cal-cell__day">{Number(dateKey.slice(-2))}</span>
                  {summary !== 'none' && (
                    <span className="cal-cell__dot" aria-hidden="true" />
                  )}
                  {people.length > 0 && (
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
      )}

      {zoom === 'week' && (
        <div className="week-board" role="list" aria-label={weekLabel}>
          {currentWeek.map((dateKey) => {
            const trip = activeTripOn(trips, dateKey)
            const isSelected = dateKey === selectedKey
            const isToday = dateKey === todayKey
            const assigns = assignmentsByDay.get(dateKey) ?? []
            const summary = daySummary(dateKey)
            return (
              <article
                key={dateKey}
                className={[
                  'week-day',
                  isSelected ? 'is-selected' : undefined,
                  isToday ? 'is-today' : undefined,
                  trip ? 'has-trip' : undefined,
                  summary !== 'none' ? `is-${summary}` : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="listitem"
              >
                <div className="week-day__top">
                  <button
                    type="button"
                    className="week-day__head"
                    onClick={() => selectDay(dateKey)}
                    onDoubleClick={() => selectDay(dateKey, 'day')}
                    aria-pressed={isSelected}
                  >
                    <strong>
                      {parseDateKey(dateKey).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </strong>
                    <span>{trip ? trip.title : 'No trip'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost week-day__zoom"
                    onClick={() => selectDay(dateKey, 'day')}
                  >
                    Open day
                  </button>
                </div>

                {!trip ? (
                  <p className="week-day__empty">Nothing scheduled</p>
                ) : trip.slots.length === 0 ? (
                  <p className="week-day__empty">No care times</p>
                ) : (
                  <ul className="week-day__slots">
                    {trip.slots.map((slot) => {
                      const names = uniqueNames(
                        assigns
                          .filter((item) => item.time === slot.time)
                          .map((item) => item.personName),
                      )
                      const status = daySlotStatuses([slot], checkIns, dateKey)[0]
                      const openCount = status?.openCount ?? 0
                      const openTasks =
                        status?.tasks
                          .filter((item) => !item.done)
                          .map((item) => item.task) ?? []
                      return (
                        <li
                          key={slot.id}
                          className={
                            openCount > 0 ? 'week-slot is-open' : 'week-slot is-done'
                          }
                        >
                          <div className="week-slot__meta">
                            <div className="week-slot__title">
                              <strong>{routineLabel(slot.time)}</strong>
                              <span className="week-slot__clock">
                                {formatSlotTime(slot.time)}
                              </span>
                            </div>
                            <span>{slotStatusLabel(openCount, names.length)}</span>
                          </div>
                          {names.length === 0 ? (
                            <em className="week-slot__open">Unassigned</em>
                          ) : (
                            <div className="week-slot__people">
                              {names.map((name) => (
                                <PersonChip key={name} name={name} size="sm" />
                              ))}
                            </div>
                          )}
                          {status && (
                            <ul className="week-slot__details">
                              {status.tasks.map((item) => (
                                <li
                                  key={`${slot.id}-${item.task}`}
                                  className={item.done ? 'is-done' : 'is-open'}
                                >
                                  <span>{item.task}</span>
                                  <em>{item.done ? item.by ?? 'Done' : 'Open'}</em>
                                </li>
                              ))}
                            </ul>
                          )}
                          {openTasks.length > 0 && (
                            <button
                              type="button"
                              className="btn btn--primary routine-claim routine-claim--compact"
                              onClick={() => openClaim(dateKey, slot.time, openTasks)}
                            >
                              Assign routine
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </article>
            )
          })}
        </div>
      )}

      <div className="cal-legend">
        <span>
          <i className="dot dot--open" /> All open
        </span>
        <span>
          <i className="dot dot--partial" /> Partly done
        </span>
        <span>
          <i className="dot dot--done" /> Complete
        </span>
      </div>

      <div className="cal-legend cal-legend--people">
        {helperLegend.length === 0 ? (
          <span>No helpers assigned yet — add them under Schedule.</span>
        ) : (
          helperLegend.map((name) => <PersonChip key={name} name={name} />)
        )}
      </div>

      {zoom === 'day' ? (
        renderDayDetail(selectedKey)
      ) : zoom === 'month' ? (
        renderDayDetail(selectedKey)
      ) : (
        <div className="cal-day cal-day--summary">
          <div className="cal-day__head">
            <h3>{selectedLabel}</h3>
            {selectedTrip ? <p>{selectedTrip.title}</p> : <p>No trip scheduled this day.</p>}
          </div>
          {selectedTrip && (
            <div className="cal-day__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setZoom('day')}
              >
                Zoom to day
              </button>
              <button type="button" className="btn btn--primary" onClick={onCheckIn}>
                Log a check-in
              </button>
            </div>
          )}
        </div>
      )}

      {claimTarget && (
        <ClaimOpenTask
          target={claimTarget}
          knownNames={knownNames}
          onCancel={() => setClaimTarget(null)}
          onClaim={async (personName) => {
            await onClaimOpenTask({
              tripId: claimTarget.tripId,
              dateKey: claimTarget.dateKey,
              time: claimTarget.time,
              tasks: claimTarget.tasks,
              personName,
            })
            setClaimTarget(null)
          }}
        />
      )}
    </section>
  )
}
