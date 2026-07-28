import { formatShortDate, formatSignedCents } from '@/lib/format'
import { isIncomeType } from '@/lib/txn'
import { cn } from '@/lib/utils'
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
  const income = isIncomeType(transaction.transaction_type_id, lookups)

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
        <p
          className={cn(
            'font-semibold tabular-nums',
            income && 'text-emerald-600 dark:text-emerald-400',
          )}
        >
          {formatSignedCents(transaction.amount_cents, income)}
        </p>
        <p className="text-xs text-muted-foreground">{formatShortDate(transaction.txn_date)}</p>
      </div>
    </button>
  )
}
