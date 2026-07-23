import { useState, type FormEvent } from 'react'
import { Landmark, LogOut, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAccounts, useCreateAccount } from '@/hooks/use-accounts'
import { useLookups } from '@/hooks/use-lookups'
import { signOut, useProfile } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { THEMES, type ThemeId } from '@/lib/theme'
import { isDemoMode } from '@/lib/supabase'

export function SettingsPage() {
  const { data: profile } = useProfile()
  const accounts = useAccounts()
  const lookups = useLookups()
  const createAccount = useCreateAccount()
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [typeId, setTypeId] = useState<number>(1)
  const [isHub, setIsHub] = useState(false)

  const typeName = (id: number) =>
    lookups.data?.accountTypes.find((t) => t.id === id)?.name ?? ''

  function handleAddAccount(e: FormEvent) {
    e.preventDefault()
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

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1.5">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(accounts.data ?? []).map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Landmark className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {a.name}
                  {a.is_hub && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.institution} · {typeName(a.account_type_id)}
                </p>
              </div>
            </div>
          ))}
          {(accounts.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No accounts yet — add the four below.</p>
          )}
        </CardContent>
      </Card>

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
            {createAccount.error && (
              <p className="text-sm text-destructive">{createAccount.error.message}</p>
            )}
            <Button type="submit" disabled={createAccount.isPending}>
              {createAccount.isPending ? 'Adding…' : 'Add account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
