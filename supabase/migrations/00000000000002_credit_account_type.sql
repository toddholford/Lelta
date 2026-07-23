-- Add the 'credit' account type. Accounts of this type are credit cards; the
-- ledger's Cash / Credit toggle segments accounts (and their transactions) by
-- whether their account_type is 'credit'. Idempotent for re-runs.

insert into account_type (name) values ('credit')
on conflict (name) do nothing;
