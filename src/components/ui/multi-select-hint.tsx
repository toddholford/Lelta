import { useEffect, useState } from 'react'
import { Pointer, X } from 'lucide-react'
import { dismissHint, isHintDismissed, onHintDismissed } from '@/lib/multi-select-hint'

/**
 * One-time tip teaching the press-and-hold multi-select gesture. Renders until
 * the user dismisses it or discovers the gesture (which calls `dismissHint`
 * elsewhere). Render it above any list that supports selection.
 */
export function MultiSelectHint() {
  const [dismissed, setDismissed] = useState(isHintDismissed)

  useEffect(() => onHintDismissed(() => setDismissed(true)), [])

  if (dismissed) return null

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      <Pointer className="size-4 shrink-0" />
      <span>Tip: press and hold an item to select several at once.</span>
      <button
        type="button"
        onClick={() => {
          dismissHint()
          setDismissed(true)
        }}
        aria-label="Dismiss tip"
        className="ml-auto inline-flex shrink-0 items-center justify-center rounded-md p-0.5 transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
