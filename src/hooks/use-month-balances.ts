import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { demoMonthBalances } from '@/lib/demo-data'
import type { AccountMonthBalance } from '@/lib/types'
import { uuid } from '@/lib/id'
import { useProfile } from './use-auth'

/**
 * Per-account starting balances, keyed by (account, year, month). The Overview
 * page subtracts the month's spending from the starting balance to show what's
 * left in each account. `month` is 0-based at the call site (matching the rest
 * of the app) and converted to the DB's 1-based column here.
 */
async function fetchMonthBalances(year: number, month0: number): Promise<AccountMonthBalance[]> {
  const month = month0 + 1
  if (!supabase) {
    return demoMonthBalances.filter((b) => b.year === year && b.month === month)
  }
  const { data, error } = await supabase
    .from('account_month_balance')
    .select('*')
    .eq('year', year)
    .eq('month', month)
  if (error) throw error
  return data
}

export function useMonthBalances(year: number, month: number) {
  return useQuery({
    queryKey: ['month-balances', year, month],
    queryFn: () => fetchMonthBalances(year, month),
    staleTime: 60_000,
  })
}

export interface SetMonthBalanceInput {
  account_id: string
  year: number
  /** 0-based month, converted to 1-based before storage. */
  month: number
  starting_cents: number
}

export function useSetMonthBalance() {
  const queryClient = useQueryClient()
  const { data: profile } = useProfile()
  return useMutation({
    mutationFn: async (input: SetMonthBalanceInput) => {
      const month = input.month + 1
      if (!supabase) {
        const existing = demoMonthBalances.find(
          (b) => b.account_id === input.account_id && b.year === input.year && b.month === month,
        )
        if (existing) existing.starting_cents = input.starting_cents
        else
          demoMonthBalances.push({
            id: uuid(),
            household_id: 'demo-household',
            account_id: input.account_id,
            year: input.year,
            month,
            starting_cents: input.starting_cents,
          })
        return
      }
      const { error } = await supabase.from('account_month_balance').upsert(
        {
          account_id: input.account_id,
          year: input.year,
          month,
          starting_cents: input.starting_cents,
          household_id: profile?.household_id,
        },
        { onConflict: 'account_id,year,month' },
      )
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['month-balances'] }),
  })
}
