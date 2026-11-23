import { useState } from 'react'
import { shareUrl } from '../storage'

interface ShareBarProps {
  householdId: string
  householdName: string
  onLeave: () => void
}

export function ShareBar({ householdId, householdName, onLeave }: ShareBarProps) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    const link = shareUrl(householdId)
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this household link:', link)
    }
  }

  return (
    <div className="share-bar">
      <div>
        <p className="share-bar__home">{householdName}</p>
        <p className="share-bar__code">
          Code <code>{householdId}</code>
        </p>
      </div>
      <div className="share-bar__actions">
        <button type="button" className="btn btn--primary" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy share link'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onLeave}>
          Leave
        </button>
      </div>
    </div>
  )
}
