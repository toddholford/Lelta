-- ============================================================
-- Taxonomy change: frequency is orthogonal to type, so the `recurring`
-- transaction_type is redundant — any transaction can carry a frequency.
--   * rename type `debt` -> `payments`
--   * move `utils` and `subs` from `recurring` onto `payments`
--   * drop the `debts` category (Payments + credit card/loan cover it);
--     anything filed under it is reassigned to `loan`
--   * drop the now-empty `recurring` type
-- Idempotent by name: a no-op once applied, and safe on a fresh DB whose
-- init seed still creates the old taxonomy.
-- ============================================================

-- Rename the type.
update transaction_type set name = 'payments' where name = 'debt';

-- Move utils & subs onto payments.
update transaction_category
set transaction_type_id = (select id from transaction_type where name = 'payments')
where name in ('utils', 'subs')
  and transaction_type_id = (select id from transaction_type where name = 'recurring');

-- Reassign rows filed under the recurring `debts` category to `loan`.
update transaction
set transaction_category_id = (select id from transaction_category where name = 'loan')
where transaction_category_id = (select id from transaction_category where name = 'debts');

update recurring_template
set transaction_category_id = (select id from transaction_category where name = 'loan')
where transaction_category_id = (select id from transaction_category where name = 'debts');

update import_row
set suggested_category_id = (select id from transaction_category where name = 'loan')
where suggested_category_id = (select id from transaction_category where name = 'debts');

-- Repoint any rows still typed `recurring` onto `payments`.
update transaction
set transaction_type_id = (select id from transaction_type where name = 'payments')
where transaction_type_id = (select id from transaction_type where name = 'recurring');

update recurring_template
set transaction_type_id = (select id from transaction_type where name = 'payments')
where transaction_type_id = (select id from transaction_type where name = 'recurring');

-- Drop the now-unused category and type.
delete from transaction_category where name = 'debts';
delete from transaction_type where name = 'recurring';
