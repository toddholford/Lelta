import { useMemo, useState } from 'react'
import { MonthSelector } from '@/components/ledger/month-selector'
import { CategoryIcon } from '@/components/ledger/category-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { useLookups } from '@/hooks/use-lookups'
import { useMonth } from '@/hooks/use-month'
import { useRecurringTransactions } from '@/hooks/use-transactions'
import { occurrencesInMonth, type RecurringFrequency } from '@/lib/recurring'
import { formatSignedCents, MONTH_NAMES } from '@/lib/format'
import { incomeTypeIds } from '@/lib/txn'
import { cn } from '@/lib/utils'
import type { Lookups, Transaction } from '@/lib/types'

const FREQ_TABS: { id: RecurringFrequency; label: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Biweekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

/** One projected landing of a recurring series in the viewed month. */
interface Occurrence {
  txn: Transaction
  day: number
}

/**
 * Collapse multiple real rows of the same recurring series to a single anchor.
 * Prefer the template link; otherwise a series is one (account, source,
 * frequency) tuple. Keeps a June entry from double-projecting when the same
 * bill was also logged in July.
 */
function seriesKey(t: Transaction): string {
  return (
    t.recurring_template_id ??
    `${t.account_id}|${t.source_name}|${t.transaction_frequency_id}`
  )
}

/** Sub-tab 2: recurring payments, projected forward onto the viewed month. */
export function RecurringPayments() {
  const { year, month, setMonth } = useMonth()
  const lookups = useLookups()
  const recurring = useRecurringTransactions()
  const [freq, setFreq] = useState<RecurringFrequency>('monthly')

  const income = useMemo(
    () => incomeTypeIds({ types: lookups.data?.types ?? [] }),
    [lookups.data],
  )

  // Project every recurring series onto this month, bucketed by frequency.
  const byFreq = useMemo(() => {
    const buckets: Record<RecurringFrequency, Occurrence[]> = {
      weekly: [],
      biweekly: [],
      monthly: [],
      yearly: [],
    }
    if (!lookups.data) return buckets

    const freqName = new Map(lookups.data.frequencies.map((f) => [f.id, f.name]))

    // One anchor per series — the earliest, so projection covers the fullest
    // span. (Rows arrive txn_date-ascending, but don't assume that here.)
    const anchors = new Map<string, Transaction>()
    for (const t of recurring.data ?? []) {
      if (t.transaction_frequency_id == null) continue
      const key = seriesKey(t)
      const cur = anchors.get(key)
      if (!cur || t.txn_date < cur.txn_date) anchors.set(key, t)
    }

    for (const t of anchors.values()) {
      const name = freqName.get(t.transaction_frequency_id!) as
        | RecurringFrequency
        | undefined
      if (!name || !(name in buckets)) continue
      for (const day of occurrencesInMonth(t.txn_date, name, year, month)) {
        buckets[name].push({ txn: t, day })
      }
    }

    for (const list of Object.values(buckets)) list.sort((a, b) => a.day - b.day)
    return buckets
  }, [recurring.data, lookups.data, year, month])

  const active = byFreq[freq]
  const monthTotal = useMemo(() => {
    let net = 0
    for (const o of active) {
      net += income.has(o.txn.transaction_type_id) ? o.txn.amount_cents : -o.txn.amount_cents
    }
    return net
  }, [active, income])

  const loading = lookups.isPending || recurring.isPending
  const loadError = lookups.error ?? recurring.error

  return (
    <div className="space-y-4">
      <MonthSelector year={year} month={month} onChange={setMonth} />

      {loadError && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load: {loadError.message}
        </p>
      )}

      {/* Frequency sub-tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {FREQ_TABS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFreq(opt.id)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:text-sm',
              freq === opt.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
            {byFreq[opt.id].length > 0 && (
              <span className="ml-1 tabular-nums opacity-60">
                {byFreq[opt.id].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : active.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No {freq} recurring payments in {MONTH_NAMES[month]}.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between px-1">
            <p className="text-xs text-muted-foreground">
              {active.length} in {MONTH_NAMES[month]}
            </p>
            <p
              className={cn(
                'text-sm font-semibold tabular-nums',
                monthTotal >= 0 && 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {formatSignedCents(monthTotal, monthTotal >= 0)}
            </p>
          </div>
          {active.map((o) => (
            <RecurringRow
              key={`${o.txn.id}-${o.day}`}
              occurrence={o}
              lookups={lookups.data as Lookups}
              month={month}
              isIncome={income.has(o.txn.transaction_type_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface RecurringRowProps {
  occurrence: Occurrence
  lookups: Lookups
  month: number
  isIncome: boolean
}

/** Read-only row for one projected occurrence: date, source, amount. */
function RecurringRow({ occurrence, lookups, month, isIncome }: RecurringRowProps) {
  const { txn, day } = occurrence
  const category = lookups.categories.find((c) => c.id === txn.transaction_category_id)

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
      <CategoryIcon category={category?.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{txn.source_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {MONTH_NAMES[month]} {day}
          {category ? ` · ${category.name}` : ''}
        </p>
      </div>
      <p
        className={cn(
          'shrink-0 font-semibold tabular-nums',
          isIncome && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {formatSignedCents(txn.amount_cents, isIncome)}
      </p>
    </div>
  )
}
