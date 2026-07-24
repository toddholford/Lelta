import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MonthSelector } from '@/components/ledger/month-selector'
import { AccountOverviewCard } from '@/components/overview/account-overview-card'
import { useAccounts } from '@/hooks/use-accounts'
import { useLookups } from '@/hooks/use-lookups'
import { useTransactions } from '@/hooks/use-transactions'
import { useMonthBalances, useSetMonthBalance } from '@/hooks/use-month-balances'
import { formatCents } from '@/lib/format'

export function OverviewPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

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

  // Per-account spending + entry counts for the month.
  const { spentByAccount, entriesByAccount } = useMemo(() => {
    const spent = new Map<string, number>()
    const count = new Map<string, number>()
    for (const t of transactions.data ?? []) {
      spent.set(t.account_id, (spent.get(t.account_id) ?? 0) + t.amount_cents)
      count.set(t.account_id, (count.get(t.account_id) ?? 0) + 1)
    }
    return { spentByAccount: spent, entriesByAccount: count }
  }, [transactions.data])

  const startingByAccount = useMemo(
    () => new Map((balances.data ?? []).map((b) => [b.account_id, b.starting_cents])),
    [balances.data],
  )

  const cashAccounts = (accounts.data ?? []).filter((a) => !creditAccountIds.has(a.id))
  const creditAccounts = (accounts.data ?? []).filter((a) => creditAccountIds.has(a.id))

  // Roll-up across cash accounts that have a starting balance set.
  const rollup = useMemo(() => {
    let starting = 0
    let spent = 0
    let hasAny = false
    for (const a of cashAccounts) {
      const s = startingByAccount.get(a.id)
      spent += spentByAccount.get(a.id) ?? 0
      if (s != null) {
        starting += s
        hasAny = true
      }
    }
    return { starting, spent, remaining: starting - spent, hasAny }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashAccounts, startingByAccount, spentByAccount])

  function handleSetStarting(accountId: string, cents: number) {
    setBalance.mutate({ account_id: accountId, year, month, starting_cents: cents })
  }

  const loading = accounts.isPending || lookups.isPending || transactions.isPending
  const loadError = accounts.error ?? lookups.error ?? transactions.error

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Overview</h1>
      </div>

      <MonthSelector
        year={year}
        month={month}
        onChange={(y, m) => {
          setYear(y)
          setMonth(m)
        }}
      />

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
      ) : (
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
              <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
                <span>
                  Started with{' '}
                  <span className="font-medium text-foreground tabular-nums">
                    {rollup.hasAny ? formatCents(rollup.starting) : '—'}
                  </span>
                </span>
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
          <div className="space-y-3">
            {cashAccounts.map((a) => (
              <AccountOverviewCard
                key={a.id}
                account={a}
                startingCents={startingByAccount.get(a.id) ?? null}
                spentCents={spentByAccount.get(a.id) ?? 0}
                entries={entriesByAccount.get(a.id) ?? 0}
                isCredit={false}
                saving={setBalance.isPending}
                onSetStarting={(cents) => handleSetStarting(a.id, cents)}
              />
            ))}
          </div>

          {/* Credit cards */}
          {creditAccounts.length > 0 && (
            <div className="space-y-3">
              <p className="pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Credit cards
              </p>
              {creditAccounts.map((a) => (
                <AccountOverviewCard
                  key={a.id}
                  account={a}
                  startingCents={null}
                  spentCents={spentByAccount.get(a.id) ?? 0}
                  entries={entriesByAccount.get(a.id) ?? 0}
                  isCredit
                  saving={false}
                  onSetStarting={() => {}}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
