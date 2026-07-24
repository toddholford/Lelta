import { createContext, useContext, useState, type ReactNode } from 'react'

interface MonthState {
  year: number
  /** 0-based month, matching the rest of the app (Date.getMonth, LedgerFilter). */
  month: number
  setMonth: (year: number, month: number) => void
}

const MonthContext = createContext<MonthState | null>(null)

/**
 * Holds the currently viewed (year, month) so it's shared across tabs — switch
 * months on the Ledger and the Overview reflects it, and vice versa. Lives in
 * the AppShell, which stays mounted while the routed page (Outlet) changes.
 */
export function MonthProvider({ children }: { children: ReactNode }) {
  const now = new Date()
  const [state, setState] = useState({ year: now.getFullYear(), month: now.getMonth() })
  return (
    <MonthContext.Provider
      value={{ ...state, setMonth: (year, month) => setState({ year, month }) }}
    >
      {children}
    </MonthContext.Provider>
  )
}

export function useMonth() {
  const ctx = useContext(MonthContext)
  if (!ctx) throw new Error('useMonth must be used within a MonthProvider')
  return ctx
}
