import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Account, Lookups, Transaction, TransactionInput } from '@/lib/types'
import { TransactionForm } from './transaction-form'

interface TransactionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lookups: Lookups
  accounts: Account[]
  editing: Transaction | null
  defaultAccountId: string | null
  submitting?: boolean
  onSubmit: (input: TransactionInput) => void
  onDelete: () => void
}

/** The Add / Edit Transaction bottom sheet. */
export function TransactionSheet({
  open,
  onOpenChange,
  lookups,
  accounts,
  editing,
  defaultAccountId,
  submitting,
  onSubmit,
  onDelete,
}: TransactionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit transaction' : 'Add transaction'}</SheetTitle>
          <SheetDescription>
            {editing ? 'Update or delete this ledger entry.' : 'Log a new ledger entry.'}
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-6">
          <TransactionForm
            key={editing?.id ?? 'new'}
            lookups={lookups}
            accounts={accounts}
            editing={editing}
            defaultAccountId={defaultAccountId}
            submitting={submitting}
            onSubmit={onSubmit}
            onDelete={editing ? onDelete : undefined}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
