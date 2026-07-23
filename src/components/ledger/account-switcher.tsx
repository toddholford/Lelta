import { cn } from '@/lib/utils'
import type { Account } from '@/lib/types'

interface AccountSwitcherProps {
  accounts: Account[]
  selectedId: string | null // null = all accounts
  onChange: (id: string | null) => void
}

/** Segmented control across the household's accounts (Billing / Spending / …). */
export function AccountSwitcher({ accounts, selectedId, onChange }: AccountSwitcherProps) {
  const options: { id: string | null; label: string }[] = [
    { id: null, label: 'All' },
    ...accounts.map((a) => ({ id: a.id as string | null, label: a.institution })),
  ]

  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 [scrollbar-width:none]">
      {options.map((opt) => (
        <button
          key={opt.id ?? 'all'}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            selectedId === opt.id
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
