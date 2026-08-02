import * as React from 'react'

export const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 10

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
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = React.useRef<{ x: number; y: number } | null>(null)
  const fired = React.useRef(false)
  const [pressing, setPressing] = React.useState(false)

  const clearTimer = React.useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const endPress = React.useCallback(() => {
    clearTimer()
    setPressing(false)
  }, [clearTimer])

  // Never leave a timer running past unmount.
  React.useEffect(() => clearTimer, [clearTimer])

  const consumeClick = React.useCallback(() => {
    if (fired.current) {
      fired.current = false
      return true
    }
    return false
  }, [])

  if (!onLongPress) {
    return { handlers: {}, consumeClick, pressing: false, durationMs: LONG_PRESS_MS }
  }

  const handlers: LongPressHandlers = {
    onPointerDown: (e) => {
      start.current = { x: e.clientX, y: e.clientY }
      fired.current = false
      clearTimer()
      setPressing(true)
      timer.current = setTimeout(() => {
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

  return { handlers, consumeClick, pressing, durationMs: LONG_PRESS_MS }
}
