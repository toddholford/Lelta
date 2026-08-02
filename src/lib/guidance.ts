// How strictly Lelta shapes a household's account structure. User-selectable
// in Settings and persisted to localStorage.
//
// - 'guided' ("Lelta guided"): at most one account per cash type (billing,
//   spending, saving, deposit) and at most 10 credit accounts.
// - 'none' ("No guidance"): no limits, add as many accounts as you like.
//
// Either way, reaching the 10th credit account surfaces the care-team notice.

export type GuidanceMode = 'guided' | 'none'

export interface GuidanceModeDef {
  id: GuidanceMode
  label: string
  description: string
}

export const GUIDANCE_MODES: GuidanceModeDef[] = [
  {
    id: 'guided',
    label: 'Lelta guided',
    description: 'One account per cash type, up to 10 credit accounts',
  },
  {
    id: 'none',
    label: 'No guidance',
    description: 'Add as many accounts of any type as you like',
  },
]

export const DEFAULT_GUIDANCE: GuidanceMode = 'guided'
export const GUIDANCE_STORAGE_KEY = 'lelta-guidance'

/** The account type that guidance treats specially — capped high, not at one. */
export const CREDIT_TYPE_NAME = 'credit'

/** Reaching this many credit accounts triggers the care-team notice (both modes)
 *  and, under guided mode, is the ceiling. */
export const CREDIT_LIMIT = 10

export const CREDIT_WARNING =
  'The number of credit accounts you have is worrisome to the Lelta care team. ' +
  'If you are in need of help with your personal finances, please seek further help.'

export function getStoredGuidance(): GuidanceMode {
  try {
    const v = localStorage.getItem(GUIDANCE_STORAGE_KEY)
    if (GUIDANCE_MODES.some((m) => m.id === v)) return v as GuidanceMode
  } catch {
    /* ignore */
  }
  return DEFAULT_GUIDANCE
}

export function persistGuidance(mode: GuidanceMode): void {
  try {
    localStorage.setItem(GUIDANCE_STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

export interface AccountAddCheck {
  /** When set, the add is refused and this message explains why. */
  blocked?: string
  /** When set, the add proceeds but this advisory notice should be shown. */
  warning?: string
}

/**
 * Decide whether an account of `typeName` may be added, given how many accounts
 * of that type already exist and the current guidance mode.
 *
 * @param typeName    lowercase account-type name (e.g. 'billing', 'credit')
 * @param existing    how many accounts of that type the household already has
 * @param mode        current guidance mode
 */
export function checkAccountAdd(
  typeName: string,
  existing: number,
  mode: GuidanceMode,
): AccountAddCheck {
  const isCredit = typeName === CREDIT_TYPE_NAME

  if (isCredit) {
    // The would-be count after adding. The 10th (and every credit add beyond
    // it in no-guidance mode) surfaces the care-team notice.
    const next = existing + 1
    if (mode === 'guided' && existing >= CREDIT_LIMIT) {
      return {
        blocked: `Lelta guided caps you at ${CREDIT_LIMIT} credit accounts. Switch to No guidance in Settings to add more.`,
      }
    }
    if (next >= CREDIT_LIMIT) return { warning: CREDIT_WARNING }
    return {}
  }

  // Cash types: guided mode allows only one; no-guidance is unlimited.
  if (mode === 'guided' && existing >= 1) {
    return {
      blocked: `Lelta guided keeps you to one ${typeName} account. Switch to No guidance in Settings to add more.`,
    }
  }
  return {}
}
