-- ============================================================
-- Add a `biweekly` recurring frequency (every two weeks), alongside the
-- existing weekly / monthly / yearly. Lets a paycheck or bill that lands
-- every 14 days be scheduled and projected onto the calendar.
-- Idempotent by name: a no-op once applied, safe to re-run.
-- ============================================================

insert into transaction_frequency (name) values ('biweekly')
on conflict (name) do nothing;
