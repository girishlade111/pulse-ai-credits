# Supabase → Neon Migration Audit

**Repo:** `pulse-ai-credits` · **Audit date:** 2026-09-28 · **Mode:** read-only, no code changed
**Verified against:** working tree at commit `e4435d5`, plus live Neon/Supabase documentation (URLs cited inline).

---

## 1. Executive Summary

1. **Difficulty: 3/10.** This is unusually cheap to migrate. The Supabase surface is 11 `.from()` calls, 5 auth calls, 0 RPCs, 0 storage, 0 realtime, 0 edge functions, 0 cron.
2. **The reason it's cheap:** Neon Data API is PostgREST-compatible and ships `auth.uid()` via `pg_session_jwt`, so your RLS model and most of your `.from()` code survive intact. ([docs](https://neon.com/docs/data-api/overview), [RLS](https://neon.com/docs/guides/row-level-security))
3. **Go** — but only with a server-side credit-mutation layer. That work is mandatory regardless of provider.
4. **Biggest blocker is not the migration — it's your current security model.** The browser writes `user_credits` directly with the anon key (`src/components/SearchInterface.tsx:639`), and the RLS policy at `supabase/migrations/20250901193128...sql:114-118` lets any logged-in user set their own credit balance to any number. Any user with devtools can mint unlimited credits *today*. Fix this first.
5. **Second blocker:** Neon Auth is **Beta** and `@neondatabase/postgrest-js` is at `0.2.0-beta`. You are trading a GA provider for two betas to save money on a free-tier app. That is a bad trade.
6. **Two migrations are byte-identical** (SHA256 `24C0614F…`), so `supabase db reset` cannot rebuild this database. Your repo migrations are not a reliable source of truth.
7. **Migration 3 almost certainly failed** — it inserts 3 annual plans with `plan_type` values that violate the `UNIQUE` constraint on `subscription_plans.plan_type` (line 23 vs lines 15-18). Verify production schema drift before trusting any migration.
8. **Total effort: ~34-40 hours** (1.5-2 weeks part-time), of which ~10h is the security fix you owe yourself either way.
9. **If Neon is motivated by cost:** you are already on Supabase's free tier. Migrating to Neon Free (0.5 GB, 100 CU-hours) saves $0.
10. **Verdict: don't migrate for cost. Migrate only if you want Neon branching for previews + a cheaper scale-to-zero story at real traffic.** If neither applies, stay on Supabase and spend the same 10 hours fixing credit integrity.

---

## 2. Inventory (Step 1)

### 2.1 Architecture reality check

| Fact | Evidence |
|---|---|
| Pure client-side SPA, **no backend** | `vite.config.ts` (static build, port 8080, no SSR); `package.json:6-13` scripts are `dev/build/lint/preview/build:assets` only |
| No server framework installed | `package.json:14-84` — no Express/Nest/Hono/Next; `react-router-dom@6.30.1` with `BrowserRouter` (`src/App.tsx:26`) |
| No API routes, no server functions | No `/api`, no `server/`, no `functions/` directory exists |
| No CI/CD | `.github/` does not exist; no `Dockerfile`, `vercel.json`, `netlify.toml` |
| Static deploy to `dist/` | `README.md:244` — "Deploy `dist/` folder to your hosting provider" |
| **Implication** | The browser talks straight to Supabase's PostgREST over HTTPS. **A raw Postgres TCP connection is impossible from a browser.** Any Neon target must be HTTP-based → Neon Data API is the only shape that fits. |

### 2.2 Supabase package usage

| Package | Declared | Actually imported | Verdict |
|---|---|---|---|
| `@supabase/supabase-js@^2.56.1` | `package.json:43` | `src/integrations/supabase/client.ts:2`, `src/contexts/AuthContext.tsx:2` | **Only package used.** No `@supabase/ssr`, no `@supabase/auth-helpers-*`, no `supabase` CLI devDep. |
| `.env` vars | `.env:1-3` | **None.** `client.ts:5-6` hardcodes the URL + publishable key | `.env` is dead config. (Also see 2.7.) |

### 2.3 Client init — single instance

| File | Lines | What |
|---|---|---|
| `src/integrations/supabase/client.ts` | 5-6 | URL `https://yuxxlruhvyqlxsbdzszz.supabase.co` + publishable key **hardcoded** |
| | 11-17 | `createClient<Database>(...)` — browser only, `localStorage` session, `persistSession: true`, `autoRefreshToken: true` |
| | — | Exactly **one** client, created at module scope. No server client, no edge client, no middleware. `service_role` key appears **nowhere** in the repo. |

**Neon impact:** drop-in replacement of one file. No multi-runtime client matrix to untangle.

### 2.4 Database access — all 11 call sites

| # | File | Line | Operation | PostgREST feature used | Neon impact |
|---|---|---|---|---|---|
| 1 | `src/contexts/AuthContext.tsx` | 60-64 | `profiles` `select('*').eq('user_id',uid).single()` | filter, `single()` | ✅ Preserved by Data API |
| 2 | `src/contexts/AuthContext.tsx` | 71-75 | `user_credits` `select('*').eq('user_id',uid).single()` | filter, `single()` | ✅ Preserved |
| 3 | `src/contexts/AuthContext.tsx` | 82-95 | `user_subscriptions` `select('*, subscription_plans(...)').eq(user_id).eq(status,'active').single()` | **embedded resource join**, multi-filter, `single()` | ✅ Preserved (PostgREST embedded syntax) |
| 4 | `src/pages/Dashboard.tsx` | 66-71 | `credit_transactions` `select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(10)` | order, limit | ✅ Preserved |
| 5 | `src/pages/Plans.tsx` | 72 | `subscription_plans` `select('*').order('price_inr')` | order | ✅ Preserved |
| 6 | `src/pages/Plans.tsx` | 73 | `topup_packages` `select('*').order('credits')` | order | ✅ Preserved |
| 7 | `src/pages/Plans.tsx` | 315-321 | `user_credits` **UPDATE** `.eq('user_id',uid)` | write | ⚠️ **Must move server-side — see §6** |
| 8 | `src/pages/Plans.tsx` | 323-330 | `credit_transactions` INSERT | write | ⚠️ **Must move server-side** |
| 9 | `src/pages/Settings.tsx` | 93-96 | `profiles` UPDATE `full_name` `.eq('user_id',uid)` | write | ✅ Safe to keep client-side |
| 10 | `src/components/SearchInterface.tsx` | 639-645 | `user_credits` **UPDATE** (debit) `.eq('user_id',uid)` | write | ⚠️ **Must move server-side** |
| 11 | `src/components/SearchInterface.tsx` | 663-672 | `credit_transactions` INSERT | write | ⚠️ **Must move server-side** |

