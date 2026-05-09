# Personal Ops Hub — Phase 1: Schema + Test Infrastructure

**Branch:** `feature/personal-ops-hub`  
**Date:** 2026-05-09  
**PRD:** `docs/prd/personal-ops-hub.md`  
**Goal:** Land all new DB tables + migrations + Vitest test infra. Zero UI. Unblocks Phases 2–6.

---

## Context

Repo: `contact-manager/` subdir. Working dir for all commands: `contact-manager/`.

Key conventions (match exactly):
- Schema: single file `src/lib/db/schema.ts`
- ID columns: `text("id").primaryKey()` — no uuid, no default (caller supplies nanoid/uuid)
- `user_id`: `text("user_id")` on most tables (match existing pattern; NOT uuid)
- Migrations: `drizzle/migrations/` — date-prefix filenames e.g. `20260509_*.sql`
- drizzle.config.ts reads `DATABASE_URL` from `.env.local`
- All RLS enforced at Supabase layer; Drizzle schema itself has no RLS config
- `created_at`: `timestamp("created_at").defaultNow().notNull()`
- `updated_at`: `timestamp("updated_at").defaultNow().notNull()`

---

## Tasks

### P1-1 · Schema additions

**File footprint:** `contact-manager/src/lib/db/schema.ts`

**What to build:**

Append to `src/lib/db/schema.ts` (do NOT create new files — match existing single-file pattern):

#### 1. `businesses` table

```ts
export const businesses = pgTable("businesses", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6b7280"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("businesses_user_id_idx").on(t.user_id),
]);
```

#### 2. `tasks` table

```ts
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  project_id: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  contact_id: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  company_id: text("company_id").references(() => companies.id, { onDelete: "set null" }),
  business_id: text("business_id").references(() => businesses.id, { onDelete: "set null" }),
  defer_date: timestamp("defer_date", { withTimezone: true }),
  due_date: timestamp("due_date", { withTimezone: true }),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  parent_task_id: text("parent_task_id"), // self-ref added after table def
  recurrence_rule: text("recurrence_rule"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("tasks_user_id_idx").on(t.user_id),
  index("tasks_user_due_date_idx").on(t.user_id, t.due_date),
  index("tasks_user_defer_date_idx").on(t.user_id, t.defer_date),
  index("tasks_parent_task_id_idx").on(t.parent_task_id),
]);
```

> Note: `parent_task_id` self-reference — add FK via `.references(() => tasks.id, { onDelete: "set null" })` inline. Drizzle handles forward refs within same file.

#### 3. Junction tables

```ts
export const contactBusinesses = pgTable("contact_businesses", {
  contact_id: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  business_id: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.contact_id, t.business_id] }),
  index("contact_businesses_business_id_idx").on(t.business_id),
]);

export const companyBusinesses = pgTable("company_businesses", {
  company_id: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  business_id: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.company_id, t.business_id] }),
  index("company_businesses_business_id_idx").on(t.business_id),
]);

export const vendorBusinesses = pgTable("vendor_businesses", {
  vendor_id: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  business_id: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.vendor_id, t.business_id] }),
  index("vendor_businesses_business_id_idx").on(t.business_id),
]);
```

#### 4. Add `business_id` FK to existing tables

In `projects` table definition, add:
```ts
business_id: text("business_id").references(() => businesses.id, { onDelete: "set null" }),
```

In `followUps` table definition, add:
```ts
business_id: text("business_id").references(() => businesses.id, { onDelete: "set null" }),
```

> `businesses` table must be defined BEFORE `projects` and `followUps` in the file, or move the `businesses` definition to be above them. Check ordering in schema.ts.

**After schema edits — generate migration:**

```bash
cd contact-manager
npx drizzle-kit generate
```

This outputs a new SQL file in `drizzle/migrations/`. Verify it contains:
- `CREATE TABLE businesses`
- `CREATE TABLE tasks`
- `CREATE TABLE contact_businesses`, `company_businesses`, `vendor_businesses`
- `ALTER TABLE projects ADD COLUMN business_id`
- `ALTER TABLE follow_ups ADD COLUMN business_id`
- All 4 indexes on `tasks`

**Acceptance criteria:**
1. `npx drizzle-kit generate` exits 0
2. Generated migration SQL contains all 5 new tables + 2 ALTER TABLE + 4 indexes
3. `npx tsc --noEmit` exits 0 (no type errors)
4. `businesses` defined before `projects`/`followUps` in schema.ts (forward ref avoidance)
5. Self-referential `parent_task_id` FK compiles without error

