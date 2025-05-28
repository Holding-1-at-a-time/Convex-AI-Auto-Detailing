export function formatDate(date: string): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function daysBetween(date: string): number {
  const d1 = new Date(date)
  const d2 = new Date()
  const diff = d2.getTime() - d1.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}
