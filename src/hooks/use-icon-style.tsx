import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import {
  getStoredIconStyle,
  persistIconStyle,
  type IconStyle,
} from '@/lib/icon-style'

interface IconStyleState {
  /** How CategoryIcon renders: filled icon, colored circle, empty circle, or hidden. */
  iconStyle: IconStyle
  setIconStyle: (style: IconStyle) => void
}

const IconStyleContext = createContext<IconStyleState | null>(null)

/**
 * Transaction-avatar style preference. Lives above the routed pages so every
 * CategoryIcon (ledger rows, calendar, recurring payments) reacts instantly
 * when the setting changes. Persisted to localStorage.
 */
export function IconStyleProvider({ children }: { children: ReactNode }) {
  const [iconStyle, setState] = useState<IconStyle>(getStoredIconStyle)

  const setIconStyle = useCallback((style: IconStyle) => {
    setState(style)
    persistIconStyle(style)
  }, [])

  return (
    <IconStyleContext.Provider value={{ iconStyle, setIconStyle }}>
      {children}
    </IconStyleContext.Provider>
  )
}

export function useIconStyle() {
  const ctx = useContext(IconStyleContext)
  if (!ctx) throw new Error('useIconStyle must be used within an IconStyleProvider')
  return ctx
}
