import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCents, parseDollarsToCents } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Account } from '@/lib/types'

interface AccountOverviewCardProps {
  account: Account
  /** Starting balance for the month in cents, or null if not set yet. */
  startingCents: number | null
  /** Total spent from this account this month, in cents. */
  spentCents: number
  /** Total income gained into this account this month, in cents. */
  gainedCents: number
  entries: number
  /** Credit cards have no cash balance — show charged-this-month instead. */
  isCredit: boolean
  saving: boolean
  onSetStarting: (cents: number) => void
}

export function AccountOverviewCard({
  account,
  startingCents,
  spentCents,
  gainedCents,
  entries,
  isCredit,
  saving,
  onSetStarting,
}: AccountOverviewCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function openEdit() {
    setDraft(startingCents != null ? (startingCents / 100).toFixed(2) : '')
    setEditing(true)
  }

  function save() {
    const cents = parseDollarsToCents(draft)
    if (cents == null || cents < 0) return
    onSetStarting(cents)
    setEditing(false)
  }

  // Credit cards: no starting balance, just what's been charged this month.
  if (isCredit) {
    return (
      <Card className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{account.institution}</p>
            <p className="truncate text-xs text-muted-foreground">{account.name}</p>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Credit
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums">{formatCents(spentCents)}</p>
        <p className="text-xs text-muted-foreground">
          charged this month · {entries} {entries === 1 ? 'entry' : 'entries'}
        </p>
      </Card>
    )
  }

  const hasStarting = startingCents != null
  // Cash left = starting + income gained − spent.
  const remaining = hasStarting ? startingCents + gainedCents - spentCents : null
  const pct = hasStarting && startingCents > 0 ? Math.min(spentCents / startingCents, 1) : 0
  const overspent = remaining != null && remaining < 0

  const meterColor = overspent
    ? 'bg-destructive'
    : pct >= 0.9
      ? 'bg-destructive'
      : pct >= 0.7
        ? 'bg-amber-500'
        : 'bg-primary'

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{account.institution}</p>
          <p className="truncate text-xs text-muted-foreground">{account.name}</p>
        </div>
        {account.is_hub && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
            Hub
          </span>
        )}
      </div>

      {/* Remaining — the headline number */}
      {hasStarting ? (
        <>
          <p
            className={cn(
              'mt-3 text-2xl font-bold tabular-nums',
              overspent && 'text-destructive',
            )}
          >
            {formatCents(remaining as number)}
          </p>
          <p className="text-xs text-muted-foreground">
            {overspent ? 'over the starting balance' : 'remaining this month'}
            {gainedCents > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">
                {' · '}+{formatCents(gainedCents)} gained
              </span>
            )}
          </p>

          {/* Drain meter */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all', meterColor)}
              style={{ width: `${Math.max(pct, 0.02) * 100}%` }}
            />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No starting balance set for this month.
          {gainedCents > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              {' '}
              <span className="tabular-nums">+{formatCents(gainedCents)}</span> gained.
            </span>
          )}
        </p>
      )}

      {/* Starting balance + spent row */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Started with
          </p>
          {editing ? (
            <div className="mt-1 flex items-center gap-1">
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  autoFocus
                  inputMode="decimal"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') save()
                    if (e.key === 'Escape') setEditing(false)
                  }}
                  placeholder="0.00"
                  className="h-8 w-24 pl-5 text-sm"
                />
              </div>
              <Button
                size="icon"
                className="size-8"
                aria-label="Save starting balance"
                disabled={saving || parseDollarsToCents(draft) == null}
                onClick={save}
              >
                <Check className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label="Cancel"
                onClick={() => setEditing(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openEdit}
              className="mt-0.5 flex items-center gap-1.5 text-sm font-medium tabular-nums hover:text-primary"
            >
              {hasStarting ? formatCents(startingCents as number) : 'Set'}
              <Pencil className="size-3 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Spent
          </p>
          <p className="mt-0.5 text-sm font-medium tabular-nums">{formatCents(spentCents)}</p>
          <p className="text-[11px] text-muted-foreground">
            {entries} {entries === 1 ? 'entry' : 'entries'}
          </p>
        </div>
      </div>
    </Card>
  )
}
