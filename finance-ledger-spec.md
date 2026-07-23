# Household Finance Ledger — Build Spec

A build brief for a personal, mobile-first finance ledger and long-term planning app. Point Claude Code at this file as the project's starting brief.

---

## 1. Purpose

A shared household finance ledger that mirrors a real multi-account cash flow, replacing a Google Sheets / Excel workflow with a nicer, faster experience. Used **daily** for logging purchases (spending) and **monthly** for reviewing all accounts, plus **long-term financial planning**. Bank statements can be uploaded and parsed into clean, reviewable, editable rows.

### Account flow being modeled
- **Capital One** — Deposit account. Direct-deposit hub; funds fan out from here.
- **Regions** — Billing account. Monthly recurring bills + any overdrafts.
- **FirstMid** — Spending account. Day-to-day purchases + any overdrafts.
- **High-yield savings** — Saving account.

Money moves hub → billing / spending / saving, so transfers between accounts should be trackable.

---

## 2. Users & access

- Two users (a married couple) sharing **one** ledger.
- Model as a **household**: both users belong to the same household and see the same data (shared, not per-user isolation).
- Designed so additional households could be added later without rework.
- All financial data protected by row-level security scoped to `household_id`.

---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Build tool | Vite | SPA, no SSR needed (fully auth-gated, no SEO) |
| UI | React + TypeScript | |
| Delivery | PWA (`vite-plugin-pwa`) | Installable, full-screen, offline read caching. ~85% mobile use |
| Styling | Tailwind CSS + shadcn/ui | Mobile-first; own the component code |
| Routing | React Router 7 (or TanStack Router for type-safe routes) | |
| Data fetching | TanStack Query | Caching, refetch, offline-friendly |
| Backend / DB | Supabase | Postgres + Auth + RLS + Storage + Edge Functions in one |
| Statement parsing | Anthropic API (called from a Supabase Edge Function) | |

### Why Supabase here
At two users the platform's paid-tier pricing is not a factor — the app lives comfortably in the free tier, and daily use avoids the inactivity pause. It uniquely bundles the four things this app needs: relational Postgres (the data is genuinely relational), row-level security (financial data), Storage (uploaded statement files), and Edge Functions (running the parser).

Alternative if going off Supabase: Neon (Postgres) + Better Auth + Cloudflare R2 for file storage — cheaper ceiling, more assembly.

---

## 4. Data model

This is the original hand-drawn model, refined. Renames and additions are called out.

### Conventions
- **Money is stored as integer cents** (`amount_cents bigint`), never a float. Format to currency in the UI only.
- Every household-scoped table carries `household_id` and has an RLS policy limiting rows to the caller's household.
- Timestamps: `created_at`, `updated_at`; ownership: `created_by` (auth user id).

### Lookup / reference tables
- `transaction_type` — `id`, `name`. Seed: `debt`, `recurring`, `spending`.
- `transaction_category` — `id`, `transaction_type_id` (FK → `transaction_type`; renamed from the original `transaction_id`), `name`. Seed grouped by type:
  - debt → `credit card`, `loan`
  - recurring → `debts`, `utils`, `subs`
  - spending → `groceries`, `shopping`, `dining`, `maintenance`, `fun`
- `transaction_frequency` — `id`, `name`. Seed: `weekly`, `monthly`, `yearly`.
- `account_type` — `id`, `name`. Seed: `billing`, `spending`, `saving`, `deposit`.

### Core tables
- `household` — `id`, `name`, `created_at`.
- `profile` — `id` (= Supabase auth user id), `household_id` (FK), `display_name`. Maps auth users to a household.
- `account` — the real bank accounts (new, recommended). `id`, `household_id`, `name` (e.g. "Regions Billing"), `institution` (e.g. "Regions"), `account_type_id` (FK), `is_hub` (bool; true for Capital One). Enables statement mapping and transfer tracking.
- `recurring_template` — the definition of a recurring bill/income (new; splits "the recurring rule" from "what actually happened"). `id`, `household_id`, `account_id` (FK), `transaction_type_id`, `transaction_category_id`, `transaction_frequency_id`, `source_name`, `amount_cents`, `due_day` (day-of-month, 1–31), `start_date`, `end_date` (nullable), `active` (bool).
- `transaction` — actual ledger entries (instances). `id`, `household_id`, `account_id` (FK), `transaction_type_id`, `transaction_category_id`, `transaction_frequency_id` (nullable — usually null for one-offs), `recurring_template_id` (nullable FK; set when generated from a template), `source_name`, `txn_date` (date), `due_date` (nullable date), `amount_cents`, `note`, `created_by`, `created_at`, `updated_at`.
- `transfer` — hub → account movements (optional but matches the real flow). `id`, `household_id`, `from_account_id`, `to_account_id`, `amount_cents`, `txn_date`, `note`.

