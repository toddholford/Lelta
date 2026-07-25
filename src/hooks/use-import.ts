import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ImportRow, StatementImport, TransactionInput } from '@/lib/types'
import { useProfile } from './use-auth'

/** A statement import plus a roll-up of its row review state. */
export interface StatementImportSummary extends StatementImport {
  total: number
  pending: number
  accepted: number
}

async function fetchImports(): Promise<StatementImportSummary[]> {
  if (!supabase) return []
  // RLS scopes both queries to the caller's household.
  const { data: imports, error } = await supabase
    .from('statement_import')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!imports.length) return []

  const { data: rows, error: rowsError } = await supabase
    .from('import_row')
    .select('statement_import_id, status')
    .in(
      'statement_import_id',
      imports.map((i) => i.id),
    )
  if (rowsError) throw rowsError

  return imports.map((imp) => {
    const mine = (rows ?? []).filter((r) => r.statement_import_id === imp.id)
    return {
      ...imp,
      total: mine.length,
      pending: mine.filter((r) => r.status === 'pending').length,
      accepted: mine.filter((r) => r.status === 'accepted' || r.status === 'edited').length,
    }
  })
}

export function useStatementImports() {
  return useQuery({
    queryKey: ['statement-imports'],
    queryFn: fetchImports,
    // Parsing happens out-of-band in the Edge Function, so poll while any
    // import is mid-parse; it settles to 'parsed' or 'failed'.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((i) => i.status === 'pending' || i.status === 'parsing')
        ? 2500
        : false,
  })
}

async function fetchImportRows(importId: string): Promise<ImportRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('import_row')
    .select('*')
    .eq('statement_import_id', importId)
    .order('parsed_date', { ascending: true })
  if (error) throw error
  return data
}

export function useImportRows(importId: string | null) {
  return useQuery({
    queryKey: ['import-rows', importId],
    queryFn: () => fetchImportRows(importId!),
    enabled: !!importId,
  })
}

/**
 * Kick off parsing for an uploaded statement. This calls the parse-statement
 * Edge Function, which reads the file, sends it to the Anthropic API, and
 * inserts the parsed rows into import_row for review.
 */
export function useParseStatement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (statementImportId: string) => {
      if (!supabase) throw new Error('Connect Supabase to parse statements.')
      const { data, error } = await supabase.functions.invoke('parse-statement', {
        body: { statement_import_id: statementImportId },
      })
      if (error) throw error
      return data as { inserted: number }
    },
    // Refresh on both success and failure — the function stamps the import's
    // final status ('parsed' or 'failed') either way, so the list must refetch.
    onSettled: (_data, _error, importId) => {
      queryClient.invalidateQueries({ queryKey: ['statement-imports'] })
      queryClient.invalidateQueries({ queryKey: ['import-rows', importId] })
    },
  })
}

/**
 * Discard an import: remove the uploaded file and delete the statement_import
 * row (which cascades to its import_row children). Used to clear a parse that
 * stalled or failed. Rows already committed to the ledger are unaffected —
 * transaction rows don't depend on import_row.
 */
export function useDeleteImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      if (!supabase) throw new Error('Connect Supabase to manage imports.')
      // Best-effort file cleanup, then the row (import_row cascades on delete).
      await supabase.storage.from('statements').remove([filePath])
      const { error } = await supabase.from('statement_import').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['statement-imports'] }),
  })
}

/** Edit the parsed fields of a single pending row (before commit). */
export function useUpdateImportRow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      importId: _importId,
      patch,
    }: {
      id: string
      importId: string
      patch: Partial<
        Pick<
          ImportRow,
          'parsed_source_name' | 'parsed_date' | 'parsed_amount_cents' | 'suggested_category_id' | 'status'
        >
      >
    }) => {
      if (!supabase) throw new Error('Connect Supabase to edit rows.')
      const { error } = await supabase.from('import_row').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, { importId }) => {
      queryClient.invalidateQueries({ queryKey: ['import-rows', importId] })
    },
  })
}

export interface CommitPayload {
  rowId: string
  input: TransactionInput
  /** True when the user changed the parsed values before committing. */
  edited: boolean
}

/**
 * Commit a reviewed statement: insert the accepted rows into the ledger,
 * link each import_row to its new transaction, mark rejected rows, and roll
 * the statement's status forward. Nothing here runs until the user hits
 * "Commit" — parsed rows never touch the ledger on their own.
 */
export function useCommitImport() {
  const queryClient = useQueryClient()
  const { data: profile } = useProfile()
  return useMutation({
    mutationFn: async ({
      importId,
      commits,
      rejects,
      markCommitted,
    }: {
      importId: string
      commits: CommitPayload[]
      rejects: string[]
      markCommitted: boolean
    }) => {
      if (!supabase) throw new Error('Connect Supabase to commit imports.')

      if (commits.length) {
        // Batch-insert transactions; Postgres returns the ids in the same
        // order as the inserted values, so we can zip them back to rows.
        const { data: inserted, error: insertError } = await supabase
          .from('transaction')
          .insert(
            commits.map((c) => ({
              ...c.input,
              household_id: profile?.household_id,
              created_by: profile?.id,
            })),
          )
          .select('id')
        if (insertError) throw insertError
        if (!inserted || inserted.length !== commits.length) {
          throw new Error('Commit failed: transaction count mismatch.')
        }

        for (let i = 0; i < commits.length; i++) {
          const c = commits[i]
          const { error } = await supabase
            .from('import_row')
            .update({
              status: c.edited ? 'edited' : 'accepted',
              committed_transaction_id: inserted[i].id,
              parsed_source_name: c.input.source_name,
              parsed_date: c.input.txn_date,
              parsed_amount_cents: c.input.amount_cents,
              suggested_category_id: c.input.transaction_category_id,
            })
            .eq('id', c.rowId)
          if (error) throw error
        }
      }

      if (rejects.length) {
        const { error } = await supabase
          .from('import_row')
          .update({ status: 'rejected' })
          .in('id', rejects)
        if (error) throw error
      }

      const { error: statusError } = await supabase
        .from('statement_import')
        .update({ status: markCommitted ? 'committed' : 'reviewed' })
        .eq('id', importId)
      if (statusError) throw statusError
    },
    onSuccess: (_data, { importId }) => {
      queryClient.invalidateQueries({ queryKey: ['statement-imports'] })
      queryClient.invalidateQueries({ queryKey: ['import-rows', importId] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
