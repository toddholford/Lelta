// Theme registry for Lelta. Two dark themes + one light, user-selectable in
// Settings and persisted to localStorage. A tiny inline script in index.html
// applies the stored theme before first paint to avoid a flash.

export type ThemeId = 'teal-dark' | 'ocean' | 'slate-light'

export interface ThemeDef {
  id: ThemeId
  label: string
  description: string
  dark: boolean
  /** Drives <meta name="theme-color"> for the installed PWA chrome. */
  themeColor: string
}

export const THEMES: ThemeDef[] = [
  { id: 'teal-dark', label: 'Midnight Teal', description: 'Near-black + river teal', dark: true, themeColor: '#0b0f10' },
  { id: 'ocean', label: 'Deep Ocean', description: 'Navy blue + teal', dark: true, themeColor: '#0a1420' },
  { id: 'slate-light', label: 'River Slate', description: 'Light slate + teal', dark: false, themeColor: '#eef2f4' },
]

export const DEFAULT_THEME: ThemeId = 'teal-dark'
export const THEME_STORAGE_KEY = 'lelta-theme'

/** Class list applied to <html> for a theme. Light theme uses :root defaults. */
export function themeClass(id: ThemeId): string {
  switch (id) {
    case 'ocean':
      return 'theme-ocean dark'
    case 'slate-light':
      return ''
    default:
      return 'theme-teal-dark dark'
  }
}

export function getStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (THEMES.some((t) => t.id === v)) return v as ThemeId
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME
}

export function applyTheme(id: ThemeId): void {
  const def = THEMES.find((t) => t.id === id) ?? THEMES[0]
  document.documentElement.className = themeClass(def.id)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', def.themeColor)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, def.id)
  } catch {
    /* ignore */
  }
}
