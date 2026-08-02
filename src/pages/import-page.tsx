import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { ChevronRight, FileUp, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { SelectionActionBar } from '@/components/ui/selection-action-bar'
import { SelectionCheckbox } from '@/components/ui/selection-checkbox'
import { HoldProgressFill } from '@/components/ui/hold-progress-fill'
import { MultiSelectHint } from '@/components/ui/multi-select-hint'
import { ImportReview } from '@/components/import/import-review'
import { supabase } from '@/lib/supabase'
import { useAccounts } from '@/hooks/use-accounts'
import { useProfile } from '@/hooks/use-auth'
import { useLongPress } from '@/hooks/use-long-press'
import { useMultiSelect } from '@/hooks/use-multi-select'
import { dismissHint } from '@/lib/multi-select-hint'
import {
  useDeleteImport,
  useDeleteImports,
  useParseStatement,
  useStatementImports,
  type StatementImportSummary,
} from '@/hooks/use-import'
import { formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'

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

// Labels for imports that have finished parsing (working/failed states render
// their own text below).
const STATUS_LABEL: Partial<Record<StatementImportSummary['status'], string>> = {
  parsed: 'Ready to review',
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
  const discard = useDeleteImport()
  const discardMany = useDeleteImports()
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
        onDiscard={(id, filePath) => discard.mutate({ id, filePath })}
        discardingId={discard.isPending ? (discard.variables?.id ?? null) : null}
        onDeleteMany={(items) => discardMany.mutateAsync(items)}
        deletingMany={discardMany.isPending}
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
  onDiscard: (id: string, filePath: string) => void
  discardingId: string | null
  onDeleteMany: (items: { id: string; filePath: string }[]) => Promise<void>
  deletingMany: boolean
}

function RecentImports({
  imports,
  loading,
  accountName,
  onReview,
  onRetryParse,
  retryingId,
  onDiscard,
  discardingId,
  onDeleteMany,
  deletingMany,
}: RecentImportsProps) {
  const ids = useMemo(() => (imports ?? []).map((i) => i.id), [imports])
  const sel = useMultiSelect(ids)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Discovering the gesture retires the one-time hint everywhere.
  useEffect(() => {
    if (sel.active) dismissHint()
  }, [sel.active])

  function handleConfirmDelete() {
    const items = (imports ?? [])
      .filter((i) => sel.isSelected(i.id))
      .map((i) => ({ id: i.id, filePath: i.file_path }))
    onDeleteMany(items)
      .then(() => {
        setConfirmOpen(false)
        sel.exit()
      })
      .catch(() => setConfirmOpen(false))
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    )
  }
  if (!imports?.length) return null

  const count = sel.selectedIds.length

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Recent imports</h2>

      {!sel.active && <MultiSelectHint />}

      {sel.active && (
        <SelectionActionBar
          count={count}
          allSelected={sel.allSelected}
          onToggleAll={sel.toggleAll}
          onDelete={() => setConfirmOpen(true)}
          onCancel={sel.exit}
        />
      )}

      {imports.map((imp) => (
        <RecentImportRow
          key={imp.id}
          imp={imp}
          accountName={accountName}
          selectionMode={sel.active}
          selected={sel.isSelected(imp.id)}
          onToggle={sel.toggle}
          onEnterSelection={sel.enter}
          onReview={onReview}
          onRetryParse={onRetryParse}
          retrying={retryingId === imp.id}
          onDiscard={onDiscard}
          discarding={discardingId === imp.id}
        />
      ))}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${count} ${count === 1 ? 'import' : 'imports'}?`}
        description="Removes the uploaded files and their parsed rows. Committed transactions stay in the ledger."
        confirmLabel="Delete"
        destructive
        pending={deletingMany}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

interface RecentImportRowProps {
  imp: StatementImportSummary
  accountName: (id: string) => string | undefined
  selectionMode: boolean
  selected: boolean
  onToggle: (id: string) => void
  onEnterSelection: (id: string) => void
  onReview: (id: string) => void
  onRetryParse: (id: string) => void
  retrying: boolean
  onDiscard: (id: string, filePath: string) => void
  discarding: boolean
}

function RecentImportRow({
  imp,
  accountName,
  selectionMode,
  selected,
  onToggle,
  onEnterSelection,
  onReview,
  onRetryParse,
  retrying,
  onDiscard,
  discarding,
}: RecentImportRowProps) {
  const working = imp.status === 'pending' || imp.status === 'parsing'
  const failed = imp.status === 'failed'
  // Long-press the info region to enter selection; disabled once in mode
  // (a plain tap toggles then).
  const { handlers, pressing, durationMs } = useLongPress(
    selectionMode ? undefined : () => onEnterSelection(imp.id),
  )

  const discardButton = (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-destructive"
      aria-label="Discard this import"
      onClick={() => onDiscard(imp.id, imp.file_path)}
      disabled={discarding}
    >
      {discarding ? <Loader2 className="animate-spin" /> : <X />}
    </Button>
  )

  return (
    <Card className={cn(selectionMode && selected && 'border-primary ring-1 ring-primary')}>
      <CardContent
        className={cn(
          'relative flex items-center gap-3 p-3',
          selectionMode && 'cursor-pointer select-none',
        )}
        onClick={selectionMode ? () => onToggle(imp.id) : undefined}
        role={selectionMode ? 'button' : undefined}
        aria-pressed={selectionMode ? selected : undefined}
      >
        <HoldProgressFill active={pressing} durationMs={durationMs} />
        {selectionMode && <SelectionCheckbox checked={selected} />}
        <div className="min-w-0 flex-1" {...handlers}>
          <p className="truncate text-sm font-medium">
            {accountName(imp.account_id) ?? imp.bank_format}
          </p>
          <p className={`text-xs ${failed ? 'text-destructive' : 'text-muted-foreground'}`}>
            {formatShortDate(imp.created_at.slice(0, 10))} ·{' '}
            {working ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> parsing…
              </span>
            ) : failed ? (
              <>Parse failed{imp.error ? ` · ${imp.error}` : ''}</>
            ) : (
              <>
                {STATUS_LABEL[imp.status] ?? imp.status}
                {imp.total > 0 && ` · ${imp.pending} of ${imp.total} to review`}
              </>
            )}
          </p>
        </div>
        {!selectionMode &&
          (working ? (
            discardButton
          ) : failed ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetryParse(imp.id)}
                disabled={retrying || discarding}
              >
                {retrying ? <Loader2 className="animate-spin" /> : 'Retry parse'}
              </Button>
              {discardButton}
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => onReview(imp.id)}>
              {imp.pending > 0 ? 'Review' : 'View'}
              <ChevronRight />
            </Button>
          ))}
      </CardContent>
    </Card>
  )
}
