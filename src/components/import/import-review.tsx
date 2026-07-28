import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccounts } from '@/hooks/use-accounts'
import { useLookups } from '@/hooks/use-lookups'
import { useCommitImport, useImportRows, type CommitPayload } from '@/hooks/use-import'
import { formatShortDate, formatSignedCents, parseDollarsToCents } from '@/lib/format'
import { isIncomeType } from '@/lib/txn'
import { cn } from '@/lib/utils'
import type { ImportRow, Lookups, StatementImport } from '@/lib/types'

interface RowDraft {
  include: boolean
  source: string
  date: string
  amount: string
  categoryId: number | ''
}

function draftFromRow(row: ImportRow): RowDraft {
  return {
    include: true,
    source: row.parsed_source_name ?? '',
    date: row.parsed_date ?? '',
    amount: row.parsed_amount_cents != null ? (row.parsed_amount_cents / 100).toFixed(2) : '',
    categoryId: row.suggested_category_id ?? '',
  }
}

/** True when the draft differs from what the parser produced. */
function isEdited(row: ImportRow, d: RowDraft): boolean {
  return (
    d.source !== (row.parsed_source_name ?? '') ||
    d.date !== (row.parsed_date ?? '') ||
    parseDollarsToCents(d.amount) !== row.parsed_amount_cents ||
    (d.categoryId === '' ? null : d.categoryId) !== row.suggested_category_id
  )
}

interface ImportReviewProps {
  imp: StatementImport
  onBack: () => void
}

/**
 * Review the parsed rows of one statement, edit as needed, then commit the
 * kept rows into the ledger. Unchecked rows are marked rejected and never
 * touch the ledger.
 */
