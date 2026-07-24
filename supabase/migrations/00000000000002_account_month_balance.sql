-- ============================================================
-- Per-account monthly starting balance.
-- Powers the Overview page: remaining = starting_cents - (sum of the
-- month's transactions for that account). One row per (account, year,
-- month); set independently each month (e.g. $1,000 for June, $1,200 for
-- July). Money is integer cents. RLS scoped to the household.
-- ============================================================

create table account_month_balance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household (id),
  account_id uuid not null references account (id) on delete cascade,
  year smallint not null,
  month smallint not null check (month between 1 and 12),
  starting_cents bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, year, month)
);

create index account_month_balance_household_idx
  on account_month_balance (household_id, year, month);

create trigger account_month_balance_updated_at before update on account_month_balance
  for each row execute function set_updated_at();

alter table account_month_balance enable row level security;
create policy "household rows" on account_month_balance for all to authenticated
  using (household_id = current_household_id())
  with check (household_id = current_household_id());
