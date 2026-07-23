import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { demoLookups } from '@/lib/demo-data'
import type { Lookups } from '@/lib/types'

async function fetchLookups(): Promise<Lookups> {
  if (!supabase) return demoLookups
  const [types, categories, frequencies, accountTypes] = await Promise.all([
    supabase.from('transaction_type').select('*').order('id'),
    supabase.from('transaction_category').select('*').order('id'),
    supabase.from('transaction_frequency').select('*').order('id'),
    supabase.from('account_type').select('*').order('id'),
  ])
  const firstError = types.error ?? categories.error ?? frequencies.error ?? accountTypes.error
  if (firstError) throw firstError
  return {
    types: types.data ?? [],
    categories: categories.data ?? [],
    frequencies: frequencies.data ?? [],
    accountTypes: accountTypes.data ?? [],
  }
}

export function useLookups() {
  return useQuery({
    queryKey: ['lookups'],
    queryFn: fetchLookups,
    staleTime: Infinity, // reference data — changes only via migrations
  })
}