**Test plan:** TypeScript compilation (`npx tsc --noEmit`) is the test — schema correctness is structural. No runtime test needed for schema file alone. Migration application tested in P1-2.

---

### P1-2 · Backfill migration (depends on P1-1)

**File footprint:** `contact-manager/drizzle/migrations/20260509_personal_ops_backfill.sql`

> Run AFTER P1-1 so migration sequence is correct. Check the generated migration filename from P1-1 first — this backfill must sort after it alphabetically/chronologically.

**What to build:**

Create `drizzle/migrations/20260509_personal_ops_backfill.sql`:

```sql
-- Seed businesses from owned companies
-- Runs after 20260509_personal_ops_hub_schema.sql (or whatever drizzle-kit named it)

INSERT INTO businesses (id, user_id, name, color, created_at)
SELECT
  'biz-' || id AS id,
  user_id,
  name,
  '#6b7280' AS color,
  created_at
FROM companies
WHERE is_owned = true
  AND user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;
```

> `'biz-' || id` prefix avoids ID collision with future business rows created by user. IDs in this app are caller-supplied strings, not sequences.

**Acceptance criteria:**
1. File exists at `drizzle/migrations/20260509_personal_ops_backfill.sql`
2. SQL is valid — no syntax errors (verify with `psql --command` dry-run or manual inspection)
3. `ON CONFLICT DO NOTHING` present — idempotent re-run safe
4. Only inserts when `is_owned = true AND user_id IS NOT NULL`

**Test plan:** Manual dry-run on test DB (or visual inspection). Integration tests for TaskRepository/BusinessRegistry in Phase 2 will validate the businesses table is queryable. No automated test in this task.

---

### P1-3 · Vitest + test infrastructure + CI (independent of P1-1/P1-2)

**File footprint:**
- `contact-manager/vitest.config.ts` (new)
- `contact-manager/src/lib/test/db-helper.ts` (new)
- `contact-manager/src/lib/test/setup.ts` (new)
- `contact-manager/package.json` (modify `test` script)
- `.github/workflows/ci.yml` (new — repo root level, not inside contact-manager/)
- `contact-manager/.env.test.example` (new — documents required env vars)

**What to build:**

#### Install Vitest

```bash
cd contact-manager
npm install --save-dev vitest @vitest/coverage-v8
```

Do NOT install `@vitest/ui` — not needed.

#### `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/lib/test/setup.ts"],
    env: {
      NODE_ENV: "test",
    },
  },
});
```

#### `src/lib/test/setup.ts`

```ts
import * as dotenv from "dotenv";

// Just loads .env.test.local. Guard lives in createTestDb(), not here —
// so smoke tests (which don't call createTestDb) pass without DATABASE_URL_TEST.
dotenv.config({ path: ".env.test.local" });
```

#### `src/lib/test/db-helper.ts`

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "../db/schema";

export async function createTestDb() {
  if (!process.env.DATABASE_URL_TEST) {
    throw new Error(
      "DATABASE_URL_TEST is not set. Copy .env.test.example → .env.test.local. " +
      "Use a DEDICATED test database — NOT production."
    );
  }
  const connectionString = process.env.DATABASE_URL_TEST;
  const client = postgres(connectionString, { ssl: "require" });
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder: "drizzle/migrations" });

  return { db, client };
}

export async function teardownTestDb(client: ReturnType<typeof postgres>) {
  await client.end();
}
```

> Note: `postgres` package must be installed. Check if already in deps (`pg` was removed in perf rewrite). If not present: `npm install postgres`.

#### Update `package.json` test script

Replace:
```json
"test": "tsx --test \"src/**/*.test.ts\" \"src/**/*.test.tsx\""
```
With:
```json
"test": "vitest run",
"test:watch": "vitest"
```

#### `contact-manager/.env.test.example`

```
# Copy to .env.test.local (git-ignored) and fill in.
# ⚠️  USE A DEDICATED TEST DATABASE — NOT PRODUCTION.
# Running tests applies Drizzle migrations to this DB.
# Pointing at prod will mutate prod schema before Vercel deploys.
DATABASE_URL_TEST=postgres://...
```

Add `.env.test.local` to `contact-manager/.gitignore`.

#### `.github/workflows/ci.yml` (repo root level)

