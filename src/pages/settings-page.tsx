import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, Download, Landmark, LogOut, Share, Smartphone, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { SelectionActionBar } from '@/components/ui/selection-action-bar'
import { SelectionCheckbox } from '@/components/ui/selection-checkbox'
import { HoldProgressFill } from '@/components/ui/hold-progress-fill'
import { MultiSelectHint } from '@/components/ui/multi-select-hint'
import { useAccounts, useCreateAccount, useDeleteAccounts } from '@/hooks/use-accounts'
import { useLookups } from '@/hooks/use-lookups'
import { useLongPress } from '@/hooks/use-long-press'
import { useMultiSelect } from '@/hooks/use-multi-select'
import { dismissHint } from '@/lib/multi-select-hint'
import { cn } from '@/lib/utils'
import type { Account } from '@/lib/types'
import { signOut, useProfile } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { useFullWidth } from '@/hooks/use-full-width'
import { useIconStyle } from '@/hooks/use-icon-style'
import { useGuidance } from '@/hooks/use-guidance'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { THEMES, type ThemeId } from '@/lib/theme'
import { ICON_STYLES, type IconStyle } from '@/lib/icon-style'
import { GUIDANCE_MODES, checkAccountAdd, type GuidanceMode } from '@/lib/guidance'
import { isDemoMode } from '@/lib/supabase'

type SettingsTab = 'general' | 'account-manager'

const subTabs: { id: SettingsTab; label: string; shortLabel: string }[] = [
  { id: 'general', label: 'General', shortLabel: 'General' },
  { id: 'account-manager', label: 'Account Manager', shortLabel: 'Accounts' },
]

