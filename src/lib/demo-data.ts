// In-memory fixtures used when Supabase env vars are not configured (demo
// mode). Lets the UI be explored before the backend exists. Mirrors the seed
// data in supabase/migrations.

import type { Account, Lookups, RecurringTemplate, Transaction, TransactionInput } from './types'
import { todayISO } from './format'
import { uuid } from './id'

const HOUSEHOLD_ID = 'demo-household'

export const demoLookups: Lookups = {
  types: [
    { id: 1, name: 'debt' },
    { id: 2, name: 'recurring' },
    { id: 3, name: 'spending' },
  ],
  categories: [
    { id: 1, transaction_type_id: 1, name: 'credit card' },
    { id: 2, transaction_type_id: 1, name: 'loan' },
    { id: 3, transaction_type_id: 2, name: 'debts' },
    { id: 4, transaction_type_id: 2, name: 'utils' },
    { id: 5, transaction_type_id: 2, name: 'subs' },
    { id: 6, transaction_type_id: 3, name: 'groceries' },
    { id: 7, transaction_type_id: 3, name: 'shopping' },
    { id: 8, transaction_type_id: 3, name: 'dining' },
    { id: 9, transaction_type_id: 3, name: 'maintenance' },
    { id: 10, transaction_type_id: 3, name: 'fun' },
  ],
  frequencies: [
    { id: 1, name: 'weekly' },
    { id: 2, name: 'monthly' },
    { id: 3, name: 'yearly' },
  ],
  accountTypes: [
    { id: 1, name: 'billing' },
    { id: 2, name: 'spending' },
    { id: 3, name: 'saving' },
    { id: 4, name: 'deposit' },
    { id: 5, name: 'credit' },
  ],
}

export const demoAccounts: Account[] = [
  { id: 'acct-capone', household_id: HOUSEHOLD_ID, name: 'Capital One Deposit', institution: 'Capital One', account_type_id: 4, is_hub: true },
  { id: 'acct-regions', household_id: HOUSEHOLD_ID, name: 'Regions Billing', institution: 'Regions', account_type_id: 1, is_hub: false },
  { id: 'acct-firstmid', household_id: HOUSEHOLD_ID, name: 'FirstMid Spending', institution: 'FirstMid', account_type_id: 2, is_hub: false },
  { id: 'acct-hysa', household_id: HOUSEHOLD_ID, name: 'High-Yield Savings', institution: 'HYSA', account_type_id: 3, is_hub: false },
  { id: 'acct-chase-visa', household_id: HOUSEHOLD_ID, name: 'Chase Sapphire', institution: 'Chase Visa', account_type_id: 5, is_hub: false },
]

function iso(daysAgo: number): string {
  const [y, m, d] = todayISO().split('-').map(Number)
  const dt = new Date(y, m - 1, d - daysAgo)
  const off = dt.getTimezoneOffset()
  return new Date(dt.getTime() - off * 60_000).toISOString().slice(0, 10)
}

function txn(partial: Omit<TransactionInput, 'transaction_frequency_id' | 'due_date' | 'note'> &
  Partial<TransactionInput>): Transaction {
  return {
    id: uuid(),
    household_id: HOUSEHOLD_ID,
    transaction_frequency_id: null,
    recurring_template_id: null,
    due_date: null,
    note: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...partial,
  }
}

