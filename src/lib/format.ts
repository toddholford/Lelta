const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

/** Format integer cents as currency. 123456 -> "$1,234.56" */
export function formatCents(cents: number): string {
  return usd.format(cents / 100)
}

/** Parse a user-entered dollar string into integer cents. "12.34" -> 1234 */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (!cleaned || !/^-?\d*(\.\d{0,2})?$/.test(cleaned)) return null
  const value = Number.parseFloat(cleaned)
  if (Number.isNaN(value)) return null
  return Math.round(value * 100)
}

/** "2026-07" style month key from a Date */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/** First / first-of-next-month ISO dates for a (year, 0-based month) */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 10)
  return { start, end }
}

/** "Jul 21" style short date from an ISO date string */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Today's date as YYYY-MM-DD in local time */
export function todayISO(): string {
  const now = new Date()
  const off = now.getTimezoneOffset()
  return new Date(now.getTime() - off * 60_000).toISOString().slice(0, 10)
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const
