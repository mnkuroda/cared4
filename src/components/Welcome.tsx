import { useState } from 'react'
import type { FormEvent } from 'react'

interface WelcomeProps {
  cloudReady: boolean
  busy: boolean
  error: string | null
  onCreate: (name: string) => Promise<unknown>
  onJoin: (code: string) => Promise<unknown>
}

export function Welcome({ cloudReady, busy, error, onCreate, onJoin }: WelcomeProps) {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [petHome, setPetHome] = useState('')
  const [code, setCode] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!cloudReady || busy) return
    if (mode === 'create') {
      await onCreate(petHome)
      return
    }
    if (code.trim()) await onJoin(code)
  }

  return (
    <section className="welcome">
      <div className="welcome__glow" aria-hidden="true" />
      <p className="brand">cared4</p>
      <h1>Pet care, checked in.</h1>
      <p className="lede">
        When you&apos;re away, helpers log what they did — feedings, potty breaks,
        litter — so everyone stays in sync.
      </p>

      {!cloudReady && (
        <div className="banner banner--warn" role="status">
          Cloud sync isn&apos;t configured yet. Add Supabase keys to enable sharing
          with neighbors.
        </div>
      )}

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}

      <div className="mode-toggle" role="tablist" aria-label="Get started">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'create'}
          className={mode === 'create' ? 'is-active' : undefined}
          onClick={() => setMode('create')}
          disabled={!cloudReady || busy}
        >
          Start a home
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'join'}
          className={mode === 'join' ? 'is-active' : undefined}
          onClick={() => setMode('join')}
          disabled={!cloudReady || busy}
        >
          Join with code
        </button>
      </div>

      <form className="welcome__form" onSubmit={handleSubmit}>
        {mode === 'create' ? (
          <label>
            <span>Home name</span>
            <input
              value={petHome}
              onChange={(e) => setPetHome(e.target.value)}
              placeholder="e.g. Kuroda pets"
              autoComplete="off"
              required
              disabled={!cloudReady || busy}
            />
          </label>
        ) : (
          <label>
            <span>Household code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="8-character code"
              autoComplete="off"
              spellCheck={false}
              required
              disabled={!cloudReady || busy}
            />
          </label>
        )}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!cloudReady || busy}
        >
          {busy
            ? 'Working…'
            : mode === 'create'
              ? 'Create household'
              : 'Join household'}
        </button>
      </form>
    </section>
  )
}