### Recurring templates → monthly instances
The "copy of monthly recurring" behavior in the notes means: recurring templates are the source of truth, and each month the app **generates `transaction` rows from active templates** (dated to that month, linked via `recurring_template_id`). Generated instances remain individually editable (amounts and dates can differ from the template). This keeps monthly views and forecasting clean.

### Import staging tables
- `statement_import` — `id`, `household_id`, `account_id`, `file_path` (Supabase Storage path), `bank_format` (e.g. `regions_pdf`, `capitalone_pdf`, `firstmid_csv`), `status` (`pending` | `reviewed` | `committed`), `uploaded_by`, `created_at`.
- `import_row` — `id`, `statement_import_id` (FK), `raw_data` (jsonb — the raw parsed line), `parsed_source_name`, `parsed_date`, `parsed_amount_cents`, `suggested_category_id` (nullable), `status` (`pending` | `accepted` | `rejected` | `edited`), `committed_transaction_id` (nullable FK → `transaction`).

---

## 5. Statement import pipeline

Regions and Capital One are **PDF-only**, so LLM extraction is the primary path. FirstMid format is TBD; leave a simpler CSV/OFX mapper path for it.

Flow:
1. User uploads a statement file on the Import screen; it's stored in Supabase Storage.
2. A Supabase **Edge Function** extracts text from the PDF, then calls the **Anthropic API** with a **per-bank prompt** (selected by `bank_format`) instructing it to return structured JSON matching the ledger schema (source, date, amount, best-guess category).
3. Parsed rows land in `import_row` (status `pending`) — nothing touches the real ledger yet.
4. The Import review screen shows the parsed rows; the user edits, accepts, or rejects each one.
5. Accepted rows are written into `transaction`, with `import_row.committed_transaction_id` back-referencing the created entry.

Design notes:
- Prefer CSV/OFX/QFX over PDF wherever a bank later offers it — far more reliable than PDF layout parsing.
- The LLM route is chosen precisely because it degrades gracefully when a bank tweaks its PDF layout, unlike per-bank regex.
- Never auto-commit parsed rows — the review step is a hard requirement ("easily addable and editable").

---

## 6. Screens & layout

Mobile-first (85% mobile). The desktop mockups (left form + right table) collapse into a single scrollable mobile screen and relax back into two panes at wider breakpoints.

### Global navigation (bottom tab bar on mobile)
- **Ledger** — daily/monthly transaction views
- **Plan** — long-term forecasting
- **Import** — statement upload + review
- **Settings** — accounts, recurring templates, household

### Ledger screen
- Pinned top: month + year selector; account segmented control (Billing / Spending / Saving / Deposit).
- Quick stat tiles (e.g. month total, bills due soon).
- Transactions as tap-friendly **cards** (category icon, source + meta on the left, amount + date on the right) — not a wide table.
- Floating **+** button opens the **Add Transaction** form as a **bottom sheet** (replaces the desktop left sidebar form).

### Add / edit transaction (bottom sheet)
Fields mirror the desktop form: Type, Category, Frequency, Account, Source, Date, Due Date, Amount. Category options filter by the selected Type.

### Plan screen
Long-term view: recurring obligations projected forward, month-over-month totals, savings trajectory. Scope to be refined.

### Desktop (≥ md breakpoint)
Same components re-flow into the two-pane layout: form pane + table/list pane, month/account selectors along the top.

---

## 7. Security

- Financial data → **RLS is mandatory** on every household-scoped table (`household_id = caller's household`).
- Never expose the Supabase service-role key to the client; privileged work (parsing, bulk commits) runs in Edge Functions.
- Store money as integers; format only at display time.

---

## 8. Suggested build order

1. Scaffold: Vite + React + TS, Tailwind, shadcn/ui, `vite-plugin-pwa`, router, TanStack Query.
2. Supabase: create project; schema + RLS; seed the four lookup tables; auth (email / magic link); household + profile setup.
3. Ledger read views (month / year / account) with transaction cards.
4. Add / edit transaction bottom sheet.
5. Recurring templates + monthly instance generation.
6. Statement import: Storage upload → Edge Function (text extract + Anthropic API) → `import_row` review screen → commit.
7. Plan / forecast view.
8. PWA polish: installability, offline caching of recent read data.

---

## 9. Open questions

- FirstMid statement format (CSV/OFX vs PDF)? Confirms whether a second, simpler parser path is needed.
- Explicit `transfer` tracking wanted now, or later?
- High-yield savings institution (for statement mapping)?
- Desired scope of the Plan/forecast view (simple projection vs goal tracking, what-ifs)?

---

## 10. Kickoff prompt for Claude Code

> Scaffold a Vite + React + TypeScript PWA using Tailwind and shadcn/ui, with React Router and TanStack Query. Set up a Supabase backend (Postgres + Auth + RLS + Storage) per the schema in this spec. Start with the Ledger screen (mobile-first: month/account selectors, transaction cards, a floating add button opening a bottom-sheet form), then wire it to Supabase. Follow the build order in section 8.
