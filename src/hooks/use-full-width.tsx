import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'lelta-full-width'

function getStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function persist(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

interface FullWidthState {
  /** When true, the app drops its centred max-width and stretches edge-to-edge. */
  fullWidth: boolean
  setFullWidth: (on: boolean) => void
  toggle: () => void
}

const FullWidthContext = createContext<FullWidthState | null>(null)

/**
 * Full-width layout preference. On wide desktop displays, turning this on lets
 * content use the whole viewport — e.g. every account sitting in its own column
 * on the Overview. Persisted to localStorage; ignored effectively on mobile,
 * which is already full-bleed. Lives above the AppShell so the shell container
 * and routed pages both react to it.
 */
export function FullWidthProvider({ children }: { children: ReactNode }) {
  const [fullWidth, setState] = useState<boolean>(getStored)

  const setFullWidth = useCallback((on: boolean) => {
    setState(on)
    persist(on)
  }, [])

  const toggle = useCallback(() => {
    setState((prev) => {
      const next = !prev
      persist(next)
      return next
    })
  }, [])

  return (
    <FullWidthContext.Provider value={{ fullWidth, setFullWidth, toggle }}>
      {children}
    </FullWidthContext.Provider>
  )
}

export function useFullWidth() {
  const ctx = useContext(FullWidthContext)
  if (!ctx) throw new Error('useFullWidth must be used within a FullWidthProvider')
  return ctx
}
