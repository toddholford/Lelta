// Theme registry for Lelta. Two dark themes + one light, user-selectable in
// Settings and persisted to localStorage. A tiny inline script in index.html
// applies the stored theme before first paint to avoid a flash.

export type ThemeId = 'brand' | 'teal-dark' | 'ocean' | 'slate-light'

export interface ThemeDef {
  id: ThemeId
  label: string
  description: string
  dark: boolean
  /** Drives <meta name="theme-color"> for the installed PWA chrome. */
  themeColor: string
}

export const THEMES: ThemeDef[] = [
  { id: 'brand', label: 'Lelta Signature', description: 'Charcoal + teal & gold', dark: true, themeColor: '#24282d' },
  { id: 'teal-dark', label: 'Midnight Teal', description: 'Near-black + river teal', dark: true, themeColor: '#0b0f10' },
  { id: 'ocean', label: 'Deep Ocean', description: 'Navy blue + teal', dark: true, themeColor: '#0a1420' },
  { id: 'slate-light', label: 'River Slate', description: 'Light slate + teal', dark: false, themeColor: '#eef2f4' },
]

export const DEFAULT_THEME: ThemeId = 'brand'
export const THEME_STORAGE_KEY = 'lelta-theme'

/**
 * One-time migration flag. When absent, every user (including those who had
 * already chosen a theme) is switched to the new signature theme exactly once;
 * afterwards their selection is respected. Bump the suffix to force again.
 */
export const THEME_MIGRATION_KEY = 'lelta-theme-migrated-brand'

/** Class list applied to <html> for a theme. Light theme uses :root defaults. */
export function themeClass(id: ThemeId): string {
  switch (id) {
    case 'ocean':
      return 'theme-ocean dark'
    case 'slate-light':
      return ''
    case 'teal-dark':
      return 'theme-teal-dark dark'
    default:
      return 'theme-brand dark'
  }
}

/**
 * Run the one-time forced switch to the default theme. Returns true when a
 * migration occurred (caller may want to apply it immediately). Safe to call
 * repeatedly — it no-ops once the flag is set. The pre-paint script in
 * index.html performs the same logic so first paint already reflects it.
 */
export function migrateThemeOnce(): boolean {
  try {
    if (!localStorage.getItem(THEME_MIGRATION_KEY)) {
      localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME)
      localStorage.setItem(THEME_MIGRATION_KEY, '1')
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

export function getStoredTheme(): ThemeId {
  migrateThemeOnce()
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
