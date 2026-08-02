// How the leading avatar on transaction rows (and other CategoryIcon spots)
// renders. User-selectable in Settings and persisted to localStorage.

export type IconStyle = 'icon' | 'color' | 'empty' | 'none'

export interface IconStyleDef {
  id: IconStyle
  label: string
  description: string
}

export const ICON_STYLES: IconStyleDef[] = [
  { id: 'icon', label: 'Category icons', description: 'Auto-filled icon per category' },
  { id: 'color', label: 'Colored circles', description: 'A distinct color per category' },
  { id: 'empty', label: 'Empty circles', description: 'Plain circle, no icon' },
  { id: 'none', label: 'No circle', description: 'Hide the avatar entirely' },
]

export const DEFAULT_ICON_STYLE: IconStyle = 'icon'
export const ICON_STYLE_STORAGE_KEY = 'lelta-icon-style'

export function getStoredIconStyle(): IconStyle {
  try {
    const v = localStorage.getItem(ICON_STYLE_STORAGE_KEY)
    if (ICON_STYLES.some((s) => s.id === v)) return v as IconStyle
  } catch {
    /* ignore */
  }
  return DEFAULT_ICON_STYLE
}

export function persistIconStyle(style: IconStyle): void {
  try {
    localStorage.setItem(ICON_STYLE_STORAGE_KEY, style)
  } catch {
    /* ignore */
  }
}

/**
 * Stable background color for a category, used by the "Colored circles" style.
 * Hashes the category name to a hue so the same category always gets the same
 * color; saturation/lightness are tuned to read on both light and dark themes.
 */
export function categoryColor(category?: string): string {
  const key = category ?? 'other'
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 52% 48%)`
}
