import { useEffect, useMemo, useState } from 'react'
import { MonthSelector } from '@/components/ledger/month-selector'
import { CategoryIcon } from '@/components/ledger/category-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccounts } from '@/hooks/use-accounts'
import { useLookups } from '@/hooks/use-lookups'
import { useMonth } from '@/hooks/use-month'
import { useTransactions } from '@/hooks/use-transactions'
import { formatCents, formatSignedCents, MONTH_NAMES, todayISO } from '@/lib/format'
import { incomeTypeIds } from '@/lib/txn'
import { cn } from '@/lib/utils'
import type { Lookups, Transaction } from '@/lib/types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Spent (money out) and gained (money in) totals for one day's rows. */
function dayTotals(list: Transaction[], income: Set<number>) {
  let spent = 0
  let gained = 0
  for (const t of list) {
    if (income.has(t.transaction_type_id)) gained += t.amount_cents
    else spent += t.amount_cents
  }
  return { spent, gained, net: gained - spent }
}

/** Sub-tab 3: month calendar with each day's transactions. */
export function CalendarView() {
  const { year, month, setMonth } = useMonth()
  const lookups = useLookups()
  const accounts = useAccounts()
  const transactions = useTransactions({ year, month, accountId: null })

  const income = useMemo(
    () => incomeTypeIds({ types: lookups.data?.types ?? [] }),
    [lookups.data],
  )
  const accountNameById = useMemo(
    () => new Map((accounts.data ?? []).map((a) => [a.id, a.institution])),
    [accounts.data],
  )

  // Group the month's transactions by their day-of-month. useTransactions
  // already scopes the query to this month, so every row belongs here.
  const byDay = useMemo(() => {
    const m = new Map<number, Transaction[]>()
    for (const t of transactions.data ?? []) {
      const day = Number(t.txn_date.slice(8, 10))
      const arr = m.get(day)
      if (arr) arr.push(t)
      else m.set(day, [t])
    }
    return m
  }, [transactions.data])

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Today's day-of-month, but only when the viewed month is the current one.
  const [ty, tm, td] = todayISO().split('-').map(Number)
  const todayDay = ty === year && tm === month + 1 ? td : null

  // Default the detail panel to today (when in view); reset on month change.
  const [selectedDay, setSelectedDay] = useState<number | null>(todayDay)
  useEffect(() => {
    setSelectedDay(todayDay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selected = selectedDay != null ? byDay.get(selectedDay) ?? [] : []
  const selectedTotals = dayTotals(selected, income)

  const loading = lookups.isPending || accounts.isPending || transactions.isPending
  const loadError = lookups.error ?? accounts.error ?? transactions.error

  return (
    <div className="space-y-4">
      <MonthSelector year={year} month={month} onChange={setMonth} />

      {loadError && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load: {loadError.message}
        </p>
      )}

      {loading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : (
        <>
          {/* Month grid */}
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {w}
              </div>
            ))}

            {cells.map((day, i) => {
              if (day == null) return <div key={`blank-${i}`} />

              const list = byDay.get(day) ?? []
              const totals = dayTotals(list, income)
              const isToday = day === todayDay
              const isSelected = day === selectedDay

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex min-h-[3.5rem] flex-col rounded-lg border p-1 text-left transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : list.length
                        ? 'border-border bg-card hover:bg-accent'
                        : 'border-transparent hover:bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full text-xs tabular-nums',
                      isToday && 'bg-primary font-semibold text-primary-foreground',
                    )}
                  >
                    {day}
                  </span>

                  {list.length > 0 && (
                    <div className="mt-auto space-y-0.5 pt-1">
                      <div className="flex flex-wrap items-center gap-0.5">
                        {list.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className={cn(
                              'size-1.5 rounded-full',
                              income.has(t.transaction_type_id) ? 'bg-emerald-500' : 'bg-primary',
                            )}
                          />
                        ))}
                        {list.length > 3 && (
                          <span className="text-[9px] leading-none text-muted-foreground">
                            +{list.length - 3}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'hidden truncate text-[10px] tabular-nums md:block',
                          totals.net >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground',
                        )}
                      >
                        {formatSignedCents(totals.net, totals.net >= 0)}
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected-day detail */}
          {selectedDay != null && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold">
                  {MONTH_NAMES[month]} {selectedDay}
                </p>
                {selected.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedTotals.gained > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{formatCents(selectedTotals.gained)} in
                      </span>
                    )}
                    {selectedTotals.gained > 0 && selectedTotals.spent > 0 && ' · '}
                    {selectedTotals.spent > 0 && <span>{formatCents(selectedTotals.spent)} out</span>}
                  </p>
                )}
              </div>

              {selected.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No transactions on this day.
                </p>
              ) : (
                <div className="space-y-2">
                  {selected.map((t) => (
                    <DayRow
                      key={t.id}
                      transaction={t}
                      lookups={lookups.data as Lookups}
                      accountName={accountNameById.get(t.account_id)}
                      isIncome={income.has(t.transaction_type_id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface DayRowProps {
  transaction: Transaction
  lookups: Lookups
  accountName?: string
  isIncome: boolean
}

/** Compact, read-only ledger row for the selected day's list. */
function DayRow({ transaction, lookups, accountName, isIncome }: DayRowProps) {
  const category = lookups.categories.find((c) => c.id === transaction.transaction_category_id)

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
      <CategoryIcon category={category?.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{transaction.source_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {category?.name ?? 'uncategorized'}
          {accountName ? ` · ${accountName}` : ''}
        </p>
      </div>
      <p
        className={cn(
          'shrink-0 font-semibold tabular-nums',
          isIncome && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {formatSignedCents(transaction.amount_cents, isIncome)}
      </p>
    </div>
  )
}
