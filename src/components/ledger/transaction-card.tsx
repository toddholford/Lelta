import { formatCents, formatShortDate } from '@/lib/format'
import type { Lookups, Transaction } from '@/lib/types'
import { CategoryIcon } from './category-icon'

interface TransactionCardProps {
  transaction: Transaction
  lookups: Lookups
  accountName?: string
  onClick: () => void
}

/** Tap-friendly ledger row: icon | source + meta | amount + date. */
export function TransactionCard({ transaction, lookups, accountName, onClick }: TransactionCardProps) {
  const category = lookups.categories.find((c) => c.id === transaction.transaction_category_id)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors active:bg-accent md:hover:bg-accent"
    >
      <CategoryIcon category={category?.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{transaction.source_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {category?.name ?? 'uncategorized'}
          {accountName ? ` · ${accountName}` : ''}
          {transaction.note ? ` · ${transaction.note}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums">{formatCents(transaction.amount_cents)}</p>
        <p className="text-xs text-muted-foreground">{formatShortDate(transaction.txn_date)}</p>
      </div>
    </button>
  )
}
