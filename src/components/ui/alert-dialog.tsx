import * as React from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Styles the confirm button as a destructive action. */
  destructive?: boolean
  /** Disables the buttons while an async confirm is in flight. */
  pending?: boolean
  onConfirm: () => void
}

/**
 * Lightweight centered confirmation modal — the destructive-action convention,
 * built without extra deps to match this codebase's hand-rolled UI layer.
 * Focus lands on the confirm button; Escape and backdrop clicks cancel.
 */
export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  pending,
  onConfirm,
}: AlertDialogProps) {
  const confirmRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onOpenChange(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, pending, onOpenChange])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !pending && onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border bg-background p-5 shadow-lg">
        <h2 id="alert-dialog-title" className="text-lg font-semibold">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
