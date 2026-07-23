import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { demoTemplates } from '@/lib/demo-data'
import type { RecurringTemplate } from '@/lib/types'

async function fetchTemplates(): Promise<RecurringTemplate[]> {
  if (!supabase) return demoTemplates
  const { data, error } = await supabase
    .from('recurring_template')
    .select('*')
    .eq('active', true)
    .order('due_day')
  if (error) throw error
  return data
}

export function useRecurringTemplates() {
  return useQuery({
    queryKey: ['recurring-templates'],
    queryFn: fetchTemplates,
    staleTime: 5 * 60_000,
  })
}
