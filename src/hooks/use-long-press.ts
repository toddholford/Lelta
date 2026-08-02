import * as React from 'react'

export const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 10
// Grace period before the fill appears, so a thumb briefly touching a row while
// scrolling doesn't flicker the animation. A scroll moves/lifts before this
// elapses; a real hold passes it. The fill then sweeps over the remaining time.
const FILL_DELAY_MS = 120
const FILL_MS = LONG_PRESS_MS - FILL_DELAY_MS

export interface LongPressHandlers {
  onPointerDown?: (e: React.PointerEvent) => void
  onPointerMove?: (e: React.PointerEvent) => void
  onPointerUp?: () => void
  onPointerCancel?: () => void
  onPointerLeave?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

/**
 * Press-and-hold detection for touch/mouse. Spread `handlers` onto the element;
 * any real pointer movement cancels the hold so scrolling never triggers it.
 * A completed hold fires `onLongPress` and, because a click still trails a hold
 * on touch, `consumeClick()` returns true once so the caller can swallow it.
 *
 * `pressing` is true for the duration of an active hold — drive a progress
 * affordance (e.g. a sweeping fill) from it over `durationMs`.
 */
export function useLongPress(onLongPress?: () => void): {
  handlers: LongPressHandlers
  consumeClick: () => boolean
  pressing: boolean
  durationMs: number
} {
  const fireTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const fillTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = React.useRef<{ x: number; y: number } | null>(null)
  const fired = React.useRef(false)
  const [pressing, setPressing] = React.useState(false)

  const clearTimers = React.useCallback(() => {
    if (fireTimer.current !== null) {
      clearTimeout(fireTimer.current)
      fireTimer.current = null
    }
    if (fillTimer.current !== null) {
      clearTimeout(fillTimer.current)
      fillTimer.current = null
    }
  }, [])

  const endPress = React.useCallback(() => {
    clearTimers()
    setPressing(false)
  }, [clearTimers])

  // Never leave a timer running past unmount.
  React.useEffect(() => clearTimers, [clearTimers])

  const consumeClick = React.useCallback(() => {
    if (fired.current) {
      fired.current = false
      return true
    }
    return false
  }, [])

  if (!onLongPress) {
    return { handlers: {}, consumeClick, pressing: false, durationMs: FILL_MS }
  }

  const handlers: LongPressHandlers = {
    onPointerDown: (e) => {
      start.current = { x: e.clientX, y: e.clientY }
      fired.current = false
      clearTimers()
      // Hold briefly before the fill shows — scrolling cancels it first.
      fillTimer.current = setTimeout(() => setPressing(true), FILL_DELAY_MS)
      fireTimer.current = setTimeout(() => {
        fired.current = true
        setPressing(false)
        onLongPress()
      }, LONG_PRESS_MS)
    },
    onPointerMove: (e) => {
      if (!start.current) return
      if (
        Math.abs(e.clientX - start.current.x) > MOVE_CANCEL_PX ||
        Math.abs(e.clientY - start.current.y) > MOVE_CANCEL_PX
      ) {
        endPress()
      }
    },
    onPointerUp: endPress,
    onPointerCancel: endPress,
    onPointerLeave: endPress,
    // Suppress the native long-press callout / context menu.
    onContextMenu: (e) => e.preventDefault(),
  }

  return { handlers, consumeClick, pressing, durationMs: FILL_MS }
}
