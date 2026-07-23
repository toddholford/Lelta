import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatCents, parseDollarsToCents, todayISO } from '@/lib/format'
import type { Account, Lookups, Transaction, TransactionInput } from '@/lib/types'

interface TransactionFormProps {
  lookups: Lookups
  accounts: Account[]
  /** When set, the form edits this transaction; otherwise it creates. */
  editing?: Transaction | null
  /** Preselected account (from the ledger's account filter). */
  defaultAccountId?: string | null
  submitting?: boolean
  onSubmit: (input: TransactionInput) => void
  onDelete?: () => void
}

export function TransactionForm({
  lookups,
  accounts,
  editing,
  defaultAccountId,
  submitting,
  onSubmit,
  onDelete,
}: TransactionFormProps) {
  const [typeId, setTypeId] = useState<number>(editing?.transaction_type_id ?? 3)
  const [categoryId, setCategoryId] = useState<number | ''>(editing?.transaction_category_id ?? '')
  const [frequencyId, setFrequencyId] = useState<number | ''>(editing?.transaction_frequency_id ?? '')
  const [accountId, setAccountId] = useState<string>(
    editing?.account_id ?? defaultAccountId ?? accounts[0]?.id ?? '',
  )
  const [source, setSource] = useState(editing?.source_name ?? '')
  const [date, setDate] = useState(editing?.txn_date ?? todayISO())
  const [dueDate, setDueDate] = useState(editing?.due_date ?? '')
  const [amount, setAmount] = useState(
    editing ? (editing.amount_cents / 100).toFixed(2) : '',
  )
  const [note, setNote] = useState(editing?.note ?? '')
  const [error, setError] = useState('')

  // Category options filter by the selected Type.
  const categoryOptions = useMemo(
    () => lookups.categories.filter((c) => c.transaction_type_id === typeId),
    [lookups.categories, typeId],
  )

  // Keep category valid when the type changes.
  useEffect(() => {
    if (categoryId === '' || !categoryOptions.some((c) => c.id === categoryId)) {
      setCategoryId(categoryOptions[0]?.id ?? '')
    }
  }, [categoryOptions, categoryId])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const cents = parseDollarsToCents(amount)
    if (cents === null || cents === 0) {
      setError('Enter a valid amount, e.g. 12.34')
      return
    }
    if (!accountId || categoryId === '') {
      setError('Pick an account and category')
      return
    }
    setError('')
    onSubmit({
      account_id: accountId,
      transaction_type_id: typeId,
      transaction_category_id: categoryId,
      transaction_frequency_id: frequencyId === '' ? null : frequencyId,
      source_name: source.trim(),
      txn_date: date,
      due_date: dueDate || null,
      amount_cents: cents,
      note: note.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="txn-type">Type</Label>
          <Select
            id="txn-type"
            value={typeId}
            onChange={(e) => setTypeId(Number(e.target.value))}
          >
            {lookups.types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="txn-category">Category</Label>
          <Select
            id="txn-category"
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
          >
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="txn-account">Account</Label>
          <Select
            id="txn-account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="txn-frequency">Frequency</Label>
          <Select
            id="txn-frequency"
            value={frequencyId}
            onChange={(e) =>
              setFrequencyId(e.target.value === '' ? '' : Number(e.target.value))
            }
          >
            <option value="">one-off</option>
            {lookups.frequencies.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="txn-source">Source</Label>
        <Input
          id="txn-source"
          required
          placeholder="e.g. Kroger"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="txn-date">Date</Label>
          <Input
            id="txn-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="txn-due">Due date</Label>
          <Input
            id="txn-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="txn-amount">Amount</Label>
        <Input
          id="txn-amount"
          inputMode="decimal"
          required
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {amount && parseDollarsToCents(amount) !== null && (
          <p className="text-xs text-muted-foreground">
            = {formatCents(parseDollarsToCents(amount)!)}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="txn-note">Note</Label>
        <Textarea
          id="txn-note"
          rows={2}
          placeholder="Optional"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-2">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add transaction'}
        </Button>
        {editing && onDelete && (
          <Button type="button" variant="destructive" onClick={onDelete} disabled={submitting}>
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}
