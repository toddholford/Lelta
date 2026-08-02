import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import {
  getStoredGuidance,
  persistGuidance,
  type GuidanceMode,
} from '@/lib/guidance'

interface GuidanceState {
  /** How strictly Lelta limits account structure: 'guided' or 'none'. */
  guidance: GuidanceMode
  setGuidance: (mode: GuidanceMode) => void
}

const GuidanceContext = createContext<GuidanceState | null>(null)

/**
 * Guidance preference — controls the per-type account limits enforced when
 * adding accounts. Lives above the routed pages so Settings (and any future
 * account entry point) share one source of truth. Persisted to localStorage.
 */
export function GuidanceProvider({ children }: { children: ReactNode }) {
  const [guidance, setState] = useState<GuidanceMode>(getStoredGuidance)

  const setGuidance = useCallback((mode: GuidanceMode) => {
    setState(mode)
    persistGuidance(mode)
  }, [])

  return (
    <GuidanceContext.Provider value={{ guidance, setGuidance }}>
      {children}
    </GuidanceContext.Provider>
  )
}

export function useGuidance() {
  const ctx = useContext(GuidanceContext)
  if (!ctx) throw new Error('useGuidance must be used within a GuidanceProvider')
  return ctx
}
