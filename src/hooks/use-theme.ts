import { useCallback, useState } from 'react'
import { applyTheme, getStoredTheme, type ThemeId } from '@/lib/theme'

/** Read + set the active theme. Persists and re-applies on change. */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(getStoredTheme)
  const setTheme = useCallback((id: ThemeId) => {
    applyTheme(id)
    setThemeState(id)
  }, [])
  return { theme, setTheme }
}