```yaml
name: CI

on:
  pull_request:
    branches: [master]
  push:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: contact-manager

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: contact-manager/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test
        env:
          DATABASE_URL_TEST: ${{ secrets.DATABASE_URL_TEST }}

  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: contact-manager

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: contact-manager/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Write a smoke test** to verify Vitest works:

`src/lib/test/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("Vitest smoke test", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Acceptance criteria:**
1. `npm test` runs Vitest and exits 0 (smoke test passes without `DATABASE_URL_TEST` set)
2. `vitest.config.ts` present, environment: node, globals: true
3. `db-helper.ts` exports `createTestDb` and `teardownTestDb`; guard is in `createTestDb()` NOT in `setup.ts`
4. `setup.ts` is a dotenv loader only — does NOT throw on missing env vars
5. `.github/workflows/ci.yml` exists at repo root; runs `npm test` + type-check + lint + build
6. `.env.test.example` documents `DATABASE_URL_TEST` with explicit production-safety warning
7. `.env.test.local` added to `.gitignore`
8. `postgres` package installed (check `package.json` deps; install if missing)
9. Checked for existing `*.test.ts` files using `node:test` API — if any found, migrated to Vitest syntax before replacing test script

**Test plan:** `npm test` executing `src/lib/test/smoke.test.ts` and passing is the acceptance gate. No DB needed for smoke test — DATABASE_URL_TEST not set will throw in setup, but smoke test doesn't call `createTestDb`.

> Implementer note: `setup.ts` throws if `DATABASE_URL_TEST` missing. This means `npm test` fails in CI unless the secret is set. Conditionally check: `if (!process.env.DATABASE_URL_TEST && process.env.NODE_ENV !== 'test') throw`. Better: move the guard into `createTestDb()` itself, not in `setup.ts`. Remove the global setup guard entirely — let `createTestDb` throw at call time. This way smoke tests (which don't call `createTestDb`) pass without `DATABASE_URL_TEST`.

---

## Parallel dispatch plan

| Task | Depends on | Model |
|------|------------|-------|
| P1-1 Schema additions | — | Sonnet (multi-file schema edit + migration) |
| P1-3 Vitest + CI | — | Haiku (mechanical: config files + package.json) |
| P1-2 Backfill migration | P1-1 (migration file must exist) | Haiku (single SQL file) |

P1-1 + P1-3 dispatch in parallel (disjoint file footprint). P1-2 dispatched after P1-1 PASS.

---

## File footprint table (parallel safety check)

| File | P1-1 | P1-2 | P1-3 |
|------|------|------|------|
| `src/lib/db/schema.ts` | ✏️ | — | — |
| `drizzle/migrations/20260509_*.sql` | ✏️ (generated) | ✏️ (backfill) | — |
| `vitest.config.ts` | — | — | ✏️ |
| `src/lib/test/*.ts` | — | — | ✏️ |
| `package.json` | — | — | ✏️ |
| `.github/workflows/ci.yml` | — | — | ✏️ |

P1-1 and P1-3 are fully disjoint. ✅ Safe to parallel-dispatch.  
P1-2 touches `drizzle/migrations/` — same folder as P1-1's output, but different file. Sequential is safer (wait for P1-1 to commit first).

---

## Definition of Done (Phase 1)

- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm test` exits 0 (smoke test passes without DATABASE_URL_TEST)
- [ ] `npx drizzle-kit generate` produces migration with all 5 new tables + 2 ALTER TABLE + 7 indexes
- [ ] `businesses` defined above `projects` and `followUps` in schema.ts
- [ ] Backfill SQL present and idempotent (`ON CONFLICT DO NOTHING`)
- [ ] `.github/workflows/ci.yml` committed at repo root
- [ ] No existing `.test.ts` files use `node:test` API (verify or migrate them)
- [ ] All 3 tasks reviewed (spec + code quality) and APPROVED

## One-time Operator Setup (before CI runs)

Add these secrets to GitHub repo Settings → Secrets → Actions:
- `DATABASE_URL_TEST` — dedicated test Postgres DB (NOT production)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`

## Rollback SQL (if migration must be reverted manually)

```sql
ALTER TABLE projects DROP COLUMN IF EXISTS business_id;
ALTER TABLE follow_ups DROP COLUMN IF EXISTS business_id;
DROP TABLE IF EXISTS vendor_businesses;
DROP TABLE IF EXISTS company_businesses;
DROP TABLE IF EXISTS contact_businesses;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS businesses;
```
