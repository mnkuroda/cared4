import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { formatSlotTime, parseDateKey, routineLabel } from '../lib/careStatus'
import {
  getKnownNames,
  getRememberedName,
  rememberName,
} from '../storage'

export type ClaimTarget = {
  dateKey: string
  time: string
  tasks: string[]
  tripId: string
  tripTitle: string
}

interface ClaimOpenTaskProps {
  target: ClaimTarget
  knownNames?: string[]
  busy?: boolean
  onCancel: () => void
  onClaim: (personName: string) => void | Promise<void>
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

export function ClaimOpenTask({
  target,
  knownNames = [],
  busy = false,
  onCancel,
  onClaim,
}: ClaimOpenTaskProps) {
  const [name, setName] = useState(getRememberedName)
  const [saving, setSaving] = useState(false)

  const nameOptions = useMemo(
    () => mergeNames(getKnownNames(), knownNames),
    [knownNames],
  )

  const dayLabel = parseDateKey(target.dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const routine = routineLabel(target.time)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || saving || busy) return
    rememberName(trimmed)
    setSaving(true)
    try {
      await onClaim(trimmed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="claim-sheet" role="dialog" aria-modal="true" aria-labelledby="claim-title">
      <button type="button" className="claim-sheet__backdrop" aria-label="Close" onClick={onCancel} />
      <div className="claim-sheet__panel">
        <header className="claim-sheet__header">
          <div>
            <p className="claim-sheet__eyebrow">{target.tripTitle}</p>
            <h3 id="claim-title">Assign to me</h3>
            <p>
              {dayLabel} · {formatSlotTime(target.time)}
            </p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={saving}>
            Close
          </button>
        </header>

        <div className="claim-sheet__routine">
          <strong>{routine}</strong>
          <ul>
            {target.tasks.map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ul>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label>
            <span>Your name</span>
            <input
              list="claim-helper-names"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Who is taking this?"
              autoComplete="name"
              required
              disabled={saving || busy}
              autoFocus
            />
            <datalist id="claim-helper-names">
              {nameOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>

          {nameOptions.length > 0 && (
            <div className="name-picks" role="group" aria-label="Saved names">
              {nameOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === name ? 'name-pick is-active' : 'name-pick'}
                  onClick={() => setName(option)}
                  disabled={saving || busy}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <button type="submit" className="btn btn--primary" disabled={saving || busy}>
            {saving ? 'Saving…' : 'Assign this routine'}
          </button>
          <p className="claim-sheet__hint">
            Puts this visit under your name and marks all open tasks in it done.
          </p>
        </form>
      </div>
    </div>
  )
}
