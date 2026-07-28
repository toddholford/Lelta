-- ============================================================
-- Add an `income` transaction type so inflows (paychecks, deposits,
-- refunds, interest) live in the ledger alongside outflows. Two categories:
--   * paycheck — regular earned income
--   * other    — everything else that comes in
-- Income carries frequency + due date just like payments, so a recurring
-- paycheck can be scheduled.
-- Idempotent by name: a no-op once applied, safe to re-run.
-- ============================================================

insert into transaction_type (name) values ('income')
on conflict (name) do nothing;

insert into transaction_category (transaction_type_id, name)
select tt.id, c.name
from transaction_type tt
join lateral (values ('paycheck'), ('other')) as c (name) on true
where tt.name = 'income'
on conflict (transaction_type_id, name) do nothing;
