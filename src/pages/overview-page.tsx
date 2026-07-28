import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BalanceTracker } from '@/components/overview/balance-tracker'
import { MonthlyPayments } from '@/components/overview/monthly-payments'
import { CalendarView } from '@/components/overview/calendar-view'

type OverviewTab = 'balance' | 'payments' | 'calendar'

const subTabs: { id: OverviewTab; label: string }[] = [
  { id: 'balance', label: 'Balance Tracker' },
  { id: 'payments', label: 'Monthly Payments' },
  { id: 'calendar', label: 'Calendar' },
]

export function OverviewPage() {
  const [tab, setTab] = useState<OverviewTab>('balance')

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Overview</h1>
      </div>

      {/* Sub-tab segmented control */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {subTabs.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTab(opt.id)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === opt.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {tab === 'balance' && <BalanceTracker />}
      {tab === 'payments' && <MonthlyPayments />}
      {tab === 'calendar' && <CalendarView />}
    </div>
  )
}
