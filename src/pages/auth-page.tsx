import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** Magic-link sign-in. */
export function AuthPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setStatus('sending')
    // Grab the origin dynamically so the link returns to wherever the request
    // came from — localhost on the laptop, the LAN IP (e.g. 192.168.1.4) on a
    // phone — instead of Supabase's default Site URL (localhost:3000).
    const redirectUrl = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    })
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <img
            src="/favicon_io/android-chrome-192x192.png"
            alt="Lelta logo"
            className="mb-2 size-14"
          />
          <CardTitle className="text-xl">
            <span className="text-brand-teal">Lel</span>
            <span className="text-brand-gold">ta</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">Where household money flows</p>
        </CardHeader>
        <CardContent>
          {status === 'sent' ? (
            <p className="text-center text-sm">
              Check <span className="font-medium">{email}</span> for a sign-in link.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {status === 'error' && (
                <p className="text-sm text-destructive">{errorMsg}</p>
              )}
              <Button type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send magic link'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
