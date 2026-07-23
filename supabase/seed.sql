-- Optional starter data: the four real accounts, attached to the household
-- created on first sign-up. Run AFTER at least one user has signed in
-- (the auth trigger creates the household).

insert into account (household_id, name, institution, account_type_id, is_hub)
select h.id, a.name, a.institution, at.id, a.is_hub
from household h
cross join lateral (
  values
    ('Capital One Deposit', 'Capital One', 'deposit', true),
    ('Regions Billing', 'Regions', 'billing', false),
    ('FirstMid Spending', 'FirstMid', 'spending', false),
    ('High-Yield Savings', 'HYSA', 'saving', false)
) as a (name, institution, type_name, is_hub)
join account_type at on at.name = a.type_name
where h.id = (select id from household order by created_at limit 1)
  and not exists (select 1 from account where household_id = h.id);
