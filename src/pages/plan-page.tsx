import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryIcon } from '@/components/ledger/category-icon'
import { useLookups } from '@/hooks/use-lookups'
import { useRecurringTemplates } from '@/hooks/use-recurring-templates'
import { formatCents, MONTH_NAMES } from '@/lib/format'
import type { RecurringTemplate } from '@/lib/types'

/** Normalize a template's amount to a per-month figure. */
function monthlyCents(t: RecurringTemplate, freqName: string | undefined): number {
  switch (freqName) {
    case 'weekly':
      return Math.round((t.amount_cents * 52) / 12)
    case 'yearly':
      return Math.round(t.amount_cents / 12)
    default:
      return t.amount_cents
  }
}

export function PlanPage() {
  const lookups = useLookups()
  const templates = useRecurringTemplates()

  const freqName = (id: number) => lookups.data?.frequencies.find((f) => f.id === id)?.name

  const monthlyTotal = useMemo(
    () =>
      (templates.data ?? []).reduce(
        (sum, t) => sum + monthlyCents(t, freqName(t.transaction_frequency_id)),
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templates.data, lookups.data],
  )

  const now = new Date()
  const projection = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return {
      label: `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`,
      total: monthlyTotal, // refine later with per-template end dates & one-offs
    }
  })

  if (templates.isPending || lookups.isPending) {
    return (
      <div className="space-y-3 p-4 md:p-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-lg font-semibold">Plan</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Recurring obligations / month</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums">{formatCents(monthlyTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(templates.data ?? []).length} active recurring templates
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming obligations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(templates.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              No recurring templates yet — add them in Settings.
            </p>
          )}
          {(templates.data ?? []).map((t) => {
            const category = lookups.data?.categories.find(
              (c) => c.id === t.transaction_category_id,
            )
            return (
              <div key={t.id} className="flex items-center gap-3 py-1">
                <CategoryIcon category={category?.name} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.source_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {freqName(t.transaction_frequency_id)} · due day {t.due_day}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{formatCents(t.amount_cents)}</p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6-month projection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {projection.map((p) => (
            <div key={p.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{p.label}</span>
              <span className="font-medium tabular-nums">{formatCents(p.total)}</span>
            </div>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">
            Projection = active recurring templates normalized to monthly. Savings trajectory and
            what-if scenarios are future scope.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
