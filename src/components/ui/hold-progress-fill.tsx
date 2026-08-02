import { cn } from '@/lib/utils'

interface HoldProgressFillProps {
  /** True while a hold is in progress — the fill sweeps across over `durationMs`. */
  active: boolean
  durationMs: number
  /** Match the host's corner radius so the fill doesn't spill past rounded edges. */
  className?: string
}

/**
 * Determinate "loading" fill that sweeps a row left-to-right during a
 * press-and-hold, completing exactly as selection mode opens. Absolutely
 * positioned and pointer-transparent, animated via GPU-friendly scaleX.
 */
export function HoldProgressFill({ active, durationMs, className }: HoldProgressFillProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 z-10 origin-left rounded-xl bg-primary',
        className,
      )}
      style={{
        transform: active ? 'scaleX(1)' : 'scaleX(0)',
        transition: active ? `transform ${durationMs}ms linear` : 'none',
      }}
    />
  )
}
