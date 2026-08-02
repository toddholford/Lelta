import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  demoAccounts,
  demoMonthBalances,
  demoTemplates,
  demoTransactions,
} from '@/lib/demo-data'
import type { Account } from '@/lib/types'
import { uuid } from '@/lib/id'
import { useProfile } from './use-auth'

async function fetchAccounts(): Promise<Account[]> {
  if (!supabase) return demoAccounts
  const { data, error } = await supabase.from('account').select('*').order('created_at')
  if (error) throw error
  return data
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    staleTime: 5 * 60_000,
  })
}

export interface AccountInput {
  name: string
  institution: string
  account_type_id: number
  is_hub: boolean
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  const { data: profile } = useProfile()
  return useMutation({
    mutationFn: async (input: AccountInput) => {
      if (!supabase) {
        demoAccounts.push({
          id: uuid(),
          household_id: 'demo-household',
          ...input,
        })
        return
      }
      const { error } = await supabase
        .from('account')
        .insert({ ...input, household_id: profile?.household_id })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

/**
 * Delete one or more accounts and everything that hangs off them. Account
 * foreign keys don't cascade (except account_month_balance), so dependents are
 * removed first in FK-safe order: statement imports (cascades their rows and
 * clears committed-transaction links), then transactions, recurring templates,
 * and transfers — finally the accounts themselves. This is destructive: the
 * accounts' transactions go with them.
 */
export function useDeleteAccounts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (accountIds: string[]) => {
      if (accountIds.length === 0) return
      if (!supabase) {
        const remove = new Set(accountIds)
        const prune = <T extends { account_id: string }>(arr: T[]) => {
          for (let i = arr.length - 1; i >= 0; i--) {
            if (remove.has(arr[i].account_id)) arr.splice(i, 1)
          }
        }
        prune(demoTransactions)
        prune(demoMonthBalances)
        prune(demoTemplates)
        for (let i = demoAccounts.length - 1; i >= 0; i--) {
          if (remove.has(demoAccounts[i].id)) demoAccounts.splice(i, 1)
        }
        return
      }

      // Order matters — each step clears a foreign key into `account`.
      const steps = [
        supabase.from('statement_import').delete().in('account_id', accountIds),
        supabase.from('transaction').delete().in('account_id', accountIds),
        supabase.from('recurring_template').delete().in('account_id', accountIds),
        supabase.from('transfer').delete().in('from_account_id', accountIds),
        supabase.from('transfer').delete().in('to_account_id', accountIds),
        supabase.from('account').delete().in('id', accountIds),
      ]
      for (const step of steps) {
        const { error } = await step
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['statement-imports'] })
      queryClient.invalidateQueries({ queryKey: ['month-balances'] })
    },
  })
}