export function SettingsPage() {
  const { data: profile } = useProfile()
  const accounts = useAccounts()
  const lookups = useLookups()
  const createAccount = useCreateAccount()
  const { theme, setTheme } = useTheme()
  const { fullWidth, setFullWidth } = useFullWidth()
  const { iconStyle, setIconStyle } = useIconStyle()
  const { guidance, setGuidance } = useGuidance()

  const [tab, setTab] = useState<SettingsTab>('general')
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [typeId, setTypeId] = useState<number>(1)
  const [isHub, setIsHub] = useState(false)
  const [guardError, setGuardError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const typeName = (id: number) =>
    lookups.data?.accountTypes.find((t) => t.id === id)?.name ?? ''

  function handleAddAccount(e: FormEvent) {
    e.preventDefault()
    setGuardError(null)

    // Enforce the current guidance mode's per-type limits before writing.
    const existing = (accounts.data ?? []).filter((a) => a.account_type_id === typeId).length
    const check = checkAccountAdd(typeName(typeId).toLowerCase(), existing, guidance)
    if (check.blocked) {
      setGuardError(check.blocked)
      setNotice(null)
      return
    }
    // Advisory notice (e.g. the credit care-team message) — shown but not blocking.
    setNotice(check.warning ?? null)

    createAccount.mutate(
      { name: name.trim(), institution: institution.trim(), account_type_id: typeId, is_hub: isHub },
      {
        onSuccess: () => {
          setName('')
          setInstitution('')
          setIsHub(false)
        },
      },
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-lg font-semibold">Settings</h1>

      {/* Sub-tab segmented control */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {subTabs.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTab(opt.id)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === opt.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="sm:hidden">{opt.shortLabel}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Household</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>
                Signed in as <span className="font-medium">{profile?.display_name ?? '—'}</span>
              </p>
              {!isDemoMode && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => signOut()}>
                  <LogOut />
                  Sign out
                </Button>
              )}
            </CardContent>
          </Card>

          <InstallAppCard />

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as ThemeId)}
                >
                  {THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} — {t.description}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="icon-style">Transaction icons</Label>
                <Select
                  id="icon-style"
                  value={iconStyle}
                  onChange={(e) => setIconStyle(e.target.value as IconStyle)}
                >
                  {ICON_STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} — {s.description}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Desktop-only: full-width has no effect on mobile, so hide the control there. */}
              <div className="hidden items-center justify-between gap-4 md:flex">
                <div className="min-w-0">
                  <p id="full-width-label" className="text-sm font-medium">
                    Full-width layout
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use the whole screen on desktop — accounts spread across columns.
                  </p>
                </div>
                <Switch
                  checked={fullWidth}
                  onCheckedChange={setFullWidth}
                  aria-labelledby="full-width-label"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guidance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="guidance">Account guidance</Label>
                <Select
                  id="guidance"
                  value={guidance}
                  onChange={(e) => setGuidance(e.target.value as GuidanceMode)}
                >
                  {GUIDANCE_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} — {m.description}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Lelta guided keeps you to one account per cash type (billing, spending, saving,
                  deposit) and up to 10 credit accounts. No guidance removes those limits.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'account-manager' && (
        <div className="space-y-4">
          <AccountsCard accounts={accounts.data ?? []} typeName={typeName} />

          <Card>
            <CardHeader>
              <CardTitle>Add account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddAccount} className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="acct-name">Name</Label>
                  <Input
                    id="acct-name"
                    required
                    placeholder="e.g. Regions Billing"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="acct-institution">Institution</Label>
                    <Input
                      id="acct-institution"
                      required
                      placeholder="e.g. Regions"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="acct-type">Type</Label>
                    <Select
                      id="acct-type"
                      value={typeId}
                      onChange={(e) => setTypeId(Number(e.target.value))}
                    >
                      {(lookups.data?.accountTypes ?? []).map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isHub}
                    onChange={(e) => setIsHub(e.target.checked)}
                    className="size-4 accent-current"
                  />
                  Direct-deposit hub (money fans out from here)
                </label>
                {guardError && <p className="text-sm text-destructive">{guardError}</p>}
                {createAccount.error && (
                  <p className="text-sm text-destructive">{createAccount.error.message}</p>
                )}
                {notice && (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                    {notice}
                  </p>
                )}
                <Button type="submit" disabled={createAccount.isPending}>
                  {createAccount.isPending ? 'Adding…' : 'Add account'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

/**
 * Install-as-app entry. Mirrors the auto notice bar but lives permanently in
 * Settings so it's reachable after the banner is dismissed and on desktop.
 * Adapts to what the current browser supports: a one-tap native install on
 * Chromium, manual "Add to Home Screen" steps on iOS, and a generic hint
 * elsewhere. Confirms when Lelta is already running as an installed app.
 */
function InstallAppCard() {
  const { installed, ios, canInstallNatively, promptInstall } = useInstallPrompt()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install app</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {installed ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Check className="size-4 text-brand-teal" />
            Lelta is installed on this device.
          </p>
        ) : canInstallNatively ? (
          <>
            <p className="text-muted-foreground">
              Add Lelta to your home screen for a full-screen, app-like experience.
            </p>
            <Button size="sm" onClick={() => void promptInstall()}>
              <Download />
              Install Lelta
            </Button>
          </>
        ) : ios ? (
          <p className="flex flex-wrap items-center gap-1 text-muted-foreground">
            <Smartphone className="size-4 text-brand-teal" />
            In Safari, tap
            <Share className="inline size-4" aria-label="Share" />
            then <span className="font-medium text-foreground">“Add to Home Screen”</span>.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Open your browser menu and choose{' '}
            <span className="font-medium text-foreground">“Install app”</span> or{' '}
            <span className="font-medium text-foreground">“Add to Home Screen”</span> to install
            Lelta.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface AccountsCardProps {
  accounts: Account[]
  typeName: (id: number) => string
}

/** Accounts list with press-and-hold multi-select delete. */
function AccountsCard({ accounts, typeName }: AccountsCardProps) {
  const ids = useMemo(() => accounts.map((a) => a.id), [accounts])
  const sel = useMultiSelect(ids)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const deleteAccounts = useDeleteAccounts()

  // Discovering the gesture retires the one-time hint everywhere.
  useEffect(() => {
    if (sel.active) dismissHint()
  }, [sel.active])

  const count = sel.selectedIds.length

  function handleConfirmDelete() {
    deleteAccounts
      .mutateAsync(sel.selectedIds)
      .then(() => {
        setConfirmOpen(false)
        sel.exit()
      })
      .catch(() => setConfirmOpen(false))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {accounts.length > 0 && !sel.active && <MultiSelectHint />}

        {sel.active && (
          <SelectionActionBar
            count={count}
            allSelected={sel.allSelected}
            onToggleAll={sel.toggleAll}
            onDelete={() => setConfirmOpen(true)}
            onCancel={sel.exit}
          />
        )}

        {accounts.map((a) => (
          <AccountRow
            key={a.id}
            account={a}
            typeName={typeName}
            selectionMode={sel.active}
            selected={sel.isSelected(a.id)}
            onToggle={sel.toggle}
            onEnterSelection={sel.enter}
          />
        ))}

        {accounts.length === 0 && (
          <p className="text-sm text-muted-foreground">No accounts yet — add the four below.</p>
        )}
      </CardContent>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${count} ${count === 1 ? 'account' : 'accounts'}?`}
        description={`This also permanently deletes every transaction belonging to ${
          count === 1 ? 'this account' : 'these accounts'
        }. This can't be undone.`}
        confirmLabel="Delete"
        destructive
        pending={deleteAccounts.isPending}
        onConfirm={handleConfirmDelete}
      />
    </Card>
  )
}

interface AccountRowProps {
  account: Account
  typeName: (id: number) => string
  selectionMode: boolean
  selected: boolean
  onToggle: (id: string) => void
  onEnterSelection: (id: string) => void
}

function AccountRow({
  account,
  typeName,
  selectionMode,
  selected,
  onToggle,
  onEnterSelection,
}: AccountRowProps) {
  const { handlers, pressing, durationMs } = useLongPress(
    selectionMode ? undefined : () => onEnterSelection(account.id),
  )

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors',
        selectionMode && 'cursor-pointer select-none',
        selectionMode && selected && 'bg-primary/5 ring-1 ring-primary',
      )}
      onClick={selectionMode ? () => onToggle(account.id) : undefined}
      role={selectionMode ? 'button' : undefined}
      aria-pressed={selectionMode ? selected : undefined}
      {...handlers}
    >
      <HoldProgressFill active={pressing} durationMs={durationMs} className="rounded-lg" />
      {selectionMode && <SelectionCheckbox checked={selected} />}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Landmark className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {account.name}
          {account.is_hub && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
        </p>
        <p className="text-xs text-muted-foreground">
          {account.institution} · {typeName(account.account_type_id)}
        </p>
      </div>
    </div>
  )
}