**Not used anywhere (verified by `rg` across repo, 0 hits):** `.rpc()`, `.storage.from()`, `.channel()` / `postgres_changes`, `functions.invoke()`, `service_role`, `auth.admin.*`, `signInWithOAuth`, `signInWithOTP`, `resetPasswordForEmail`, `updateUser`, MFA, `search()`/full-text, `count: 'exact'`, `.range()`, `csv()`, pagination beyond `.limit()`.

### 2.5 Auth surface — 5 calls, all password-only

| Capability | Status | File:line |
|---|---|---|
| Email + password signUp | ✅ Used | `AuthContext.tsx:159-168` (sets `emailRedirectTo`, `data.full_name`) |
| Email + password signIn | ✅ Used | `AuthContext.tsx:149-152` |
| signOut | ✅ Used | `AuthContext.tsx:173` |
| `getSession()` on boot | ✅ Used | `AuthContext.tsx:134` |
| `onAuthStateChange` | ✅ Used | `AuthContext.tsx:113-131` |
| Google OAuth | ❌ **Not implemented** | — |
| Magic link / OTP | ❌ Not implemented | — |
| Password reset | ❌ **Not implemented** (no recovery flow exists at all) | — |
| Email confirmation handling | ⚠️ Relies on `emailRedirectTo` only | `AuthContext.tsx:157` |
| MFA / admin API | ❌ Not implemented | — |
| `auth.users` read from app | ❌ Never — only FK'd in SQL | — |
| Route guard | ⚠️ **Client-side only** — `Dashboard.tsx:56-59` `navigate("/auth")` after mount | Fails open until React hydrates |

**Correction to your brief:** you listed "Auth (Google + email)". **There is no Google OAuth in this codebase.** Email/password only. This materially lowers migration difficulty.

### 2.6 SQL layer — `supabase/migrations/`

Three files. **Two are byte-identical.**

| File | Lines | Contents |
|---|---|---|
| `20250901193128_61174a3f-….sql` | 197 | Full schema: 1 extension, 3 enums, 6 tables, 9 seed rows, 6× RLS enable, 14 policies, 2 functions, 4 triggers |
| `20250901193148_ae921045-….sql` | 197 | **BYTE-IDENTICAL DUPLICATE** — SHA256 `24C0614F87C8FBD8517E348E02CEA7A97E6643C7FC77A65E62D23ABFB7E3D963` for both |
| `20250902000000_update_pricing_plans.sql` | 55 | 4 UPDATEs, 1 ADD COLUMN, 3 INSERTs, 2 ALTER DEFAULTS, 1 function redefinition |

