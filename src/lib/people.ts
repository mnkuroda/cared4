const PERSON_PALETTE = [
  { bg: '#d8ebe0', fg: '#1e4d39' },
  { bg: '#f3dfc2', fg: '#7a4d10' },
  { bg: '#d7e4f2', fg: '#1f3f66' },
  { bg: '#ead7ef', fg: '#5b2d6b' },
  { bg: '#e4efd0', fg: '#3f5a1d' },
  { bg: '#f2d6d6', fg: '#7a2e2e' },
  { bg: '#d6efef', fg: '#1d5555' },
  { bg: '#efe6d0', fg: '#5c4a1d' },
] as const

export function personColor(name: string): { bg: string; fg: string } {
  let hash = 0
  const key = name.trim().toLowerCase()
  for (let i = 0; i < key.length; i += 1) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PERSON_PALETTE[Math.abs(hash) % PERSON_PALETTE.length]
}

export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}