export const demoTemplates: RecurringTemplate[] = [
  { id: 'tpl-rent', household_id: HOUSEHOLD_ID, account_id: 'acct-regions', transaction_type_id: 2, transaction_category_id: 3, transaction_frequency_id: 2, source_name: 'Mortgage', amount_cents: 145000, due_day: 1, start_date: '2024-01-01', end_date: null, active: true },
  { id: 'tpl-electric', household_id: HOUSEHOLD_ID, account_id: 'acct-regions', transaction_type_id: 2, transaction_category_id: 4, transaction_frequency_id: 2, source_name: 'Ameren Electric', amount_cents: 14250, due_day: 15, start_date: '2024-01-01', end_date: null, active: true },
  { id: 'tpl-water', household_id: HOUSEHOLD_ID, account_id: 'acct-regions', transaction_type_id: 2, transaction_category_id: 4, transaction_frequency_id: 2, source_name: 'City Water', amount_cents: 5830, due_day: 20, start_date: '2024-01-01', end_date: null, active: true },
  { id: 'tpl-netflix', household_id: HOUSEHOLD_ID, account_id: 'acct-regions', transaction_type_id: 2, transaction_category_id: 5, transaction_frequency_id: 2, source_name: 'Netflix', amount_cents: 1799, due_day: 8, start_date: '2024-01-01', end_date: null, active: true },
  { id: 'tpl-chase', household_id: HOUSEHOLD_ID, account_id: 'acct-regions', transaction_type_id: 1, transaction_category_id: 1, transaction_frequency_id: 2, source_name: 'Chase Sapphire', amount_cents: 42000, due_day: 27, start_date: '2024-01-01', end_date: null, active: true },
]

/** Mutable in-memory ledger for demo mode. */
export const demoTransactions: Transaction[] = [
  txn({ account_id: 'acct-firstmid', transaction_type_id: 3, transaction_category_id: 6, source_name: 'Kroger', txn_date: iso(1), amount_cents: 8734 }),
  txn({ account_id: 'acct-firstmid', transaction_type_id: 3, transaction_category_id: 8, source_name: 'Chipotle', txn_date: iso(2), amount_cents: 2412 }),
  txn({ account_id: 'acct-firstmid', transaction_type_id: 3, transaction_category_id: 10, source_name: 'AMC Theatres', txn_date: iso(4), amount_cents: 3250 }),
  txn({ account_id: 'acct-firstmid', transaction_type_id: 3, transaction_category_id: 7, source_name: 'Target', txn_date: iso(6), amount_cents: 6518 }),
  txn({ account_id: 'acct-regions', transaction_type_id: 2, transaction_category_id: 4, source_name: 'Ameren Electric', txn_date: iso(3), due_date: iso(-4), amount_cents: 14250, transaction_frequency_id: 2 }),
  txn({ account_id: 'acct-regions', transaction_type_id: 2, transaction_category_id: 5, source_name: 'Netflix', txn_date: iso(5), amount_cents: 1799, transaction_frequency_id: 2 }),
  txn({ account_id: 'acct-regions', transaction_type_id: 1, transaction_category_id: 1, source_name: 'Chase Sapphire', txn_date: iso(8), due_date: iso(-10), amount_cents: 42000, transaction_frequency_id: 2 }),
  txn({ account_id: 'acct-firstmid', transaction_type_id: 3, transaction_category_id: 9, source_name: 'AutoZone', txn_date: iso(9), amount_cents: 4599 }),
  txn({ account_id: 'acct-firstmid', transaction_type_id: 3, transaction_category_id: 6, source_name: 'Aldi', txn_date: iso(10), amount_cents: 6221 }),
  txn({ account_id: 'acct-regions', transaction_type_id: 2, transaction_category_id: 4, source_name: 'City Water', txn_date: iso(12), amount_cents: 5830, transaction_frequency_id: 2 }),
  // Credit-card spending (Chase Visa) — shows under the ledger's Credit view.
  txn({ account_id: 'acct-chase-visa', transaction_type_id: 3, transaction_category_id: 8, source_name: 'Olive Garden', txn_date: iso(2), amount_cents: 5240 }),
  txn({ account_id: 'acct-chase-visa', transaction_type_id: 3, transaction_category_id: 7, source_name: 'Amazon', txn_date: iso(5), amount_cents: 3199 }),
  txn({ account_id: 'acct-chase-visa', transaction_type_id: 3, transaction_category_id: 10, source_name: 'Steam', txn_date: iso(7), amount_cents: 5999 }),
]
