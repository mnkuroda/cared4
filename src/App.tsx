import { useState } from 'react'
import { ActivityLog } from './components/ActivityLog'
import { CareCalendar } from './components/CareCalendar'
import { CheckInForm } from './components/CheckInForm'
import { ScheduleView } from './components/ScheduleView'
import { ShareBar } from './components/ShareBar'
import { Welcome } from './components/Welcome'
import { useHousehold } from './hooks/useHousehold'
import type { TabId } from './types'

const TABS: { id: TabId; label: string }[] = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'checkin', label: 'Check in' },
  { id: 'log', label: 'Activity' },
  { id: 'schedule', label: 'Schedule' },
]

export default function App() {
  const {
    household,
    ready,
    busy,
    error,
    cloudReady,
    startHousehold,
    joinHousehold,
    addCheckIn,
    addTrip,
    deleteTrip,
    leaveHousehold,
    isOwner,
    claimScheduleControl,
  } = useHousehold()
  const [tab, setTab] = useState<TabId>('calendar')

  if (!ready) {
    return <div className="boot">Loading…</div>
  }

  if (!household) {
    return (
      <div className="app-shell app-shell--welcome">
        <Welcome
          cloudReady={cloudReady}
          busy={busy}
          error={error}
          onCreate={startHousehold}
          onJoin={joinHousehold}
        />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <p className="brand brand--sm">cared4</p>
        <ShareBar
          householdId={household.id}
          householdName={household.name}
          onLeave={leaveHousehold}
        />
      </header>

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}

      <nav className="tabs tabs--four" aria-label="Main">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'is-active' : undefined}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === 'calendar' && (
          <CareCalendar
            trips={household.trips}
            checkIns={household.checkIns}
            onCheckIn={() => setTab('checkin')}
          />
        )}
        {tab === 'checkin' && (
          <CheckInForm tasks={household.tasks} onSubmit={addCheckIn} />
        )}
        {tab === 'log' && <ActivityLog checkIns={household.checkIns} />}
        {tab === 'schedule' && (
          <ScheduleView
            trips={household.trips}
            tasks={household.tasks}
            canManage={isOwner}
            onAdd={addTrip}
            onDelete={deleteTrip}
            onClaimControl={isOwner ? undefined : claimScheduleControl}
          />
        )}
      </main>

      <p className="local-note">
        Shared live with helpers who have your link or household code.
      </p>
    </div>
  )
}
