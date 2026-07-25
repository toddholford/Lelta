-- ============================================================
-- Statement imports record a terminal parse outcome so a failed parse
-- self-labels instead of spinning on "parsing…" forever.
--   * widen the status check to add parsing / parsed / failed
--   * add an `error` column for the failure message shown in the UI
--   * backfill: any still-pending import that never produced rows is a
--     parse that died before this tracking existed — mark it failed so the
--     existing stuck cards surface Retry / Discard instead of a spinner.
-- Idempotent: safe to re-run.
-- ============================================================

alter table statement_import drop constraint if exists statement_import_status_check;
alter table statement_import
  add constraint statement_import_status_check
  check (status in ('pending', 'parsing', 'parsed', 'failed', 'reviewed', 'committed'));

alter table statement_import add column if not exists error text;

update statement_import si
set status = 'failed',
    error = 'Parsing did not complete before parse-status tracking existed.'
where si.status = 'pending'
  and not exists (select 1 from import_row ir where ir.statement_import_id = si.id);
