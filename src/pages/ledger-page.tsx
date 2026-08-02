import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthSelector } from '@/components/ledger/month-selector'
import { LedgerViewToggle, type LedgerView } from '@/components/ledger/ledger-view-toggle'
import { AccountSwitcher } from '@/components/ledger/account-switcher'
import { AccountColumn } from '@/components/ledger/account-column'
import { StatTiles } from '@/components/ledger/stat-tiles'
import { SelectableTransactionList } from '@/components/ledger/selectable-transaction-list'
import { MultiSelectHint } from '@/components/ui/multi-select-hint'
import { TransactionForm } from '@/components/ledger/transaction-form'
import { TransactionSheet } from '@/components/ledger/transaction-sheet'
import { useAccounts } from '@/hooks/use-accounts'
import { useLookups } from '@/hooks/use-lookups'
import { useMonth } from '@/hooks/use-month'
import { useFullWidth } from '@/hooks/use-full-width'
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '@/hooks/use-transactions'
import type { Transaction, TransactionInput } from '@/lib/types'

export function LedgerPage() {
  const { year, month, setMonth } = useMonth()
  const { fullWidth } = useFullWidth()
  const [view, setView] = useState<LedgerView>('cash')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const lookups = useLookups()
  const accounts = useAccounts()
  // Full-width mode shows every account as its own column, so it always needs
  // the whole month regardless of any previously selected account tab.
  const transactions = useTransactions({ year, month, accountId: fullWidth ? null : accountId })
  const createTxn = useCreateTransaction()
  const updateTxn = useUpdateTransaction()
  const deleteTxn = useDeleteTransaction()

  const accountNameById = useMemo(
    () => new Map((accounts.data ?? []).map((a) => [a.id, a.institution])),
    [accounts.data],
  )

  // Cash vs credit is derived from the account's type. Accounts (and their
  // transactions) whose account_type is 'credit' belong to the Credit view.
  const creditAccountIds = useMemo(() => {
    const creditTypeIds = new Set(
      (lookups.data?.accountTypes ?? []).filter((t) => t.name === 'credit').map((t) => t.id),
    )
    return new Set(
      (accounts.data ?? []).filter((a) => creditTypeIds.has(a.account_type_id)).map((a) => a.id),
    )
  }, [lookups.data, accounts.data])

  // Accounts belonging to the active view — feeds the switcher and the forms so
  // the two sides never mix.
  const viewAccounts = useMemo(
    () =>
      (accounts.data ?? []).filter(
        (a) => creditAccountIds.has(a.id) === (view === 'credit'),
      ),
    [accounts.data, creditAccountIds, view],
  )

  // Transactions narrowed to the active view. When a single account is selected
  // the server already returns just that account, so this is a no-op then.
  const visibleTransactions = useMemo(
    () =>
      (transactions.data ?? []).filter(
        (t) => creditAccountIds.has(t.account_id) === (view === 'credit'),
      ),
    [transactions.data, creditAccountIds, view],
  )

  // Group the visible transactions by account for the full-width column layout.
  const txnsByAccount = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of visibleTransactions) {
      const arr = map.get(t.account_id)
      if (arr) arr.push(t)
      else map.set(t.account_id, [t])
    }
    return map
  }, [visibleTransactions])

  function handleViewChange(next: LedgerView) {
    setView(next)
    setAccountId(null)
  }

  const submitting = createTxn.isPending || updateTxn.isPending || deleteTxn.isPending

  function handleSubmit(input: TransactionInput) {
    const mutation = editing
      ? updateTxn.mutateAsync({ id: editing.id, input })
      : createTxn.mutateAsync(input)
    mutation.then(() => {
      setSheetOpen(false)
      setEditing(null)
    })
  }

  function handleDelete() {
    if (!editing) return
    deleteTxn.mutateAsync(editing.id).then(() => {
      setSheetOpen(false)
      setEditing(null)
    })
  }

  function openAdd() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setSheetOpen(true)
  }

  const loading = lookups.isPending || accounts.isPending || transactions.isPending
  const loadError = lookups.error ?? accounts.error ?? transactions.error

  return (
    <div className="md:grid md:grid-cols-[320px_1fr] md:gap-6 md:px-6 md:py-6">
      {/* Desktop-only inline form pane */}
      <aside className="hidden md:block">
        {lookups.data && accounts.data && (
          <Card>
            <CardHeader>
              <CardTitle>Add transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionForm
                key={`desktop-${view}-${createTxn.isSuccess ? createTxn.submittedAt : 'new'}`}
                lookups={lookups.data}
                accounts={viewAccounts}
                defaultAccountId={accountId}
                submitting={createTxn.isPending}
                onSubmit={(input) => createTxn.mutate(input)}
              />
            </CardContent>
          </Card>
        )}
      </aside>

      <div>
        {/* Pinned selectors */}
        {/* Sticks just below the mobile brand bar (h-14 + top safe inset); static on desktop. */}
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-30 space-y-3 bg-background/95 px-4 pb-3 pt-3 backdrop-blur md:static md:top-0 md:px-0 md:pt-0">
          <LedgerViewToggle value={view} onChange={handleViewChange} />
          <MonthSelector year={year} month={month} onChange={setMonth} />
          {/* Columns replace the account tabs in full-width mode. */}
          {!fullWidth && (
            <AccountSwitcher
              accounts={viewAccounts}
              selectedId={accountId}
              onChange={setAccountId}
            />
          )}
        </div>

        <div className="space-y-4 px-4 pt-1 md:px-0">
          <StatTiles transactions={visibleTransactions} lookups={lookups.data} />

          {loadError && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Failed to load: {loadError.message}
            </p>
          )}

          {!loading && visibleTransactions.length > 0 && <MultiSelectHint />}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : fullWidth && lookups.data ? (
            <div className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
              {viewAccounts.map((a) => (
                <AccountColumn
                  key={a.id}
                  account={a}
                  transactions={txnsByAccount.get(a.id) ?? []}
                  lookups={lookups.data!}
                  onOpen={openEdit}
                />
              ))}
              {viewAccounts.length === 0 && (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  {view === 'credit' ? 'No credit-card accounts yet.' : 'No cash accounts yet.'}
                </div>
              )}
            </div>
          ) : visibleTransactions.length > 0 && lookups.data ? (
            <SelectableTransactionList
              transactions={visibleTransactions}
              lookups={lookups.data}
              onOpen={openEdit}
              getAccountName={
                accountId ? undefined : (t) => accountNameById.get(t.account_id)
              }
            />
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {view === 'credit'
                ? 'No credit-card entries this month yet.'
                : 'No transactions this month yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Floating add button (mobile) */}
      <Button
        size="icon"
        aria-label="Add transaction"
        onClick={openAdd}
        className="fixed bottom-20 right-4 z-40 size-14 rounded-full shadow-lg md:hidden"
      >
        <Plus className="size-6" />
      </Button>

      {lookups.data && accounts.data && (
        <TransactionSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open)
            if (!open) setEditing(null)
          }}
          lookups={lookups.data}
          accounts={viewAccounts}
          editing={editing}
          defaultAccountId={accountId}
          submitting={submitting}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
