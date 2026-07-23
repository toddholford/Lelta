import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { demoTransactions } from '@/lib/demo-data'
import { monthRange } from '@/lib/format'
import type { Transaction, TransactionInput } from '@/lib/types'
import { uuid } from '@/lib/id'
import { useProfile } from './use-auth'

export interface LedgerFilter {
  year: number
  /** 0-based month */
  month: number
  /** null = all accounts */
  accountId: string | null
}

function inMonth(t: Transaction, filter: LedgerFilter): boolean {
  const { start, end } = monthRange(filter.year, filter.month)
  return t.txn_date >= start && t.txn_date < end
}

async function fetchTransactions(filter: LedgerFilter): Promise<Transaction[]> {
  if (!supabase) {
    return demoTransactions
      .filter((t) => inMonth(t, filter))
      .filter((t) => !filter.accountId || t.account_id === filter.accountId)
      .sort((a, b) => b.txn_date.localeCompare(a.txn_date))
  }
  const { start, end } = monthRange(filter.year, filter.month)
  let query = supabase
    .from('transaction')
    .select('*')
    .gte('txn_date', start)
    .lt('txn_date', end)
    .order('txn_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (filter.accountId) query = query.eq('account_id', filter.accountId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export function useTransactions(filter: LedgerFilter) {
  return useQuery({
    queryKey: ['transactions', filter.year, filter.month, filter.accountId],
    queryFn: () => fetchTransactions(filter),
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  const { data: profile } = useProfile()
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      if (!supabase) {
        demoTransactions.push({
          id: uuid(),
          household_id: 'demo-household',
          recurring_template_id: null,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...input,
        })
        return
      }
      const { error } = await supabase.from('transaction').insert({
        ...input,
        household_id: profile?.household_id,
        created_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TransactionInput }) => {
      if (!supabase) {
        const existing = demoTransactions.find((t) => t.id === id)
        if (existing) Object.assign(existing, input, { updated_at: new Date().toISOString() })
        return
      }
      const { error } = await supabase.from('transaction').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) {
        const idx = demoTransactions.findIndex((t) => t.id === id)
        if (idx >= 0) demoTransactions.splice(idx, 1)
        return
      }
      const { error } = await supabase.from('transaction').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
