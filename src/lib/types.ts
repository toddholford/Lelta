// Domain row types mirroring the Supabase schema.
// Money is always integer cents — format at display time only.

export interface TransactionType {
  id: number
  name: string
}

export interface TransactionCategory {
  id: number
  transaction_type_id: number
  name: string
}

export interface TransactionFrequency {
  id: number
  name: string
}

export interface AccountType {
  id: number
  name: 'billing' | 'spending' | 'saving' | 'deposit' | 'credit' | string
}

export interface Account {
  id: string
  household_id: string
  name: string
  institution: string
  account_type_id: number
  is_hub: boolean
}

export interface RecurringTemplate {
  id: string
  household_id: string
  account_id: string
  transaction_type_id: number
  transaction_category_id: number
  transaction_frequency_id: number
  source_name: string
  amount_cents: number
  due_day: number
  start_date: string
  end_date: string | null
  active: boolean
}

export interface Transaction {
  id: string
  household_id: string
  account_id: string
  transaction_type_id: number
  transaction_category_id: number
  transaction_frequency_id: number | null
  recurring_template_id: string | null
  source_name: string
  txn_date: string
  due_date: string | null
  amount_cents: number
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TransactionInput {
  account_id: string
  transaction_type_id: number
  transaction_category_id: number
  transaction_frequency_id: number | null
  source_name: string
  txn_date: string
  due_date: string | null
  amount_cents: number
  note: string | null
}

export interface Lookups {
  types: TransactionType[]
  categories: TransactionCategory[]
  frequencies: TransactionFrequency[]
  accountTypes: AccountType[]
}
