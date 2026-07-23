import { cn } from '@/lib/utils'

export type LedgerView = 'cash' | 'credit'

interface LedgerViewToggleProps {
  value: LedgerView
  onChange: (view: LedgerView) => void
}

/** Top-level segmented control that keeps cash and credit accounts apart. */
export function LedgerViewToggle({ value, onChange }: LedgerViewToggleProps) {
  const options: { id: LedgerView; label: string }[] = [
    { id: 'cash', label: 'Cash' },
    { id: 'credit', label: 'Credit' },
  ]

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === opt.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
