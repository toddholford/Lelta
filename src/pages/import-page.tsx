import { useState, type ChangeEvent } from 'react'
import { FileUp, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAccounts } from '@/hooks/use-accounts'
import { useProfile } from '@/hooks/use-auth'

const BANK_FORMATS = [
  { value: 'regions_pdf', label: 'Regions (PDF)' },
  { value: 'capitalone_pdf', label: 'Capital One (PDF)' },
  { value: 'firstmid_csv', label: 'FirstMid (CSV)' },
]

/**
 * Statement upload: file → Supabase Storage → statement_import row.
 * The parse Edge Function (Anthropic API) then fills import_row for review —
 * see supabase/functions/parse-statement. Parsed rows are never auto-committed.
 */
export function ImportPage() {
  const accounts = useAccounts()
  const { data: profile } = useProfile()
  const [accountId, setAccountId] = useState('')
  const [bankFormat, setBankFormat] = useState(BANK_FORMATS[0].value)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setStatus('idle')
  }

  async function handleUpload() {
    if (!file || !profile) return
    if (!supabase) {
      setStatus('error')
      setMessage('Demo mode — connect Supabase to upload statements.')
      return
    }
    const account = accountId || accounts.data?.[0]?.id
    if (!account) {
      setStatus('error')
      setMessage('Add an account in Settings first.')
      return
    }
    setStatus('uploading')
    const path = `${profile.household_id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('statements')
      .upload(path, file)
    if (uploadError) {
      setStatus('error')
      setMessage(uploadError.message)
      return
    }
    const { error: insertError } = await supabase.from('statement_import').insert({
      household_id: profile.household_id,
      account_id: account,
      file_path: path,
      bank_format: bankFormat,
      uploaded_by: profile.id,
    })
    if (insertError) {
      setStatus('error')
      setMessage(insertError.message)
      return
    }
    setStatus('done')
    setMessage('Uploaded. Parsing & review flow is the next build step.')
    setFile(null)
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-lg font-semibold">Import</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload a statement</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="import-account">Account</Label>
            <Select
              id="import-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {(accounts.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="import-format">Bank format</Label>
            <Select
              id="import-format"
              value={bankFormat}
              onChange={(e) => setBankFormat(e.target.value)}
            >
              {BANK_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
          </div>

          <label
            htmlFor="import-file"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground hover:bg-accent"
          >
            <FileUp className="size-6" />
            {file ? <span className="font-medium text-foreground">{file.name}</span> : 'Tap to choose a PDF or CSV'}
            <input
              id="import-file"
              type="file"
              accept=".pdf,.csv,.ofx,.qfx"
              className="sr-only"
              onChange={onFileChange}
            />
          </label>

          {message && (
            <p className={`text-sm ${status === 'error' ? 'text-destructive' : 'text-positive'}`}>
              {message}
            </p>
          )}

          <Button onClick={handleUpload} disabled={!file || status === 'uploading'}>
            <Upload />
            {status === 'uploading' ? 'Uploading…' : 'Upload statement'}
          </Button>

          <p className="text-xs text-muted-foreground">
            Uploaded statements are parsed into pending rows you review and edit before anything
            touches the ledger — nothing is auto-committed.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
