import { useState } from 'react'
import type { FormEvent } from 'react'

interface WelcomeProps {
  onCreate: (name: string) => void
  onJoin: (code: string) => void
}

export function Welcome({ onCreate, onJoin }: WelcomeProps) {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [petHome, setPetHome] = useState('')
  const [code, setCode] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (mode === 'create') {
      onCreate(petHome)
      return
    }
    if (code.trim()) onJoin(code)
  }

  return (
    <section className="welcome">
      <div className="welcome__glow" aria-hidden="true" />
      <p className="brand">cared4</p>
      <h1>Pet care, checked in.</h1>
      <p className="lede">
        When you&apos;re away, helpers log what they did — feedings, potty breaks,
        meds — so everyone stays in sync.
      </p>

      <div className="mode-toggle" role="tablist" aria-label="Get started">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'create'}
          className={mode === 'create' ? 'is-active' : undefined}
          onClick={() => setMode('create')}
        >
          Start a home
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'join'}
          className={mode === 'join' ? 'is-active' : undefined}
          onClick={() => setMode('join')}
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
            />
          </label>
        )}
        <button type="submit" className="btn btn--primary">
          {mode === 'create' ? 'Create household' : 'Join household'}
        </button>
      </form>
    </section>
  )
}
