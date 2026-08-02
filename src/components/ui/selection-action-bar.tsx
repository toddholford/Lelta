import { CheckCheck, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectionActionBarProps {
  count: number
  allSelected: boolean
  onToggleAll: () => void
  onDelete: () => void
  onCancel: () => void
  className?: string
}

/** Contextual bar shown above a list in multi-select mode: count + actions. */
export function SelectionActionBar({
  count,
  allSelected,
  onToggleAll,
  onDelete,
  onCancel,
  className,
}: SelectionActionBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2',
        className,
      )}
    >
      <span className="text-sm font-medium tabular-nums">{count} selected</span>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleAll}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <CheckCheck className="size-4" />
          {allSelected ? 'Clear' : 'All'}
        </button>
        <button
          type="button"
          disabled={count === 0}
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-40"
        >
          <Trash2 className="size-4" />
          Delete
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel selection"
          className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
