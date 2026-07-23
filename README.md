# Lelta

**Where household money flows.** A shared, mobile-first household cash-flow
ledger PWA — _Ledger + Delta_. Income hits a direct-deposit hub and fans out
into billing, spending, and savings channels, like a river delta. Two people,
one ledger: daily spending log, monthly account review, statement imports, and
long-term planning. Built from [finance-ledger-spec.md](./finance-ledger-spec.md).

Three built-in themes (Midnight Teal, Deep Ocean, River Slate), switchable in
Settings.

**Stack:** Vite · React · TypeScript · Tailwind CSS v4 · shadcn-style components
(owned in-repo) · React Router · TanStack Query · Supabase (Postgres + Auth +
RLS + Storage + Edge Functions) · `vite-plugin-pwa`.

## Quick start (demo mode)

```sh
npm install
npm run dev
```

With no env vars set the app runs in **demo mode** — signed in automatically
with in-memory sample data, so every screen is explorable before the backend
exists.

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema: paste `supabase/migrations/00000000000001_init.sql` into
   the SQL editor (or `supabase db push` with the CLI). This creates all
   tables, RLS policies, lookup seeds, the `statements` storage bucket, and an
   auth trigger that auto-provisions each new user into the household (first
   sign-up creates it).
3. Enable the **Email** provider (magic links) under Authentication.
4. Copy `.env.example` to `.env.local` and fill in the project URL + anon key.
5. Sign in once, then optionally run `supabase/seed.sql` to create the four
   real accounts (Capital One hub, Regions billing, FirstMid spending, HYSA) —
   or add them on the Settings screen.

## Statement import (Edge Function)

`supabase/functions/parse-statement` parses an uploaded statement with the
Anthropic API (per-bank prompt chosen by `bank_format`) and writes pending
`import_row` records. Nothing is ever auto-committed — rows are reviewed,
edited, accepted, or rejected in the app before they touch the ledger.

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy parse-statement
```

The in-app review screen for parsed rows is the next build step (spec §8 step 6).

## Project layout

```
src/
  components/ui/        shadcn-style primitives (button, sheet, select, …)
  components/layout/    app shell — bottom tab bar (mobile) / top nav (desktop)
  components/ledger/    month selector, account switcher, stat tiles,
                        transaction card + form + bottom sheet
  hooks/                TanStack Query hooks (auth, lookups, accounts,
                        transactions, recurring templates)
  lib/                  supabase client, types, money/date formatting,
                        demo-mode fixtures
  pages/                Ledger, Plan, Import, Settings, Auth
supabase/
  migrations/           full schema + RLS + lookup seeds
  seed.sql              optional starter accounts
  functions/parse-statement/  statement parsing Edge Function
```

## Conventions

- **Money is integer cents** (`amount_cents bigint`) everywhere; formatted to
  currency only at display time.
- Every household-scoped table has **RLS** limiting rows to the caller's
  household (`current_household_id()`).
- The service-role key exists only inside Edge Functions, never in the client.

## Build order status (spec §8)

1. ✅ Scaffold (Vite, Tailwind, shadcn-style UI, PWA, router, TanStack Query)
2. ✅ Supabase schema + RLS + seeds + auth (magic link, auto household)
3. ✅ Ledger read views (month / account selectors, cards, stat tiles)
4. ✅ Add / edit transaction bottom sheet (+ desktop two-pane form)
5. ⬜ Recurring template management UI + monthly instance generation
6. 🟨 Statement import — upload + Edge Function scaffolded; review screen next
7. 🟨 Plan view — recurring obligations + 6-month projection (first pass)
8. 🟨 PWA — installable with offline shell + cached reads; polish remaining
