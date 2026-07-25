import { useState, type ChangeEvent } from 'react'
import { ChevronRight, FileUp, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ImportReview } from '@/components/import/import-review'
import { supabase } from '@/lib/supabase'
import { useAccounts } from '@/hooks/use-accounts'
import { useProfile } from '@/hooks/use-auth'
import {
  useParseStatement,
  useStatementImports,
  type StatementImportSummary,
} from '@/hooks/use-import'
import { formatShortDate } from '@/lib/format'

// Each account maps to a known statement format so the user only has to pick
// the account — the parser format is resolved in the background. Institutions
// without an explicit entry fall back to a slug derived from the institution
// name + the uploaded file's extension.
const FORMAT_BY_INSTITUTION: Record<string, string> = {
  Regions: 'regions_pdf',
  'Capital One': 'capitalone_pdf',
  FirstMid: 'firstmid_csv',
}

function bankFormatForAccount(institution: string, file: File | null): string {
  const known = FORMAT_BY_INSTITUTION[institution]
  if (known) return known
  const ext = file?.name.split('.').pop()?.toLowerCase()
  const slug = institution.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'bank'
  return `${slug}_${ext === 'csv' ? 'csv' : 'pdf'}`
}

const STATUS_LABEL: Record<StatementImportSummary['status'], string> = {
  pending: 'Needs review',
  reviewed: 'Partially committed',
  committed: 'Committed',
}

/**
 * Statement upload + review. File → Supabase Storage → statement_import row →
 * parse-statement Edge Function (Anthropic API) fills import_row → the review
 * screen commits chosen rows into the ledger. Parsed rows are never
 * auto-committed.
 */
export function ImportPage() {
  const accounts = useAccounts()
  const { data: profile } = useProfile()
  const imports = useStatementImports()
  const parse = useParseStatement()
  const [accountId, setAccountId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'parsing' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [reviewId, setReviewId] = useState<string | null>(null)

  const reviewing = imports.data?.find((i) => i.id === reviewId)

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setStatus('idle')
    setMessage('')
  }

  async function handleUpload() {
    if (!file || !profile) return
    if (!supabase) {
      setStatus('error')
      setMessage('Demo mode — connect Supabase to upload statements.')
      return
    }
    const account = accounts.data?.find((a) => a.id === (accountId || accounts.data?.[0]?.id))
    if (!account) {
      setStatus('error')
      setMessage('Add an account in Settings first.')
      return
    }
    setStatus('uploading')
    setMessage('')
    const path = `${profile.household_id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('statements').upload(path, file)
    if (uploadError) {
      setStatus('error')
      setMessage(uploadError.message)
      return
    }
    const { data: inserted, error: insertError } = await supabase
      .from('statement_import')
      .insert({
        household_id: profile.household_id,
        account_id: account.id,
        file_path: path,
        bank_format: bankFormatForAccount(account.institution, file),
        uploaded_by: profile.id,
      })
      .select('id')
      .single()
    if (insertError || !inserted) {
      setStatus('error')
      setMessage(insertError?.message ?? 'Could not save the import.')
      return
    }

    // Kick off parsing, then drop the user straight into review.
    setStatus('parsing')
    setFile(null)
    try {
      await parse.mutateAsync(inserted.id)
      setStatus('idle')
      setReviewId(inserted.id)
    } catch (err) {
      setStatus('error')
      setMessage(
        `Uploaded, but parsing failed: ${(err as Error).message}. You can retry it from the list below.`,
      )
    }
  }

  if (reviewing) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <ImportReview imp={reviewing} onBack={() => setReviewId(null)} />
      </div>
    )
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

          <Button
            onClick={handleUpload}
            disabled={!file || status === 'uploading' || status === 'parsing'}
          >
            {status === 'uploading' || status === 'parsing' ? (
              <>
                <Loader2 className="animate-spin" />
                {status === 'uploading' ? 'Uploading…' : 'Parsing…'}
              </>
            ) : (
              <>
                <Upload />
                Upload statement
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Uploaded statements are parsed into pending rows you review and edit before anything
            touches the ledger — nothing is auto-committed.
          </p>
        </CardContent>
      </Card>

      <RecentImports
        imports={imports.data}
        loading={imports.isLoading}
        accountName={(id) => accounts.data?.find((a) => a.id === id)?.name}
        onReview={setReviewId}
        onRetryParse={(id) => parse.mutate(id)}
        retryingId={parse.isPending ? (parse.variables ?? null) : null}
      />
    </div>
  )
}

interface RecentImportsProps {
  imports: StatementImportSummary[] | undefined
  loading: boolean
  accountName: (id: string) => string | undefined
  onReview: (id: string) => void
  onRetryParse: (id: string) => void
  retryingId: string | null
}

function RecentImports({
  imports,
  loading,
  accountName,
  onReview,
  onRetryParse,
  retryingId,
}: RecentImportsProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    )
  }
  if (!imports?.length) return null

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Recent imports</h2>
      {imports.map((imp) => {
        const stalled = imp.status === 'pending' && imp.total === 0
        return (
          <Card key={imp.id}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {accountName(imp.account_id) ?? imp.bank_format}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatShortDate(imp.created_at.slice(0, 10))} ·{' '}
                  {stalled ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="size-3 animate-spin" /> parsing…
                    </span>
                  ) : (
                    <>
                      {STATUS_LABEL[imp.status]}
                      {imp.total > 0 && ` · ${imp.pending} of ${imp.total} to review`}
                    </>
                  )}
                </p>
              </div>
              {stalled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetryParse(imp.id)}
                  disabled={retryingId === imp.id}
                >
                  {retryingId === imp.id ? <Loader2 className="animate-spin" /> : 'Retry parse'}
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => onReview(imp.id)}>
                  {imp.pending > 0 ? 'Review' : 'View'}
                  <ChevronRight />
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
