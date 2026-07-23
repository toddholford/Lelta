import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { demoAccounts } from '@/lib/demo-data'
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
