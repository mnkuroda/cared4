import type { CheckIn } from '../types'

interface ActivityLogProps {
  checkIns: CheckIn[]
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ActivityLog({ checkIns }: ActivityLogProps) {
  return (
    <section className="panel log">
      <header className="panel__header">
        <h2>Activity</h2>
        <p>Everyone can see what already got done.</p>
      </header>

      {checkIns.length === 0 ? (
        <p className="empty">No check-ins yet. First one sets the tone.</p>
      ) : (
        <ol className="timeline">
          {checkIns.map((entry) => (
            <li key={entry.id} className="timeline__item">
              <div className="timeline__meta">
                <time dateTime={entry.at}>{formatWhen(entry.at)}</time>
                <span>{entry.personName}</span>
              </div>
              <p className="timeline__task">{entry.task}</p>
              {entry.note ? <p className="timeline__note">{entry.note}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
