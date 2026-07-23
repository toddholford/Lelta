import { formatCents, todayISO } from '@/lib/format'
import type { Transaction } from '@/lib/types'
import { Card } from '@/components/ui/card'

interface StatTilesProps {
  transactions: Transaction[]
}

export function StatTiles({ transactions }: StatTilesProps) {
  const total = transactions.reduce((sum, t) => sum + t.amount_cents, 0)

  const today = todayISO()
  const soonCutoff = (() => {
    const [y, m, d] = today.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d + 7))
    return dt.toISOString().slice(0, 10)
  })()
  const dueSoon = transactions.filter(
    (t) => t.due_date && t.due_date >= today && t.due_date <= soonCutoff,
  )
  const dueSoonTotal = dueSoon.reduce((sum, t) => sum + t.amount_cents, 0)

  const tiles = [
    { label: 'Month total', value: formatCents(total) },
    { label: 'Entries', value: String(transactions.length) },
    {
      label: 'Bills due soon',
      value: dueSoon.length ? formatCents(dueSoonTotal) : '—',
      sub: dueSoon.length ? `${dueSoon.length} due in 7 days` : 'nothing due',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map((tile) => (
        <Card key={tile.label} className="p-3">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {tile.label}
          </p>
          <p className="mt-1 truncate text-lg font-semibold tabular-nums">{tile.value}</p>
          {tile.sub && <p className="truncate text-[11px] text-muted-foreground">{tile.sub}</p>}
        </Card>
      ))}
    </div>
  )
}
