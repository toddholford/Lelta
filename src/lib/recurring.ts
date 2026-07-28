// Projecting a recurring transaction forward onto a viewed month. A recurring
// series is anchored by a real transaction's `txn_date`; from that anchor we
// compute which day(s) of a given (year, month) the series lands on. Projection
// is forward-only — occurrences before the anchor date are never invented.

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly'

/** Whole-day number since the Unix epoch for a calendar date (DST-immune). */
function dayNumber(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month, day) / 86_400_000)
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Days-of-month in the viewed (year, 0-based month) on which the series
 * anchored at `anchorISO` (YYYY-MM-DD) occurs, given its frequency.
 *
 *   weekly / biweekly — stepped 7 / 14 days from the anchor
 *   monthly           — the anchor's day-of-month (clamped to short months)
 *   yearly            — only in the anchor's month, on its day-of-month
 *
 * Returns an ascending list of day numbers (1-based), empty when the series
 * has no occurrence in the month or hasn't started yet.
 */
export function occurrencesInMonth(
  anchorISO: string,
  frequency: RecurringFrequency,
  year: number,
  month: number,
): number[] {
  const [ay, am, ad] = anchorISO.slice(0, 10).split('-').map(Number)
  const anchor = dayNumber(ay, am - 1, ad)
  const dim = daysInMonth(year, month)
  const monthStart = dayNumber(year, month, 1)
  const monthEnd = dayNumber(year, month, dim)

  // The series hasn't started yet within this month.
  if (monthEnd < anchor) return []

  switch (frequency) {
    case 'weekly':
    case 'biweekly': {
      const step = frequency === 'weekly' ? 7 : 14
      // Jump to the first occurrence that lands in (or after) this month.
      const first =
        anchor >= monthStart
          ? anchor
          : anchor + Math.ceil((monthStart - anchor) / step) * step
      const days: number[] = []
      for (let dn = first; dn <= monthEnd; dn += step) {
        days.push(new Date(dn * 86_400_000).getUTCDate())
      }
      return days
    }
    case 'monthly':
      return [Math.min(ad, dim)]
    case 'yearly':
      return month === am - 1 ? [Math.min(ad, dim)] : []
  }
}
