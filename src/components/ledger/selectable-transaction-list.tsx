import { useEffect, useMemo, useState } from 'react'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { SelectionActionBar } from '@/components/ui/selection-action-bar'
import { useMultiSelect } from '@/hooks/use-multi-select'
import { useDeleteTransactions } from '@/hooks/use-transactions'
import { dismissHint } from '@/lib/multi-select-hint'
import type { Lookups, Transaction } from '@/lib/types'
import { TransactionCard } from './transaction-card'

interface SelectableTransactionListProps {
  /** Rows to render, already sorted by the caller. */
  transactions: Transaction[]
  lookups: Lookups
  /** Open a row for editing (single-tap when not in selection mode). */
  onOpen: (t: Transaction) => void
  /** Optional per-row account label (shown in the mixed "All accounts" list). */
  getAccountName?: (t: Transaction) => string | undefined
}

/**
 * A transaction list with press-and-hold multi-select. Selection state is owned
 * here, so each mounted list (e.g. one per account column) selects and deletes
 * independently. Outside selection mode a tap opens the row unchanged.
 */
export function SelectableTransactionList({
  transactions,
  lookups,
  onOpen,
  getAccountName,
}: SelectableTransactionListProps) {
  const ids = useMemo(() => transactions.map((t) => t.id), [transactions])
  const sel = useMultiSelect(ids)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const deleteMany = useDeleteTransactions()

  // Discovering the gesture retires the one-time hint everywhere.
  useEffect(() => {
    if (sel.active) dismissHint()
  }, [sel.active])

  function handleConfirmDelete() {
    deleteMany
      .mutateAsync(sel.selectedIds)
      .then(() => {
        setConfirmOpen(false)
        sel.exit()
      })
      .catch(() => setConfirmOpen(false))
  }

  return (
    <div className="space-y-2">
      {sel.active && (
        <SelectionActionBar
          count={sel.selectedIds.length}
          allSelected={sel.allSelected}
          onToggleAll={sel.toggleAll}
          onDelete={() => setConfirmOpen(true)}
          onCancel={sel.exit}
        />
      )}

      {transactions.map((t) => (
        <TransactionCard
          key={t.id}
          transaction={t}
          lookups={lookups}
          accountName={getAccountName?.(t)}
          selectionMode={sel.active}
          selected={sel.isSelected(t.id)}
          // No long-press (and so no hold-fill) once selecting — a tap toggles.
          onLongPress={sel.active ? undefined : () => sel.enter(t.id)}
          onClick={() => (sel.active ? sel.toggle(t.id) : onOpen(t))}
        />
      ))}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${sel.selectedIds.length} ${sel.selectedIds.length === 1 ? 'transaction' : 'transactions'}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        pending={deleteMany.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
