// Small shared helpers for reasoning about transaction direction. Money is
// always stored as a positive magnitude in `amount_cents`; whether a row is
// money-in vs money-out is derived from its transaction type being 'income'.

import type { Lookups } from './types'

/** True when a transaction type id resolves to the 'income' type. */
export function isIncomeType(typeId: number, lookups: Lookups): boolean {
  return lookups.types.some((t) => t.id === typeId && t.name === 'income')
}

/** Ids of income transaction types (usually just one). */
export function incomeTypeIds(lookups: Pick<Lookups, 'types'>): Set<number> {
  return new Set(lookups.types.filter((t) => t.name === 'income').map((t) => t.id))
}
