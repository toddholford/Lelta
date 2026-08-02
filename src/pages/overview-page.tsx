import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BalanceTracker } from '@/components/overview/balance-tracker'
import { RecurringPayments } from '@/components/overview/recurring-payments'
import { CalendarView } from '@/components/overview/calendar-view'

type OverviewTab = 'balance' | 'payments' | 'calendar'

const subTabs: { id: OverviewTab; label: string; shortLabel: string }[] = [
  { id: 'balance', label: 'Balance Tracker', shortLabel: 'Balance' },
  { id: 'payments', label: 'Recurring Payments', shortLabel: 'Recurring' },
  { id: 'calendar', label: 'Calendar', shortLabel: 'Calendar' },
]

export function OverviewPage() {
  const [tab, setTab] = useState<OverviewTab>('balance')

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Sub-tab segmented control */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
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
            <span className="sm:hidden">{opt.shortLabel}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        ))}
      </div>

      {tab === 'balance' && <BalanceTracker />}
      {tab === 'payments' && <RecurringPayments />}
      {tab === 'calendar' && <CalendarView />}
    </div>
  )
}
