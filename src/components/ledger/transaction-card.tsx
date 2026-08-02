import { formatShortDate, formatSignedCents } from '@/lib/format'
import { isIncomeType } from '@/lib/txn'
import { cn } from '@/lib/utils'
import { useLongPress } from '@/hooks/use-long-press'
import { SelectionCheckbox } from '@/components/ui/selection-checkbox'
import { HoldProgressFill } from '@/components/ui/hold-progress-fill'
import type { Lookups, Transaction } from '@/lib/types'
import { CategoryIcon } from './category-icon'

interface TransactionCardProps {
  transaction: Transaction
  lookups: Lookups
  accountName?: string
  onClick: () => void
  /** When true, the row shows a selection checkbox and reflects `selected`. */
  selectionMode?: boolean
  selected?: boolean
  /**
   * Fires on a press-and-hold (~450ms). Wired to enter multi-select mode; the
   * trailing click is suppressed so the hold doesn't also open the row.
   */
  onLongPress?: () => void
}

/** Tap-friendly ledger row: icon | source + meta | amount + date. */
export function TransactionCard({
  transaction,
  lookups,
  accountName,
  onClick,
  selectionMode,
  selected,
  onLongPress,
}: TransactionCardProps) {
  const category = lookups.categories.find((c) => c.id === transaction.transaction_category_id)
  const income = isIncomeType(transaction.transaction_type_id, lookups)
  const { handlers, consumeClick, pressing, durationMs } = useLongPress(onLongPress)

  return (
    <button
      type="button"
      onClick={() => {
        if (consumeClick()) return
        onClick()
      }}
      {...handlers}
      aria-pressed={selectionMode ? !!selected : undefined}
      className={cn(
        'relative flex w-full select-none items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors',
        // Press/hover highlight only when opening rows — not while toggling selection.
        !selectionMode && 'active:bg-accent md:hover:bg-accent',
        selectionMode && selected && 'border-primary bg-primary/5 ring-1 ring-primary',
      )}
    >
      <HoldProgressFill active={pressing} durationMs={durationMs} />
      {selectionMode && <SelectionCheckbox checked={!!selected} />}
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
