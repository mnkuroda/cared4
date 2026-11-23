import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { getRememberedName, newCheckInId, rememberName } from '../storage'
import type { CheckIn } from '../types'

interface CheckInFormProps {
  tasks: string[]
  onSubmit: (checkIn: CheckIn, photo?: File | null) => void | Promise<void>
}

function formatNow(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function CheckInForm({ tasks, onSubmit }: CheckInFormProps) {
  const [name, setName] = useState(getRememberedName)
  const [task, setTask] = useState(tasks[0] ?? '')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [justSaved, setJustSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!tasks.includes(task) && tasks[0]) setTask(tasks[0])
  }, [tasks, task])

  useEffect(() => {
    if (!photo) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const stamp = useMemo(() => formatNow(now), [now])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !task || saving) return

    rememberName(trimmed)
    setSaving(true)
    try {
      await onSubmit(
        {
          id: newCheckInId(),
          personName: trimmed,
          task,
          note: note.trim(),
          at: new Date().toISOString(),
        },
        photo,
      )
      setNote('')
      setPhoto(null)
      setNow(new Date())
      setJustSaved(true)
      window.setTimeout(() => setJustSaved(false), 2200)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel checkin">
      <header className="panel__header">
        <h2>Log care</h2>
        <p>Name in, pick what you did — time is filled for you. Snap a pic if you want.</p>
      </header>

      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          <span>Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Who checked in?"
            autoComplete="name"
            required
            disabled={saving}
          />
        </label>

        <div className="stamp" aria-live="polite">
          <span className="stamp__label">Date &amp; time</span>
          <strong>{stamp}</strong>
        </div>

        <label>
          <span>What did you do?</span>
          <select
            value={task}
            onChange={(e) => setTask(e.target.value)}
            required
            disabled={saving}
          >
            {tasks.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Note (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ate well, short walk, etc."
            rows={2}
            disabled={saving}
          />
        </label>

        <div className="photo-field">
          <span>Photo (optional)</span>
          <label className="photo-picker">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              disabled={saving}
            />
            <span className="btn btn--ghost">{photo ? 'Change photo' : 'Take or choose photo'}</span>
          </label>
          {preview && (
            <div className="photo-preview">
              <img src={preview} alt="Selected care photo preview" />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setPhoto(null)}
                disabled={saving}
              >
                Remove photo
              </button>
            </div>
          )}
        </div>

        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save check-in'}
        </button>

        {justSaved && (
          <p className="success-pulse" role="status">
            Saved — thanks for helping.
          </p>
        )}
      </form>
    </section>
  )
}
