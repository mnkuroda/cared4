import { useMemo, useState } from 'react'
import {
  activeTripOn,
  daySlotStatuses,
  formatSlotTime,
  monthMatrix,
  parseDateKey,
  toDateKey,
} from '../lib/careStatus'
import type { CheckIn, Trip } from '../types'

interface CareCalendarProps {
  trips: Trip[]
  checkIns: CheckIn[]
  onCheckIn: () => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CareCalendar({ trips, checkIns, onCheckIn }: CareCalendarProps) {
  const todayKey = toDateKey(new Date())
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
      const start = parseDateKey(trip.startDate)
      const end = parseDateKey(trip.endDate)
      const d = new Date(start)
      while (d <= end) {
        set.add(toDateKey(d))
        d.setDate(d.getDate() + 1)
      }
    }
    return set
  }, [trips])

  const selectedTrip = activeTripOn(trips, selectedKey)
  const slotStatuses = selectedTrip
    ? daySlotStatuses(selectedTrip.slots, checkIns, selectedKey)
    : []

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

  return (
    <section className="panel calendar">
      <header className="panel__header">
        <h2>Care calendar</h2>
        <p>See open care times and what&apos;s already logged.</p>
      </header>

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
            const isSelected = dateKey === selectedKey
            const isToday = dateKey === todayKey
            const inTrip = tripDays.has(dateKey)
            return (
              <button
                key={dateKey}
                type="button"
                className={[
                  'cal-cell',
                  inTrip ? 'cal-cell--trip' : undefined,
                  isSelected ? 'is-selected' : undefined,
                  isToday ? 'is-today' : undefined,
                  summary !== 'none' ? `is-${summary}` : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedKey(dateKey)}
                aria-pressed={isSelected}
                aria-label={parseDateKey(dateKey).toLocaleDateString()}
              >
                <span className="cal-cell__day">{Number(dateKey.slice(-2))}</span>
                {summary !== 'none' && <span className="cal-cell__dot" aria-hidden="true" />}
              </button>
            )
          }),
        )}
      </div>

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
            {slotStatuses.map(({ slot, tasks, openCount }) => (
              <li
                key={slot.id}
                className={openCount > 0 ? 'cal-slot is-open' : 'cal-slot is-done'}
              >
                <div className="cal-slot__time">
                  <strong>{formatSlotTime(slot.time)}</strong>
                  <span>{openCount > 0 ? `${openCount} open` : 'All done'}</span>
                </div>
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
              </li>
            ))}
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
