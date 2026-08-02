import { formatCents } from '@/lib/format'
import { incomeTypeIds } from '@/lib/txn'
import { SelectableTransactionList } from './selectable-transaction-list'
import type { Account, Lookups, Transaction } from '@/lib/types'

interface AccountColumnProps {
  account: Account
  /** This account's transactions for the month, already sorted by the caller. */
  transactions: Transaction[]
  lookups: Lookups
  onOpen: (t: Transaction) => void
}

/**
 * One account's full ledger, rendered as a self-contained column. Used in
 * full-width mode where every account sits side by side instead of behind the
 * account tabs.
 */
export function AccountColumn({ account, transactions, lookups, onOpen }: AccountColumnProps) {
  // Column header total mirrors StatTiles: spending only, income excluded.
  const income = incomeTypeIds({ types: lookups.types })
  const spent = transactions
    .filter((t) => !income.has(t.transaction_type_id))
    .reduce((sum, t) => sum + t.amount_cents, 0)

  return (
    <section className="flex min-w-0 flex-col rounded-xl border bg-muted/30">
      <header className="border-b px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold">{account.institution}</p>
          <p className="shrink-0 text-sm font-semibold tabular-nums">{formatCents(spent)}</p>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {account.name} · {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'}
        </p>
      </header>

      <div className="p-2">
        {transactions.length > 0 ? (
          <SelectableTransactionList
            transactions={transactions}
            lookups={lookups}
            onOpen={onOpen}
          />
        ) : (
          <p className="px-1 py-8 text-center text-xs text-muted-foreground">
            No entries this month.
          </p>
        )}
      </div>
    </section>
  )
}
