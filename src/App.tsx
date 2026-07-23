import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/app-shell'
import { LedgerPage } from '@/pages/ledger-page'
import { PlanPage } from '@/pages/plan-page'
import { ImportPage } from '@/pages/import-page'
import { SettingsPage } from '@/pages/settings-page'
import { AuthPage } from '@/pages/auth-page'
import { useSession } from '@/hooks/use-auth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function Gate() {
  const { signedIn, loading } = useSession()
  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Loading…</div>
  }
  if (!signedIn) return <AuthPage />
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LedgerPage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      {/* Magic-link lands here; the session is parsed from the URL on load,
          then we bounce to the ledger. Also catches any unknown path. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
