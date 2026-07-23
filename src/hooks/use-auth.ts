import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  household_id: string
  display_name: string
}

/**
 * Auth session state. In demo mode (no Supabase configured) the app behaves
 * as signed-in so the UI is explorable.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(supabase !== null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, loading, signedIn: supabase === null || session !== null }
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<Profile | null> => {
      if (!supabase) {
        return { id: 'demo-user', household_id: 'demo-household', display_name: 'Demo' }
      }
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return null
      const { data, error } = await supabase
        .from('profile')
        .select('id, household_id, display_name')
        .eq('id', auth.user.id)
        .single()
      if (error) throw error
      return data
    },
    staleTime: Infinity,
  })
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
}
