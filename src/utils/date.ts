export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-UG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-UG', {
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatDateTime(ts: number): string {
  return `${formatDate(ts)} • ${formatTime(ts)}`
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return formatDate(ts)
}

export function startOfDay(date = new Date()): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function endOfDay(date = new Date()): number {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export function startOfWeek(): number {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function startOfMonth(): number {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long' })
}