export function ImportReview({ imp, onBack }: ImportReviewProps) {
  const rows = useImportRows(imp.id)
  const lookups = useLookups()
  const accounts = useAccounts()
  const commit = useCommitImport()

  const account = accounts.data?.find((a) => a.id === imp.account_id)

  const pending = useMemo(
    () => (rows.data ?? []).filter((r) => r.status === 'pending'),
    [rows.data],
  )
  const resolved = useMemo(
    () => (rows.data ?? []).filter((r) => r.status !== 'pending'),
    [rows.data],
  )

  // One editable draft per pending row, keyed by row id.
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({})
  const draftFor = (row: ImportRow) => drafts[row.id] ?? draftFromRow(row)
  const setDraft = (id: string, patch: Partial<RowDraft>) =>
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? draftFromRow(pending.find((r) => r.id === id)!)), ...patch },
    }))

  const [error, setError] = useState('')

  if (rows.isLoading || lookups.isLoading) {
    return (
      <div className="space-y-3">
        <BackBar account={account?.name} onBack={onBack} />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  // Parsing hasn't produced rows yet (Edge Function still running or it failed).
  if (!rows.data?.length) {
    return (
      <div className="space-y-4">
        <BackBar account={account?.name} onBack={onBack} />
        <div
          className={cn(
            'rounded-xl border border-dashed p-8 text-center text-sm',
            imp.status === 'failed' ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {imp.status === 'pending' || imp.status === 'parsing' ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Parsing statement…
            </span>
          ) : imp.status === 'failed' ? (
            imp.error || 'Parsing failed for this statement.'
          ) : (
            'No transactions were found in this statement.'
          )}
        </div>
      </div>
    )
  }

  const includedCount = pending.filter((r) => draftFor(r).include).length

  function handleCommit() {
    const lk = lookups.data as Lookups
    const commits: CommitPayload[] = []
    const rejects: string[] = []

    for (const row of pending) {
      const d = draftFor(row)
      if (!d.include) {
        rejects.push(row.id)
        continue
      }
      const cents = parseDollarsToCents(d.amount)
      if (cents === null || cents === 0 || !d.date || d.categoryId === '' || !d.source.trim()) {
        setError('Fix the highlighted rows — each imported row needs a source, date, amount, and category.')
        return
      }
      const category = lk.categories.find((c) => c.id === d.categoryId)
      if (!category) {
        setError('Pick a valid category for every imported row.')
        return
      }
      commits.push({
        rowId: row.id,
        edited: isEdited(row, d),
        input: {
          account_id: imp.account_id,
          transaction_type_id: category.transaction_type_id,
          transaction_category_id: category.id,
          transaction_frequency_id: null,
          source_name: d.source.trim(),
          txn_date: d.date,
          due_date: null,
          amount_cents: cents,
          note: null,
        },
      })
    }

    setError('')
    commit.mutate(
      { importId: imp.id, commits, rejects, markCommitted: true },
      { onSuccess: onBack },
    )
  }

  return (
    <div className="space-y-4">
      <BackBar account={account?.name} onBack={onBack} />

      {resolved.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {resolved.filter((r) => r.status !== 'rejected').length} already committed ·{' '}
          {resolved.filter((r) => r.status === 'rejected').length} skipped
        </p>
      )}

      {pending.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Every row in this statement has been reviewed.
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {pending.map((row) => {
              const d = draftFor(row)
              return (
                <RowCard
                  key={row.id}
                  draft={d}
                  lookups={lookups.data as Lookups}
                  onChange={(patch) => setDraft(row.id, patch)}
                />
              )
            })}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="sticky bottom-0 -mx-4 border-t bg-background/95 p-4 backdrop-blur md:mx-0 md:rounded-xl md:border">
            <Button
              size="lg"
              className="w-full"
              onClick={handleCommit}
              disabled={commit.isPending || includedCount === 0}
            >
              {commit.isPending ? (
                <>
                  <Loader2 className="animate-spin" /> Committing…
                </>
              ) : (
                <>
                  <Check /> Commit {includedCount} to ledger
                </>
              )}
            </Button>
            {commit.isError && (
              <p className="mt-2 text-center text-sm text-destructive">
                {(commit.error as Error).message}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function BackBar({ account, onBack }: { account?: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to imports">
        <ArrowLeft />
      </Button>
      <div>
        <p className="text-sm font-medium">Review parsed rows</p>
        {account && <p className="text-xs text-muted-foreground">{account}</p>}
      </div>
    </div>
  )
}

interface RowCardProps {
  draft: RowDraft
  lookups: Lookups
  onChange: (patch: Partial<RowDraft>) => void
}

function RowCard({ draft, lookups, onChange }: RowCardProps) {
  const cents = parseDollarsToCents(draft.amount)
  const amountValid = cents !== null && cents !== 0
  const category = lookups.categories.find((c) => c.id === draft.categoryId)
  const income = category ? isIncomeType(category.transaction_type_id, lookups) : false

  return (
    <div
      className={cn(
        'rounded-xl border p-3 transition-colors',
        draft.include ? 'bg-card' : 'bg-muted/40 opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={draft.include}
          onChange={(e) => onChange({ include: e.target.checked })}
          className="mt-1 size-4 shrink-0 accent-primary"
          aria-label="Import this row"
        />
        <div className="grid flex-1 gap-2">
          <Input
            value={draft.source}
            placeholder="Source / payee"
            onChange={(e) => onChange({ source: e.target.value })}
          />
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              type="date"
              className="min-w-0 px-2 text-sm"
              value={draft.date}
              onChange={(e) => onChange({ date: e.target.value })}
            />
            <div className="grid gap-0.5">
              <Input
                inputMode="decimal"
                placeholder="0.00"
                className={cn('w-28 text-right', !amountValid && draft.include && 'border-destructive')}
                value={draft.amount}
                onChange={(e) => onChange({ amount: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="sr-only">Category</Label>
            <Select
              value={draft.categoryId}
              onChange={(e) =>
                onChange({ categoryId: e.target.value === '' ? '' : Number(e.target.value) })
              }
            >
              <option value="">Uncategorized…</option>
              {lookups.types.map((t) => (
                <optgroup key={t.id} label={t.name}>
                  {lookups.categories
                    .filter((c) => c.transaction_type_id === t.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </div>
        </div>
      </div>
      {draft.include && amountValid && (
        <p className="mt-1.5 pl-7 text-xs text-muted-foreground">
          {draft.date && `${formatShortDate(draft.date)} · `}
          <span className={cn(income && 'text-emerald-600 dark:text-emerald-400')}>
            {formatSignedCents(cents!, income)} {income ? 'income' : 'outflow'}
          </span>
        </p>
      )}
    </div>
  )
}
