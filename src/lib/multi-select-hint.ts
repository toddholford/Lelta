// One-time discoverability hint for press-and-hold multi-select. Shared across
// every list that supports the gesture, so learning it anywhere retires the tip
// everywhere.

const KEY = 'multiselect-hint-dismissed'
const EVENT = 'multiselect-hint-dismissed'

export function isHintDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Retire the hint permanently and notify any mounted hint to hide immediately. */
export function dismissHint(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // Ignore storage failures (private mode, etc.) — the tip just reappears.
  }
  window.dispatchEvent(new Event(EVENT))
}

export function onHintDismissed(listener: () => void): () => void {
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
