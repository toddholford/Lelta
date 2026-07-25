import { NavLink, Outlet } from 'react-router'
import { BookOpenText, Wallet, FileUp, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isDemoMode } from '@/lib/supabase'
import { MonthProvider } from '@/hooks/use-month'

const tabs = [
  { to: '/', label: 'Ledger', icon: BookOpenText },
  { to: '/overview', label: 'Overview', icon: Wallet },
  { to: '/import', label: 'Import', icon: FileUp },
  { to: '/settings', label: 'Settings', icon: Settings },
]

/** Logo mark, optionally followed by the dual-colour wordmark. */
function Brand({ wordmark = true }: { wordmark?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <img
        src="/favicon_io/android-chrome-192x192.png"
        alt="Lelta logo"
        className="size-7"
      />
      {wordmark && (
        <span className="text-base font-bold tracking-tight">
          <span className="text-brand-teal">Lel</span>
          <span className="text-brand-gold">ta</span>
        </span>
      )}
    </span>
  )
}

/**
 * Global layout: persistent brand bar on top; bottom tab bar on mobile, inline
 * nav in the top bar from md up.
 */
export function AppShell() {
  return (
    <MonthProvider>
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
      {isDemoMode && (
        <div className="bg-amber-500/15 px-4 py-1.5 text-center text-xs font-medium text-amber-700 dark:text-amber-400">
          Demo mode — set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to connect your backend
        </div>
      )}

      {/* Mobile top brand bar — logo + wordmark always visible */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur pt-safe md:hidden">
        <div className="flex h-14 items-center justify-center px-4">
          <Brand wordmark={false} />
        </div>
      </header>

      {/* Desktop top nav */}
      <header className="sticky top-0 z-40 hidden border-b bg-background/80 backdrop-blur md:block">
        <div className="flex h-14 items-center gap-6 px-6">
          <Brand />
          <nav className="flex gap-1">
            {tabs.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-safe md:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-4">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
    </MonthProvider>
  )
}