**Extensions:** `uuid-ossp` only (line 2). No `pgcrypto`, no `pgvector`, no `pg_cron`, no `pg_net`, no `pg_trgm`, no `postgis`.
→ Neon supports all of these anyway; `uuid-ossp` confirmed available ([docs](https://neon.com/docs/extensions/uuid-ossp)). Low risk. Prefer swapping `uuid_generate_v4()` → built-in `gen_random_uuid()` (PG13+) and dropping the extension dependency.

**Schema summary (6 tables):**

| Table | PK | FK → `auth.users` | UNIQUE | Notes |
|---|---|---|---|---|
| `profiles` | `id` uuid | `user_id` **ON DELETE CASCADE** (L12) | `user_id` | 7 cols |
| `subscription_plans` | `id` uuid | — | **`plan_type`** (L23) ⚠️ | 9 cols + `billing_period` |
| `user_credits` | `id` uuid | `user_id` **ON DELETE CASCADE** (L43) | `user_id` | 6 cols, money-like INTEGER |
| `user_subscriptions` | `id` uuid | `user_id` **ON DELETE CASCADE** (L54) | — | 9 cols, `stripe_*` columns **unused in app** |
| `credit_transactions` | `id` uuid | `user_id` **ON DELETE CASCADE** (L68) | — | 6 cols, append-only ledger |
| `topup_packages` | `id` uuid | — | — | 4 cols, 4 seed rows |

**4 FKs to `auth.users`** — these are the migration's real structural coupling.

**Enums (3):** `subscription_plan_type` (free/starter/pro/business), `transaction_type` (deduction/addition/plan_credit/topup), `request_type` (image_generation/normal_search/deep_research). All mirrored in `src/integrations/supabase/types.ts:224-228`.

**Functions (2):**
- `handle_new_user()` (L143-170 / redefined L28-55) — `SECURITY DEFINER`; on signup inserts profile + credits + free subscription + welcome ledger row.
- `update_updated_at_column()` (L178-184) — plain plpgsql, 3 triggers.

**Triggers (4):** `on_auth_user_created` **on `auth.users`** (L173-175) ⚠️ — *this trigger cannot exist on Neon.* Plus 3 `BEFORE UPDATE` `updated_at` triggers (L187-197) — portable as-is.

**RLS (14 policies, all `auth.uid()`-based):** 3× profiles, 3× user_credits, 2× user_subscriptions, 2× credit_transactions, 1× subscription_plans (`USING (true)`), 1× topup_packages (`USING (true)`).

**Generated types:** `src/integrations/supabase/types.ts` (360 lines), `PostgrestVersion: "13.0.4"`. Only used for the `createClient<Database>` generic — no `Tables<>`/`TablesInsert<>` helper is imported anywhere. Trivial to regenerate.

### 2.7 Other references

| Item | Finding |
|---|---|
| `.env` **is git-tracked** | `git ls-files --error-unmatch .env` succeeds; `.gitignore` has **no `.env` entry**. Contains publishable key (JWT payload `role: anon`). *Severity LOW* — publishable/anon keys are designed to be public — but it normalizes committing secrets, and the next person to add a `service_role` var leaks it. |
| `supabase/config.toml` | 1 line: `project_id`. No local dev stack config. |
| README | 13 Supabase references (L9, 109, 140, 159-165, 206, 229, 251-258, 303, 314). L251-252 documents `VITE_SUPABASE_ANON_KEY` — **a var that does not exist in `.env`** (it's `VITE_SUPABASE_PUBLISHABLE_KEY`). Docs already drifted from code. |
| Stripe | `README.md:253` lists `VITE_STRIPE_PUBLISHABLE_KEY`; `src/pages/Plans.tsx:274` is `// Mock Stripe checkout`. **No Stripe SDK, no backend, no webhooks.** DB columns `stripe_price_id` / `stripe_customer_id` / `stripe_subscription_id` are all `NULL`-able and never written. |
| Tests | **None.** No test files, no test runner, no CI. Zero regression safety net. |
| `dist/` | Present locally, gitignored. |

---

## 3. Feature Map (Step 2)

| # | User-visible feature | Supabase capability | Risk | Why |
|---|---|---|---|---|
| 1 | Email/password sign-up | Auth + `auth.users` trigger | **High** | `handle_new_user()` trigger fires **on `auth.users`**, a table Neon does not have. Must be rewritten as app-side code. |
| 2 | Sign in / sign out / session persistence | Auth + localStorage | **Med** | Session mechanism differs; 5 call sites in `AuthContext.tsx`. |
| 3 | View dashboard (credits, plan, recent runs) | PostgREST read | **Low** | 1 query + 3 in `AuthContext`. |
| 4 | Run a search / deep research / image gen | **Direct client-side credit DEBIT** | **High** | `SearchInterface.tsx:639` — client mutates balance. Must become an atomic server RPC. |
| 5 | Business-plan feature gate (8x research, Find All) | `subscription.plan_type` | **Med** | `SearchInterface.tsx:613` — client-side gate; trivially bypassable today. |
| 6 | Buy a plan | DB read only | **Low** | Stripe is mocked (`Plans.tsx:274`). Nothing to migrate. |
| 7 | Buy credit top-up | **Direct client-side credit CREDIT** | **High** | `Plans.tsx:315-321` — adds credits with no payment. Free-credit exploit. |
| 8 | Pricing page (monthly/annual toggle) | PostgREST read | **Low** | `Plans.tsx:72-73`; annual prices partly hardcoded in JS (L108-118). |
| 9 | Edit display name | PostgREST write | **Low** | `Settings.tsx:93`. Benign self-update. |
| 10 | Referral link | localStorage + `user.id` | **Low** | `Settings.tsx:139`. |
| 11 | Delete account | **Not implemented** | **Low** | `Settings.tsx:130` is `// TODO`. Nothing to migrate — but you now owe a real implementation. |

**Features I could not fully understand → Open Questions (Q4, Q5, Q7).**

---

## 4. Gap Analysis: Supabase vs Neon (Step 3)

| Supabase capability | In use? | Verdict | Detail |
|---|---|---|---|
| Plain Postgres (tables, enums, indexes, triggers, plpgsql) | ✅ | ✅ **Direct equivalent** | Identical engine. `pg_dump`/`pg_restore` per [Neon's official Supabase guide](https://neon.com/docs/import/migrate-from-supabase). |
| `uuid-ossp` extension | ✅ | ✅ **Direct equivalent** | Confirmed on Neon ([docs](https://neon.com/docs/extensions/uuid-ossp)). Prefer native `gen_random_uuid()`. |
| **RLS policies** | ✅ 14 policies | ⚠️ **Works, different function** | Neon provides `auth.uid()` (uuid from JWT `sub`) and `auth.user_id()` (text) via `pg_session_jwt` ([RLS docs](https://neon.com/docs/guides/row-level-security), [architecture](https://neon.com/docs/guides/neon-rls)). Your `auth.uid() = user_id` predicates should port **verbatim** — provided `sub` is a valid UUID. `pg_session_jwt` is a Neon-managed extension you do not `CREATE EXTENSION` yourself. |
| **PostgREST data API** | ✅ 11 calls | 🔁 **Replacement available** | Neon **Data API** is "fully compatible with PostgREST" ([docs](https://neon.com/docs/data-api/overview)). Use `@neondatabase/postgrest-js` or `@neondatabase/neon-js`. Preserves `.from().select().eq().single().order().limit()` and embedded joins. **Beta** (npm `0.2.0-beta` / `0.7.0-beta`). |
| **Auth (email/password)** | ✅ 5 calls | 🔁 **Neon Auth** | Managed Better Auth, schema `neon_auth.{user,account,session,verification}` ([auth flow](https://neon.com/docs/auth/authentication-flow)). **Currently Beta.** Session = HTTP-only cookie `__Secure-neonauth.session_token` holding an **opaque token, not a JWT**; the SDK exchanges it for a JWT used on Data API calls. |
| `auth.users` table + insert trigger | ✅ 4 FKs + 1 trigger | ❌ **No equivalent** | `neon_auth.user` exists but Neon does not expose trigger creation on it, and you cannot supply your own user UUID at signup. **This is the hardest part of the migration.** → See §5.3 mapping-table approach. |
| **Storage** | ❌ **not used** | ✅ **N/A — nothing to migrate** | No `.storage.from()`, no buckets, no signed URLs, no `avatar_url` upload flow (`profiles.avatar_url` exists but is never written). |
| **Realtime** | ❌ **not used** | ✅ **N/A** | No `.channel()`, no `postgres_changes`, no broadcast, no presence. |
| **Edge Functions** | ❌ **not used** | ✅ **N/A** | No `supabase/functions/`, no Deno, no webhooks. |
| **Cron / `pg_cron`** | ❌ **not used** | ✅ **N/A** | Zero `pg_cron` / `pg_net` / database webhooks. |
| **RPC functions** | ❌ **not used** | ✅ **N/A — but you need one** | No `.rpc()` today. You *must* add one (§6) to fix the credit exploit. |
| **Connection pooling** | ❌ n/a (HTTP) | ⚠️ **Different concern** | Data API is stateless HTTP — no pool to manage. Only matters if you add a server. |
| `service_role` key | ❌ not used | ✅ **N/A** | Never present. Good — nothing to leak. |
| Generated TS types | ✅ | 🔁 **Regenerate** | `supabase gen types` → Neon Data API type generator ([docs](https://neon.com/docs/data-api/generate-types)). |
| Stripe | ❌ not used | ✅ **N/A** | Mocked in `Plans.tsx:274`. |

**Neon free-tier limits relevant to you** ([FAQ](https://neon.com/faqs/free-plan-limits-and-quotas), [plans](https://neon.com/docs/introduction/plans)):
100 projects · 10 branches/project · **0.5 GB storage/project** · 100 CU-hours/project/month · 5 GB egress/month · scale-to-zero after 5 min · **6-hour instant-restore window, capped at 1 GB of change history** · Neon Auth up to 60k MAU (Beta).
⚠️ **The 6-hour restore window is your rollback plan.** You cannot rely on a point-in-time restore older than 6 hours. Budget for a real `pg_dump` backup before cutover.

---

## 5. Replacement Options (Step 4)

### 5.1 Auth (the only 🔁 with real design work)

| Option | Pros | Cons | Cost | Effort | Lock-in |
|---|---|---|---|---|---|
| **A. Neon Auth (managed Better Auth)** — *recommended* | Zero infra; users live in your DB; **branches with your data** (test signup in preview branches); integrates natively with Data API + `auth.uid()` RLS; free up to 60k MAU | **Beta**; opaque-cookie session model ≠ JWT-in-localStorage; **cannot force your own user UUID** (kills naive FK copy) | Free → $0/mo | 8-12h | Medium (Better Auth is OSS/self-hostable) |
| B. Self-host Better Auth on your own backend | GA library; you own the schema; full UUID control | **Requires standing up a server** you don't have today; you own uptime, email delivery, session security | $0 infra + server cost | 20-30h | Low |
| C. Clerk / Auth0 | GA, polished, best-in-class DX | $25-75/mo at your scale — defeats the "prefer free tier" goal; **new vendor**; Neon Data API still needs JWKS trust configured ([docs](https://neon.com/docs/data-api/custom-authentication-providers)) | Paid | 10-14h | High |

**Recommendation: Option A (Neon Auth).** It is the only option that preserves your RLS-based, server-less architecture *and* the only one with a plausible $0 cost. Accept the Beta risk by keeping the auth boundary thin enough to swap later — and note Better Auth is OSS, so Option B is a genuine escape hatch that requires no app rewrite beyond the client module.

⚠️ **You listed "Neon Auth" as a *maybe*. Don't start here.** Your 11 query call sites are the *easy* part. Auth is the hard part, and it's the part where the Beta badge is.

### 5.2 Data API (PostgREST)

| Option | Pros | Cons | Effort |
|---|---|---|---|
| **A. `@neondatabase/neon-js` / `postgrest-js` over Data API** — *recommended* | Preserves `.from()` syntax, embedded joins, filters; RLS works unchanged; no server; no connection management | npm `0.7.0-beta` / `0.2.0-beta`; requires enabling Data API per branch; JWT round-trip on first request adds latency | 4-6h |
| B. Drizzle + server route + RLS | GA, typed, excellent RLS helpers (`crudPolicy`, [docs](https://neon.com/docs/guides/rls-drizzle)); best long-term | **Requires building a backend from scratch**; rewrites all 11 call sites; breaks the "no server" property | 40h+ |
| C. Drizzle/Kysely direct from browser over WebSocket | No server | **Not viable** — Neon HTTP/WS driver still needs a server for credentials; exposes DB URL to the browser | n/a |

**Recommendation: Option A.** Your call sites are literally PostgREST already. Option B is a rewrite, not a migration — do it later if you want typed queries, not as part of this move. Note Neon *recommends* Drizzle for RLS, which argues for B long-term; but shipping B now means inventing a backend you have never had.

### 5.3 `auth.users` → new auth (the crux)

| Option | Pros | Cons | Effort |
|---|---|---|---|
| **A. Legacy-UID mapping table, zero row rewrites** — *recommended* | Existing `user_id` columns keep **old Supabase UUIDs** → all 4 FKs, all data, all ledger rows stay valid. Add `public.auth_user_map(neon_uid uuid PK, legacy_uid uuid UNIQUE)`. Rewrite only the RLS predicate to resolve through it. | Every policy gains a subquery (negligible at your scale) | 4h |
| B. Re-key all rows to Neon UUIDs | Cleaner long-term; single ID space | Rewrites `profiles`, `user_credits`, `user_subscriptions`, `credit_transactions` — 4 tables, and `credit_transactions` is an append-only financial ledger you must not corrupt | 8-12h + high risk |
| C. Recreate users in `neon_auth.user` with original UUIDs | Preserves IDs | Writes directly to a Neon-managed schema, bypassing Better Auth's hash/session invariants. Unsupported and will break on Neon upgrades | Not recommended |

**Recommendation: Option A.** It is the only one that treats `credit_transactions` as the immutable financial record it should be.

### 5.4 Storage / Realtime / Edge Functions / Cron

**All four are unused.** No replacement work, no cost, no effort. Your brief listed Storage, Realtime and Edge Functions as suspected features — code says otherwise.

### 5.5 Cron / jobs (if you add them later)

Not needed today. If the Stripe integration lands, Neon has [Functions](https://neon.com/docs/compute/functions/overview) with triggers; alternatively an external cron (GitHub Actions / cron-job.org) hitting a server route. Not in scope.

---

## 6. Data Migration Plan (Step 5)

### 6.1 Schema export

Per [Neon's official Supabase→Neon guide](https://neon.com/docs/import/migrate-from-supabase):

```bash
# Export — public schema ONLY. Do NOT dump auth/storage/realtime/extensions/supabase_*.
pg_dump -Fc -v \
  -d "postgresql://postgres:[PASS]@db.[REF].supabase.co:5432/postgres" \
  --schema=public \
  --no-owner --no-acl \
  -f supabase_public.bak

# Restore
pg_restore -d "<neon-unpooled-connection-string>" -v --no-owner --no-acl supabase_public.bak
```

- **`--schema=public` only.** Excluding `auth`, `storage`, `realtime`, `extensions`, `graphql`, `supabase_*` is mandatory — those are Supabase-managed and will not restore to Neon.
- `--no-owner --no-acl` is **required**: Supabase ties ownership to its own auth roles.
- Use an **unpooled** connection string for `pg_dump` (documented requirement).
- **Do not replay the three migration files.** They are broken (duplicate + a UNIQUE violation). Use them as *documentation of intent*, then hand-write one clean `neon/0001_init.sql`.
- Restore into a **Neon branch first**, never production.

### 6.2 Pre-flight schema diff (BLOCKING)

Before trusting the dump, dump production's real schema and diff it against the migrations:

```sql
-- run in Supabase SQL editor
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public' order by 1,2;

select policyname, tablename, cmd, qual, with_check from pg_policies
where schemaname='public' order by tablename, policyname;

select tgname, tgrelid::regclass from pg_trigger where not tgisinternal;
```

Expected drift (both must be confirmed against prod):
- **`subscription_plans.plan_type` UNIQUE** (migration L23) vs. 3 annual rows inserted with duplicate `plan_type` (migration 3, L15-18) → **migration 3 could not have completed.** Either it was applied manually/edited, or the constraint was dropped, or pricing rows were inserted by hand. **Get ground truth before migrating.**
- `handle_new_user()` in prod: does it have `SET search_path = public`? Migrations 1&2 do (L170); migration 3 does **not** (L55). Determines whether you have a live `search_path` hijack.

### 6.3 `auth.users` handling

1. Export identities: `select id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at from auth.users;` (as **migration data only** — do not import the table).
2. For each user, create the account in Neon Auth (Console/API bulk, or let users re-authenticate).
3. **Password hash compatibility:** Supabase GoTrue uses **bcrypt** (`crypt()` from `pgcrypto`, `$2a$`/`$2b$`); Better Auth defaults to **scrypt**. A naive hash copy will not authenticate. Options:
   - **(a) Force password reset** for all users — simplest, zero risk, poor UX. Acceptable if user count is small (⚠️ you have not told me the count — Q1).
   - (b) Run a one-time conversion: log in client-side with old password, re-hash with `auth.api.changePassword()` to scrypt. Requires the plaintext password, so it must run in the browser at next login. Doable but fiddly.
   - **Recommendation: (a)** unless you have many users. Do not attempt (b) casually with a financial ledger in the picture.
4. **Preserve email-verified flags** — set `emailVerified: true` for rows where `email_confirmed_at is not null`, else users get a re-verification email they may not be able to receive.
5. **UUID preservation** → mapping table per §5.3 Option A. **Do not** try to force Neon Auth to mint your old UUIDs.

### 6.4 FKs to `auth.users` — all 4, and the fix

| Table | Constraint | Fix |
|---|---|---|
| `profiles` | `user_id → auth.users(id) ON DELETE CASCADE` (L12) | Drop FK. `user_id` becomes plain `UUID NOT NULL UNIQUE`. Add FK → `auth_user_map(legacy_uid)`. |
| `user_credits` | same (L43) | Same. |
| `user_subscriptions` | same (L54) | Same. |
| `credit_transactions` | same (L68) | Same. ⚠️ This table is an append-only ledger — **never rewrite its `user_id` values.** |

Post-migration deletion of a user is no longer a DB cascade. You must implement it in application code (delete `credit_transactions` → `user_subscriptions` → `user_credits` → `profiles` → `auth_user_map` → Auth user). `Settings.tsx:124` `handleDeleteAccount` is still a `// TODO` — this is where that lands.

### 6.5 RLS rewrite strategy

**Keep RLS. Do not move authorization to the app layer.** Your app has zero backend, so app-layer authz would be pure client-side and therefore worthless.

1. Create `public.auth_user_map(neon_uid uuid PRIMARY KEY, legacy_uid uuid UNIQUE NOT NULL)`.
2. Populate by joining: old `auth.users.id` → new `neon_auth.user.id`, matched on email.
3. Rewrite each policy. Mechanical transform of 14 policies:

```sql
-- BEFORE (Supabase)
CREATE POLICY "Users can view their own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- AFTER (Neon) — same shape, resolved through the map
CREATE POLICY "Users can view their own credits" ON public.user_credits
  FOR SELECT USING (user_id = (
    SELECT legacy_uid FROM public.auth_user_map WHERE neon_uid = auth.uid()
  ));
```
4. **Add explicit `TO authenticated` / `TO anonymous` role targets.** Neon selects the role from the JWT (`access-control` docs: https://neon.com/docs/data-api/access-control). Your two public-read policies (L135-140) must become `TO authenticated, anonymous`; the per-user ones `TO authenticated`.
5. **Add GRANTs.** Neon delegates all access to `GRANT` + RLS. Without explicit grants, queries fail.
6. ⚠️ **Verify `auth.uid()` returns non-NULL.** It casts JWT `sub` to `uuid` and **returns NULL if `sub` is not a valid UUID** ([docs](https://neon.com/docs/auth/authentication-flow)). NULL → every policy denies → app breaks with confusing empty results. **Test this on day one with a single real user before migrating any data.**

### 6.6 Storage files

**None.** No buckets, no files, no URL rewrites. `profiles.avatar_url` is `NULL` for every row (never written by app code).

### 6.7 Extensions
`uuid-ossp` only → supported. Recommended: replace `uuid_generate_v4()` with `gen_random_uuid()` and drop the `CREATE EXTENSION`.

### 6.8 Ordering

Types → functions → tables (FK order: `subscription_plans` → `user_subscriptions`) → `auth_user_map` + FKs → triggers (`updated_at` only) → RLS enable → policies → grants → seed/verify data.
**Drop `on_auth_user_created`** (fires on `auth.users`). Reimplement onboarding in application code.

### 6.9 Validation

```sql
-- Run on BOTH databases, diff the output
select 'profiles', count(*) from public.profiles
union all select 'user_credits', count(*) from public.user_credits
union all select 'user_subscriptions', count(*) from public.user_subscriptions
union all select 'credit_transactions', count(*) from public.credit_transactions
union all select 'subscription_plans', count(*) from public.subscription_plans
union all select 'topup_packages', count(*) from public.topup_packages;

-- Ledger integrity (must be identical)
select user_id, sum(credits_amount) filter (where credits_amount>0)  as earned,
       -sum(credits_amount) filter (where credits_amount<0) as spent
from public.credit_transactions group by user_id order by user_id;

-- Cross-check: ledger vs. balance. MISMATCHES = DATA BUG, fix before cutover
select uc.user_id, uc.total_earned_credits, uc.total_spent_credits,
       uc.current_credits, t.earned, t.spent
from public.user_credits uc
left join (select user_id,
             sum(credits_amount) filter (where credits_amount>0) as earned,
             -sum(credits_amount) filter (where credits_amount<0) as spent
           from public.credit_transactions group by user_id) t
  on t.user_id = uc.user_id
where uc.total_earned_credits is distinct from t.earned
   or uc.total_spent_credits is distinct from t.spent;

-- FK integrity
select count(*) from public.profiles p left join public.auth_user_map m
  on m.legacy_uid = p.user_id where m.neon_uid is null;
```

### 6.10 Cutover

**Downtime: ~30-60 min** (write freeze). Zero-downtime dual-write is unjustified at your scale.

1. **T-1d** — Neon project + branch, Data API enabled, Neon Auth provisioned, `0001_init.sql` applied, mapping table built, **one test user** signs in and passes `auth.uid()` RLS check (§6.5 step 6). Fresh `pg_dump` backup of Supabase.
2. **T-1h** — `pg_dump` public schema → restore to Neon branch. Run §6.9 validation; diff must be zero. Rehearse the full user journey on the branch.
3. **T-0** — **Enable app maintenance mode** (there is no backend to flip; the simplest honest option is to deploy a `maintenance.html` to the static host — you have no CI, so this is manual). Announce.
4. Final incremental dump → restore into production branch. Re-run §6.9.
5. **Delete `.env` / hardcoded creds in `client.ts`, rebuild `dist/`, redeploy the static bundle.** DNS does not change — same host, new bundle.
6. Smoke test: sign up → check profile/credits/subscription auto-provisioned → run a search (credits debit) → buy top-up (credit) → dashboard ledger.
7. Disable maintenance.

**Rollback:** revert the static deploy to the previous `dist/` (keep it, don't delete) and re-enable the Supabase project. Because writes were frozen during the window, Supabase data is authoritative and complete. **Do not rely on Neon point-in-time restore — the free-tier history window is 6 hours / 1 GB.**

---

## 7. Code Change Plan (Step 6)

### Phase 1 — Security fixes (do this on Supabase, before any migration)

These are provider-agnostic. Do them first regardless of decision.

| File | Change |
|---|---|
| `supabase/migrations/` (new) | **Drop** `user_credits` INSERT + UPDATE policies; **drop** `user_subscriptions` INSERT; **drop** `credit_transactions` INSERT. |
| `supabase/migrations/` (new) | Create `SECURITY DEFINER` RPCs: `spend_credits(p_amount int, p_request_type request_type, p_description text)` and `grant_credits(p_amount int, p_type transaction_type, p_description text)`. Must be **atomic** (`UPDATE … WHERE current_credits >= p_amount`, check `ROWCOUNT`, else raise). |
| `supabase/migrations/` (new) | **Re-`SET search_path = public`** on `handle_new_user()` (dropped in migration 3 L55). |
| `src/components/SearchInterface.tsx` | 639-672 → `supabase.rpc('spend_credits', …)`. |
| `src/pages/Plans.tsx` | 315-330 → `supabase.rpc('grant_credits', …)`. |
| `src/pages/Plans.tsx` | **Delete the 1500ms `setTimeout` + optimistic top-up** (L313). Top-ups must be gated on a real payment webhook. |

**This alone closes the free-credits exploit and is worth doing even if you never migrate.**

### Phase 2 — Neon infrastructure (no app code)

- Create Neon project, same Postgres major version as Supabase ([guide](https://neon.com/docs/import/migrate-from-supabase)).
- Enable Data API on the branch; provision Neon Auth; register JWKS.
- Apply `neon/0001_init.sql` (hand-written, clean — **not** the repo migrations).
- `neon/0002_rls.sql` with map-based policies + GRANTs.

### Phase 3 — Client swap (4 files)

| File | Change |
|---|---|
| `src/integrations/supabase/client.ts` | **Delete.** Replace with `src/integrations/db/client.ts` (Neon Data API) + `src/integrations/auth/client.ts` (Neon Auth). Keep the `Database` generic shape. |
| `src/integrations/supabase/types.ts` | Regenerate via [Neon type generation](https://neon.com/docs/data-api/generate-types). |
| `src/contexts/AuthContext.tsx` | 113-131 `onAuthStateChange` → Neon Auth session API; 149-152 `signInWithPassword` → `client.auth.signIn.email`; 159-168 `signUp` → `client.auth.signUp.email` (map `data.full_name` → `name`); 173 `signOut` → `client.auth.signOut`. **`.from()` calls 60-95 stay unchanged.** |
| `src/pages/Dashboard.tsx` / `Plans.tsx` / `Settings.tsx` / `SearchInterface.tsx` | **Import path swap only** — plus Phase 1 RPC changes. No query rewrites. |

**Estimated changed call sites: 5 auth calls + 11 imports + 2 RPC bodies ≈ 18 edits across 6 files.** Queries do not change.

### Connection strategy
- **Data API (HTTP)** from the browser — no TCP, no pooling, no connection limits. `vite.config.ts` needs no change.
- If/when you add a server: use the **pooled** connection string + `@neondatabase/serverless` (v1.1.0, GA). Never the direct URL from a serverless function.

### Env vars

| Remove | Add |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | `VITE_NEON_DATA_API_URL`, `VITE_NEON_AUTH_URL` |
| — | `DATABASE_URL`, `DIRECT_URL` (**server-only**, never `VITE_`-prefixed) |

**Hardening (do regardless):** untrack `.env`, add `.env*` to `.gitignore`, and **stop hardcoding** the Supabase URL/key in `client.ts:5-6`.

### ⚠️ SECURITY-CRITICAL: becomes PUBLICLY EXPOSED if not re-implemented

The single highest-severity item:

1. **`user_credits` INSERT + UPDATE policies** (migration L114-118). Any logged-in user can run in devtools:
   ```
   POST /rest/v1/user_credits?user_id=eq.<own-id>  {"current_credits": 999999}
   ```
   → unlimited credits. **This is exploitable on your production Supabase project right now.** If you migrate and don't carry this over as a *fixed* policy, the same hole reappears. Move to a `SECURITY DEFINER` RPC with a server-authoritative cost table.
2. **`user_subscriptions` INSERT policy** (L124-125) → self-assign the `business` plan; unlocks the 8x/Find-All gate at `SearchInterface.tsx:613`.
3. **`credit_transactions` INSERT policy** (L131-132) → forge/rewrite ledger history; destroys the audit trail §6.9 depends on.
4. **`handle_new_user()` missing `SET search_path`** (migration 3 L55) → `SECURITY DEFINER` search-path hijack.
5. **No `WITH CHECK` on any UPDATE policy** → a user can repoint `user_id` at another user's row in an update.
6. **Client-side-only route guards** (`Dashboard.tsx:56-59`, `SearchInterface.tsx:613`) — `navigate()` after mount, and the plan gate reads a client-held plan. RLS is your only real boundary; keep it correct.
7. **`.env` git-tracked** — low severity today (anon key is public by design), but a `service_role` var added tomorrow leaks immediately.
8. **Relying on RLS without verifying `auth.uid()` returns non-NULL on Neon** → fail-closed, but presents as "empty dashboard", not an error. Instrument it.

---

## 8. Risks & Unknowns (Step 7)

| # | Risk | Sev × Likelihood | Mitigation |
|---|---|---|---|
| R1 | **Credit-balance exploit is live in production** | Critical × High | Phase 1. Ship before any migration decision. |
| R2 | **Neon Auth is Beta** ([docs](https://neon.com/docs/auth/overview)) | High × Medium | Keep auth behind one module. Escape hatch = self-host Better Auth (same API). Do not build other features on Beta assumptions. |
| R3 | **Data API + both clients are `0.x-beta`** | Med × Med | Pin exact versions. Re-verify npm before starting. |
| R4 | **Repo migrations don't reflect production** (duplicate file; migration 3 violates a UNIQUE constraint) | High × High | §6.2 diff. Migrate the **live** schema, never the migration files. |
| R5 | `auth.uid()` returns NULL → all policies silently deny | Med × Med | Day-one single-user test before migrating data. |
| R6 | No tests, no CI → no regression net for an 18-edit refactor | Med × High | Add 3 smoke tests around auth + credit debit. Manual checklist at minimum. |
| R7 | Rollback depends on a static redeploy, not PITR (6h/1GB free window) | Med × Low | Keep the previous `dist/`. Never delete the Supabase project for 30 days. |
| R8 | Neon Free suspends compute at 100 CU-hours → app goes dark | Low × Med | 100 CU-h ≈ 0.25 CU for 400h/month. Fine for <500 users. Monitor. |
| R9 | `ON DELETE CASCADE` to `auth.users` silently disappears | Med × High | Implement delete-account in app code (§6.4). `Settings.tsx:124` is still TODO. |
| R10 | Zero-downtime dual-write is a trap at this scale | Low × Low | Take the 30-60 min freeze. Don't build CDC. |

---

## 9. Open Questions (prioritized)

1. **How many real users, and what is the actual `credit_transactions` row count?** Decides Option (a) force-reset vs. (b) hash conversion (§6.3), and confirms you're inside Neon Free's 0.5 GB.
2. **Why are you migrating — cost, Supabase reliability, branching/previews, or something else?** If the answer is cost, **don't migrate** (you pay $0 either way). If it's branching, say so: it changes the recommendation to a clear **go**.
3. **Is production schema actually in sync with `supabase/migrations/`?** Specifically: does `subscription_plans.plan_type` still have a UNIQUE constraint, and are there duplicate `plan_type` rows (§6.2)? **Blocking.**
4. **Which `subscription_plans` rows exist in production right now** — 4 monthly, 7 with annual, or something else entirely? `Plans.tsx:89-138` synthesizes annual plans in JS *and* reads them from the DB, so the two paths may disagree.
5. **Do you intend real Stripe payments?** `Plans.tsx:274` is mocked; `stripe_*` columns are unused. If payments land soon, plan a webhook server — that's real backend work the migration shouldn't absorb.
6. **Where is the app hosted, and who runs deploys?** No CI, no `vercel.json`. "Deploy `dist/`" is manual (README:244), so cutover is a human copying files.
7. **Is Google OAuth actually required?** You listed it; there is **no OAuth code**. If it's a launch requirement, Neon Auth's `signIn.social()` supports it ([docs](https://neon.com/docs/auth/authentication-flow)) but that's new scope — confirm it's not a "we'll add it later" item.
8. **Do you need password reset?** It doesn't exist today. Neon Auth has it built in ([docs](https://neon.com/docs/auth/overview)) — confirm you actually want it, since it adds an email-delivery dependency you don't currently have.
9. **Is `credit_transactions` legally/financially load-bearing?** If real money is attached to these balances, treat the ledger as immutable, put the debit path in a transactional SQL function, and consider a reconciliation job. This changes Phase 1's scope substantially.
10. **Do you have an `avatar_url` upload feature planned?** The column exists but is never written and Storage is unused. If uploads are planned, decide now between Neon Object Storage ([docs](https://neon.com/docs/storage/overview)) and R2 — it changes the target architecture.

---

## Appendix A — Recommended target architecture

```mermaid
graph TB
    subgraph Browser["Browser (static SPA, unchanged hosting)"]
        UI["React SPA<br/>src/pages/*"]
        AC["AuthContext<br/>Neon Auth SDK"]
        DB["Data API client<br/>@neondatabase/neon-js"]
    end

    subgraph Neon["Neon project"]
        AUTH["Neon Auth (managed Better Auth)<br/><i>BETA</i><br/>neon_auth.{user,account,session}"]
        API["Data API (PostgREST-compatible)<br/><i>Beta</i> — validates JWT, sets role"]
        EXT["pg_session_jwt<br/>provides auth.uid() / auth.user_id()"]
        DBPG[("Lakebase Postgres<br/>public schema<br/>RLS enforced")]
        MAP[("public.auth_user_map<br/>neon_uid → legacy_uid")]

        subgraph Serverless["Serverless fn / edge (NEW — required)"]
            RPC["spend_credits() / grant_credits()<br/>SECURITY DEFINER, atomic"]
        end
    end

    UI --> AC
    AC -->|"HTTPS + session cookie"| AUTH
    AUTH -.->|"returns JWT"| DB
    UI -->|"HTTPS + Bearer JWT"| DB
    DB -->|validates via JWKS| API
    API --> EXT
    EXT -->|sets role authenticated/anonymous| DBPG
    DBPG -->|RLS: user_id = map(legacy_uid)| MAP
    UI -->|"server-only secret"| RPC
    RPC --> DBPG
    DBPG -.->|no cascade FKs; delete in app code| NOTE["⚠️ ON DELETE CASCADE lost"]

    style RPC fill:#1a5c2e,color:#fff
    style MAP fill:#5c3a1a,color:#fff
    style NOTE fill:#5c1a1a,color:#fff
    style AUTH stroke-dasharray: 5 5
    style API stroke-dasharray: 5 5
```

## Appendix B — Phased plan with checklists

### Phase 0 — Decide (no code)
- [ ] Answer Q1 (user count) and Q2 (motivation)
- [ ] Answer Q3 (production schema diff) — **blocking for everything**
- [ ] Decide: migrate / stay
- [ ] If staying: skip to Phase 1 only

### Phase 1 — Fix the credit exploit (Supabase, ship first)
- [ ] Drop `user_credits` INSERT/UPDATE, `user_subscriptions` INSERT, `credit_transactions` INSERT policies
- [ ] Create atomic `spend_credits()` / `grant_credits()` `SECURITY DEFINER` RPCs
- [ ] Re-`SET search_path = public` on `handle_new_user()`
- [ ] Add `WITH CHECK` to every remaining UPDATE policy
- [ ] Repoint `SearchInterface.tsx:639-672` → `rpc('spend_credits')`
- [ ] Repoint `Plans.tsx:315-330` → `rpc('grant_credits')`; delete the 1500ms `setTimeout`
- [ ] Verify: user cannot set own balance via REST
- [ ] **DEPLOY + verify in production**

### Phase 2 — Neon infra (no app code)
- [ ] Create Neon project, matching Postgres major version
- [ ] Enable Data API; provision Neon Auth
- [ ] Write `neon/0001_init.sql` (clean, from live-schema diff)
- [ ] Write `neon/0002_rls.sql` (map-based policies, `TO authenticated/anonymous`, GRANTs)
- [ ] **Day-one test: one real user signs in, `auth.uid()` returns non-NULL, own-row read succeeds, other-row read denied**

### Phase 3 — Data migration (on a branch)
- [ ] `pg_dump --schema=public --no-owner --no-acl`
- [ ] `pg_restore` to Neon branch
- [ ] Export `auth.users` id+email; create Neon Auth accounts; populate `auth_user_map`
- [ ] Run all §6.9 validations — diff must be zero
- [ ] Rehearse full user journey on the branch

### Phase 4 — Code swap
- [ ] Generate Neon types; replace `supabase/types.ts`
- [ ] New `db/client.ts` + `auth/client.ts`; delete `supabase/client.ts`
- [ ] Rewire `AuthContext.tsx` (5 auth calls)
- [ ] Swap imports in 4 page/component files (11 sites, query bodies unchanged)
- [ ] Update env vars; **untrack `.env`, add to `.gitignore`, stop hardcoding creds**
- [ ] `npm run lint` + `npm run build` clean

### Phase 5 — Cutover
- [ ] Fresh `pg_dump` backup of Supabase; keep it
- [ ] Deploy `maintenance.html`
- [ ] Final dump → restore to production branch; re-validate
- [ ] Rebuild + redeploy `dist/` (keep previous build for rollback)
- [ ] Smoke test: signup → auto-provisioning → search debit → top-up → dashboard
- [ ] Remove maintenance
- [ ] Monitor 24h

### Phase 6 — Rollback (any time in first 30 days)
- [ ] Redeploy previous `dist/`
- [ ] Re-enable Supabase project (writes were frozen, so it's authoritative)
- [ ] Do **not** delete the Supabase project before day 30
- [ ] Do **not** rely on Neon PITR (6h/1GB free window)
