import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MonthSelector } from '@/components/ledger/month-selector'
import { LedgerViewToggle, type LedgerView } from '@/components/ledger/ledger-view-toggle'
import { AccountOverviewCard } from '@/components/overview/account-overview-card'
import { useAccounts } from '@/hooks/use-accounts'
import { useLookups } from '@/hooks/use-lookups'
import { useTransactions } from '@/hooks/use-transactions'
import { useMonthBalances, useSetMonthBalance } from '@/hooks/use-month-balances'
import { useMonth } from '@/hooks/use-month'
import { useFullWidth } from '@/hooks/use-full-width'
import { formatCents } from '@/lib/format'
import { incomeTypeIds } from '@/lib/txn'

/** Sub-tab 1: cash-on-hand roll-up and per-account starting balances. */
export function BalanceTracker() {
  const { year, month, setMonth } = useMonth()
  const { fullWidth } = useFullWidth()
  const [view, setView] = useState<LedgerView>('cash')

  const accounts = useAccounts()
  const lookups = useLookups()
  const transactions = useTransactions({ year, month, accountId: null })
  const balances = useMonthBalances(year, month)
  const setBalance = useSetMonthBalance()

  // Which accounts are credit cards (no cash balance) — mirrors the ledger.
  const creditAccountIds = useMemo(() => {
    const creditTypeIds = new Set(
      (lookups.data?.accountTypes ?? []).filter((t) => t.name === 'credit').map((t) => t.id),
    )
    return new Set(
      (accounts.data ?? []).filter((a) => creditTypeIds.has(a.account_type_id)).map((a) => a.id),
    )
  }, [lookups.data, accounts.data])

  // Per-account spending, income gained, and entry counts for the month.
  // Income rows are money in (not spending), so they roll up separately.
  const { spentByAccount, gainedByAccount, entriesByAccount } = useMemo(() => {
    const income = incomeTypeIds({ types: lookups.data?.types ?? [] })
    const spent = new Map<string, number>()
    const gained = new Map<string, number>()
    const count = new Map<string, number>()
    for (const t of transactions.data ?? []) {
      if (income.has(t.transaction_type_id)) {
        gained.set(t.account_id, (gained.get(t.account_id) ?? 0) + t.amount_cents)
        continue
      }
      spent.set(t.account_id, (spent.get(t.account_id) ?? 0) + t.amount_cents)
      count.set(t.account_id, (count.get(t.account_id) ?? 0) + 1)
    }
    return { spentByAccount: spent, gainedByAccount: gained, entriesByAccount: count }
  }, [transactions.data, lookups.data])

  const startingByAccount = useMemo(
    () => new Map((balances.data ?? []).map((b) => [b.account_id, b.starting_cents])),
    [balances.data],
  )

  const cashAccounts = (accounts.data ?? []).filter((a) => !creditAccountIds.has(a.id))
  const creditAccounts = (accounts.data ?? []).filter((a) => creditAccountIds.has(a.id))

  // Roll-up across cash accounts that have a starting balance set.
  // Cash on hand = starting + gained (income in) − spent (money out).
  const rollup = useMemo(() => {
    let starting = 0
    let spent = 0
    let gained = 0
    let hasAny = false
    for (const a of cashAccounts) {
      const s = startingByAccount.get(a.id)
      spent += spentByAccount.get(a.id) ?? 0
      gained += gainedByAccount.get(a.id) ?? 0
      if (s != null) {
        starting += s
        hasAny = true
      }
    }
    return { starting, spent, gained, remaining: starting + gained - spent, hasAny }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashAccounts, startingByAccount, spentByAccount, gainedByAccount])

  function handleSetStarting(accountId: string, cents: number) {
    setBalance.mutate({ account_id: accountId, year, month, starting_cents: cents })
  }

  const loading = accounts.isPending || lookups.isPending || transactions.isPending
  const loadError = accounts.error ?? lookups.error ?? transactions.error

  // Full-width mode fans the account cards into columns (one per account) that
  // wrap when they run out of room; otherwise they stack in a single column.
  const accountListClass = fullWidth
    ? 'grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]'
    : 'space-y-3'

  return (
    <div className="space-y-4">
      <MonthSelector year={year} month={month} onChange={setMonth} />
      <LedgerViewToggle value={view} onChange={setView} />

      {loadError && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load: {loadError.message}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : view === 'cash' ? (
        <>
          {/* Cash-on-hand hero */}
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Cash on hand
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {rollup.hasAny ? formatCents(rollup.remaining) : '—'}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Started with{' '}
                  <span className="font-medium text-foreground tabular-nums">
                    {rollup.hasAny ? formatCents(rollup.starting) : '—'}
                  </span>
                </span>
                {rollup.gained > 0 && (
                  <span>
                    Gained{' '}
                    <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatCents(rollup.gained)}
                    </span>
                  </span>
                )}
                <span>
                  Spent{' '}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatCents(rollup.spent)}
                  </span>
                </span>
              </div>
              {!rollup.hasAny && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Set a starting balance on each account below to track how much is left this month.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cash accounts */}
          {cashAccounts.length > 0 ? (
            <div className={accountListClass}>
              {cashAccounts.map((a) => (
                <AccountOverviewCard
                  key={a.id}
                  account={a}
                  startingCents={startingByAccount.get(a.id) ?? null}
                  spentCents={spentByAccount.get(a.id) ?? 0}
                  gainedCents={gainedByAccount.get(a.id) ?? 0}
                  entries={entriesByAccount.get(a.id) ?? 0}
                  isCredit={false}
                  saving={setBalance.isPending}
                  onSetStarting={(cents) => handleSetStarting(a.id, cents)}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No cash accounts yet.
            </p>
          )}
        </>
      ) : creditAccounts.length > 0 ? (
        <div className={accountListClass}>
          {creditAccounts.map((a) => (
            <AccountOverviewCard
              key={a.id}
              account={a}
              startingCents={null}
              spentCents={spentByAccount.get(a.id) ?? 0}
              gainedCents={gainedByAccount.get(a.id) ?? 0}
              entries={entriesByAccount.get(a.id) ?? 0}
              isCredit
              saving={false}
              onSetStarting={() => {}}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No credit-card accounts yet.
        </p>
      )}
    </div>
  )
}
