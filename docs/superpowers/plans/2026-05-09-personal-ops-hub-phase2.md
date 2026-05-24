# Personal Ops Hub — Phase 2: TaskRepository + BusinessRegistry

**Branch:** `feature/personal-ops-hub-phase2` (stacked on `feature/personal-ops-hub`)
**Date:** 2026-05-09
**PRD:** `docs/prd/personal-ops-hub.md`
**Phase 1 PR:** #15 (must merge before this Phase 2 PR can target master cleanly)
**Goal:** Land 2 stateful service modules (TaskRepository + BusinessRegistry) with real-DB integration tests. Unblocks Phases 4 (API routes) + 6 (mindmap workload integration).

---

## Context

**Working directory for all code:** `contact-manager/`

**Module placement (matches existing `src/lib/<domain>/` pattern):**
- `src/lib/repositories/tasks.ts` — TaskRepository
- `src/lib/repositories/tasks.test.ts` — integration tests
- `src/lib/repositories/businesses.ts` — BusinessRegistry
- `src/lib/repositories/businesses.test.ts` — integration tests

**Style:** Functional, not classes. Each method takes `(db, userId, ...)` explicitly. Matches existing codebase pattern (e.g., `src/lib/supabase/contact-mutations.ts`, `src/lib/media/media.ts`).

**Why functional over class:**
- Easier to tree-shake
- No constructor ceremony in tests
- Matches every other repository-like module already in the codebase

---

## Precondition: Test DB Setup (operator action)

Integration tests require a dedicated Postgres database. **Tests will throw a clear error if `DATABASE_URL_TEST` is not set in `.env.test.local`.**

**Recommended (Option A) — Separate Supabase project (free tier)**
- Already created via MCP: project ref `amfgmckgntsrovdrmojy`, region `ap-northeast-1`
- Phase 1 schema applied via MCP (businesses, tasks, junctions ready)
- Operator one-time: set DB password via dashboard → put connection string in `.env.test.local`

Connection string template (replace `[YOUR-PASSWORD]`):
```
DATABASE_URL_TEST=postgresql://postgres.amfgmckgntsrovdrmojy:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

Get password: https://supabase.com/dashboard/project/amfgmckgntsrovdrmojy/settings/database → "Reset database password" button.

**Alternative (Option B) — Local Docker**
```bash
docker run -d --name personal-ops-test -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16
# DATABASE_URL_TEST=postgres://postgres:test@localhost:5433/postgres
# Note: also need to apply migrations via psql — Supabase MCP only works on Supabase projects
```
db-helper.ts `ssl: connectionString.includes("localhost") ? false : "require"` already handles local-vs-remote SSL.

**Plan assumes operator has set `DATABASE_URL_TEST` before the implementer dispatches run.** Implementer subagents will write tests assuming the env var is set; if missing, tests throw the clear error from Phase 1's `db-helper.ts`.

## Critical: db-helper.ts modification

Phase 1's `db-helper.ts` calls `migrate(db, { migrationsFolder: "drizzle/migrations" })`. This will FAIL because the project doesn't use Drizzle's snapshot-based migration system (no `meta/_journal.json`). The test DB schema is already applied via Supabase MCP (one-time setup) — db-helper.ts must be updated to skip the migrate() call.

**P2-0 (prerequisite task before P2-1):** Modify `contact-manager/src/lib/test/db-helper.ts` — remove the `migrate()` call. Connection only. Document that test DB schema is operator-managed via Supabase MCP.

---

## Tasks

### P2-1 · TaskRepository

**File footprint:**
- `contact-manager/src/lib/repositories/tasks.ts` (new)
- `contact-manager/src/lib/repositories/tasks.test.ts` (new)

**Public interface (functional, all functions take `db` + `userId` explicitly):**

```ts
import type { db as DbType } from "@/lib/db";  // resolve actual import in implementation

export type TaskFilters = {
  projectId?: string | null;          // null = inbox tasks (project_id IS NULL)
  contactId?: string;
  companyId?: string;
  businessId?: string;
  completed?: boolean;                 // false = open tasks, true = done, undefined = both
  dueBefore?: Date;                    // due_date <= dueBefore
  deferredBefore?: Date;               // defer_date IS NULL OR defer_date <= deferredBefore
  parentTaskId?: string | null;        // null = top-level only (parent_task_id IS NULL)
};

export type CreateTaskInput = {
  title: string;                        // required, non-empty
  notes?: string;
  projectId?: string;
  contactId?: string;
  companyId?: string;
  businessId?: string;
  deferDate?: Date;
  dueDate?: Date;
  parentTaskId?: string;
  recurrenceRule?: string;              // RFC 5545 RRULE
};

export type UpdateTaskInput = Partial<CreateTaskInput>;

export type Task = typeof import("@/lib/db/schema").tasks.$inferSelect;

// CRUD + query
export async function listTasks(db: Db, userId: string, filters?: TaskFilters): Promise<Task[]>;
export async function getTask(db: Db, userId: string, id: string): Promise<Task | null>;
export async function createTask(db: Db, userId: string, input: CreateTaskInput): Promise<Task>;
export async function updateTask(db: Db, userId: string, id: string, patch: UpdateTaskInput): Promise<Task | null>;
export async function deleteTask(db: Db, userId: string, id: string): Promise<boolean>;

// Convenience
export async function completeTask(db: Db, userId: string, id: string): Promise<Task | null>;
export async function deferTask(db: Db, userId: string, id: string, deferDate: Date): Promise<Task | null>;

// Tree + entity queries
export async function listSubtasks(db: Db, userId: string, parentTaskId: string): Promise<Task[]>;
export async function listTasksByEntity(
  db: Db,
  userId: string,
  entityType: "contact" | "company" | "project" | "business",
  entityId: string,
): Promise<Task[]>;
```

**ID generation:** Use `crypto.randomUUID()` (built-in Node 20, no new dep). Apply to test data setup AND to repository createTask if it generates IDs (or accept caller-supplied id matching existing schema convention).

**user_id scoping:** Every query MUST filter by `userId` in the WHERE clause. This is the single most important security invariant. RLS policies are a backstop, but app-level filtering must be explicit.

**Server-only marker:** First line of `tasks.ts` MUST be `import "server-only";` to prevent accidental client bundle leak.

**parent_task_id ownership check:** `createTask` and `updateTask` — if `parent_task_id` is provided, SELECT to confirm it belongs to the same userId before insert/update. Reject (throw `Error("parent_task_id not found or not owned by user")`) if not. Add as test case.

**Title validation:** `createTask` and `updateTask` reject empty/whitespace-only title. Throw `Error("title cannot be empty")` after `.trim()`. Add as test case.

**Soft completion:** `completeTask` sets `completed_at = now()`. It does NOT delete. `listTasks({ completed: false })` filters by `completed_at IS NULL`.

**Defer semantics:** `deferTask` sets `defer_date`. Caller's responsibility to validate that defer_date >= now() if desired. Repository does not enforce business rules.

**Update semantics:** `updateTask` returns `null` if the task doesn't exist for that user_id (RLS-equivalent at app layer). Returns the updated row otherwise. Always bumps `updated_at`.

**Recurrence:** Phase 2 does NOT spawn next instances on completion — that's Phase 3 (RecurrenceEngine integration). For Phase 2, completing a recurring task just sets completed_at. Document this in code comments.

**Error contract:**
- Throws on: DB connection error, FK violation, validation error (empty title, parent ownership)
- Returns null on: get/update where row not found OR not owned by userId
- Returns false on: delete where row not found OR not owned by userId
- Cycle prevention in subtask tree: deferred to Phase 3 (SubtaskTree module). Phase 2 createTask/updateTask allows ANY parent_task_id from same user (no cycle check). Document.

#### Tests (TDD — failing tests committed first)

Use `createTestDb()` from `src/lib/test/db-helper.ts`. Per spec policy: real DB, no mocks.

**Test structure pattern:**
```ts
import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert";
import { nanoid } from "nanoid";  // or crypto.randomUUID
import { createTestDb, teardownTestDb } from "@/lib/test/db-helper";
import { listTasks, createTask, /* ... */ } from "./tasks";

describe("TaskRepository", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  let client: Awaited<ReturnType<typeof createTestDb>>["client"];
  let userId: string;

  beforeEach(async () => {
    ({ db, client } = await createTestDb());
    userId = `test-user-${nanoid()}`;
    // Each test gets a fresh user_id → no cross-test contamination
  });

  afterEach(async () => {
    await teardownTestDb(client);
  });

  // ... tests
});
```

**Required test coverage (each is a separate `it()`):**

CRUD round-trip:
1. `createTask` returns task with id, user_id matches, defaults applied
2. `getTask` returns the created task
3. `getTask` returns null for non-existent id
4. `getTask` returns null when id exists but user_id doesn't match (cross-user isolation)
5. `updateTask` patches scalar fields, bumps updated_at
6. `updateTask` returns null when id doesn't exist for that user
7. `deleteTask` removes the row, returns true; returns false if not found
8. `listTasks` with no filters returns all tasks for the user_id

Filters:
9. `listTasks({ completed: false })` excludes completed tasks
10. `listTasks({ completed: true })` excludes open tasks
11. `listTasks({ projectId: 'X' })` filters by project
12. `listTasks({ projectId: null })` returns inbox (project_id IS NULL)
13. `listTasks({ businessId: 'X' })` filters by business
14. `listTasks({ contactId: 'X' })` filters by contact
15. `listTasks({ companyId: 'X' })` filters by company
16. `listTasks({ dueBefore: someDate })` filters by due_date <= someDate
17. `listTasks({ deferredBefore: someDate })` includes tasks where defer_date IS NULL
18. `listTasks({ parentTaskId: null })` returns only top-level tasks

Cross-user isolation:
19. User A's tasks NOT returned in `listTasks` for User B
20. User A cannot `updateTask` on User B's task → returns null
21. User A cannot `deleteTask` on User B's task → returns false

Convenience methods:
22. `completeTask` sets completed_at, returns updated task
23. `completeTask` is idempotent — completing twice does not error
24. `deferTask` sets defer_date

Tree + entity queries:
25. `listSubtasks` returns children of a parent task
26. `listSubtasks` returns empty array for parent with no children
27. `listTasksByEntity('contact', id)` returns tasks linked to that contact
28. `listTasksByEntity('business', id)` returns tasks linked to that business

Cascade behavior (FK ON DELETE SET NULL):
29. Deleting the linked project sets task.project_id to null (does not delete task)
30. Deleting the linked contact sets task.contact_id to null

**Acceptance criteria:**
1. All 30 tests pass via `npm test`
2. `npx tsc --noEmit` exits 0
3. Every method explicitly filters by user_id in the WHERE clause (verifiable by grep)
4. Tests follow TDD: failing tests committed first (separate commit) before implementation
5. No mocks — every test uses `createTestDb()`

**Test plan (TDD):** Write 5–6 tests at a time, commit failing, implement enough to pass, repeat. Don't write all 30 tests upfront (anti-pattern per skill).

---

### P2-2 · BusinessRegistry

**File footprint:**
- `contact-manager/src/lib/repositories/businesses.ts` (new)
- `contact-manager/src/lib/repositories/businesses.test.ts` (new)

**Public interface:**

```ts
export type Business = typeof import("@/lib/db/schema").businesses.$inferSelect;
export type EntityType = "contact" | "company" | "vendor";

export type CreateBusinessInput = {
  name: string;
  color?: string;  // defaults to '#6b7280' from DB
};

export type UpdateBusinessInput = Partial<CreateBusinessInput>;

// CRUD
export async function listBusinesses(db: Db, userId: string): Promise<Business[]>;
export async function getBusiness(db: Db, userId: string, id: string): Promise<Business | null>;
export async function createBusiness(db: Db, userId: string, input: CreateBusinessInput): Promise<Business>;
export async function updateBusiness(db: Db, userId: string, id: string, patch: UpdateBusinessInput): Promise<Business | null>;
export async function deleteBusiness(db: Db, userId: string, id: string): Promise<boolean>;

// Junction operations
export async function attachEntityToBusiness(
  db: Db,
  userId: string,
  entityType: EntityType,
  entityId: string,
  businessId: string,
): Promise<void>;

export async function detachEntityFromBusiness(
  db: Db,
  userId: string,
  entityType: EntityType,
  entityId: string,
  businessId: string,
): Promise<void>;

export async function listBusinessesForEntity(
  db: Db,
  userId: string,
  entityType: EntityType,
  entityId: string,
): Promise<Business[]>;

export async function listEntitiesForBusiness(
  db: Db,
  userId: string,
  businessId: string,
  entityType: EntityType,
): Promise<Array<{ id: string; name: string }>>;
```

**Server-only marker:** First line of `businesses.ts` MUST be `import "server-only";`.

**Junction table dispatch:** The `attach/detach/listFor*` functions must dispatch on `entityType` to the correct junction table (contact_businesses, company_businesses, vendor_businesses). Use a discriminated switch — no dynamic table name interpolation (SQL injection risk).

**Ownership check on attach/detach:** Before inserting into `contact_businesses`, verify the contact AND business both belong to the user_id. Otherwise a malicious caller could attach another user's contact to their own business. Same for company/vendor.

**TOCTOU note:** SELECT-verify + INSERT is two queries with no transaction. Between them, the entity could be transferred. For single-user app, this is acceptable (documented limitation). Phase 4 API layer can wrap in transaction if needed.

**Idempotency:** `attach` should be idempotent — calling it twice with same args should not error. Use `INSERT ... ON CONFLICT DO NOTHING` since composite PK exists.

**Cascade:** Deleting a business CASCADES to junction rows (per migration's `ON DELETE CASCADE`). Tests must verify.

**listEntitiesForBusiness performance:** MUST use a single JOIN query (junction → entity), NOT a loop fetching each entity individually. Spec reviewer checks the SQL.

#### Tests

Same structure as TaskRepository (createTestDb per test, fresh userId per test).

**Required coverage (separate `it()` blocks):**

CRUD:
1. `createBusiness` returns business with id, default color applied
2. `createBusiness` with explicit color uses that color
3. `getBusiness` returns the created business
4. `getBusiness` returns null for non-existent id
5. `getBusiness` returns null for cross-user id
6. `updateBusiness` patches name and/or color
7. `updateBusiness` returns null for cross-user id
8. `deleteBusiness` removes the row, returns true
9. `deleteBusiness` returns false for non-existent or cross-user
10. `listBusinesses` returns all for user_id, ordered by created_at

Junction operations (test against a real contact + business):
11. `attachEntityToBusiness('contact', contactId, businessId)` creates junction row
12. `attach` is idempotent — second call does not error or create duplicate
13. `attach` rejects if contact belongs to a different user (throws or returns silently — define which)
14. `attach` rejects if business belongs to a different user
15. `detach` removes junction row
16. `detach` is idempotent (no-op if not attached)
17. `listBusinessesForEntity('contact', contactId)` returns attached businesses
18. `listEntitiesForBusiness(businessId, 'contact')` returns attached contacts (id + name)

Same as 11–18 but for `company` and `vendor` entity types (6 more tests = 11c, 11v, etc.). To keep test count manageable, parametrize: one `describe` block per entity type that runs the same 4 attach/detach/list tests.

Cascade:
19. Deleting a business cascades to all junction rows (contact_businesses, company_businesses, vendor_businesses)
20. Deleting a contact cascades to contact_businesses but NOT to the business

Cross-user isolation: covered above by tests 5, 7, 9, 13, 14.

**Acceptance criteria:**
1. ~30 tests pass via `npm test`
2. `npx tsc --noEmit` exits 0
3. attach/detach use ownership checks — verify via grep + spec review
4. Junction table dispatch uses static table names (no dynamic SQL)
5. TDD discipline: failing tests committed before implementation

---

## Parallel dispatch plan

| Task | Depends on | Model | Why |
|------|------------|-------|-----|
| P2-1 TaskRepository | — | Sonnet | Multi-file integration, ownership checks, real-DB tests |
| P2-2 BusinessRegistry | — | Sonnet | Junction dispatch + ownership checks need judgment |

P2-1 and P2-2 have **disjoint file footprint** (different files) and **disjoint module deps** (neither imports the other). **BUT** they both write to the same git repo. Per Phase 1 lessons (Notes/personal-ops-phase1-lessons.md §6), parallel agents on same git repo can race. **Decision: SEQUENTIAL dispatch.** P2-1 first → review pass → P2-2.

---

## Definition of Done (Phase 2)

- [ ] `npm test` exits 0 (existing 145 tests + ~60 new = ~205 total)
- [ ] All 145 EXISTING tests still pass (regression gate)
- [ ] `npx tsc --noEmit` exits 0
- [ ] All repository methods filter by user_id explicitly (grep verification)
- [ ] Both `tasks.ts` and `businesses.ts` have `import "server-only"` at top
- [ ] No mocks anywhere — every test uses real DB via `createTestDb()`
- [ ] TDD commit order verified — failing tests precede implementation in git log
- [ ] Vitest config serializes test execution: `pool: 'forks'` + `poolOptions: { forks: { singleFork: true } }` in `vitest.config.ts`
- [ ] Both tasks reviewed (spec + code quality) and APPROVED
- [ ] Final reviewer APPROVED
- [ ] When PR #15 (Phase 1) merges to master: rebase this branch onto master before opening Phase 2 PR
- [ ] PR opened against master (after rebase) OR against `feature/personal-ops-hub` (stacked, before merge)

---

## Risk watchlist

1. **Ownership check bypass on attach/detach.** If implementer skips the cross-user verification, junction tables can leak entity references. Mitigation: explicit test (#13, #14), spec reviewer checks for the SELECT-then-INSERT pattern.

2. **Drizzle TypeScript inference for partial updates.** `Partial<CreateTaskInput>` may not align cleanly with Drizzle's `update().set(...)` types. If implementer hits friction, may need an explicit allowlist of updatable columns (similar to how Phase 1's perf rewrite handled scalar-vs-relation field separation in `useUpdateContact`). Mitigation: implementer can ask if blocked.

3. **Test DB ssl misconfiguration.** Supabase requires SSL. db-helper.ts already handles localhost vs remote. If operator's `DATABASE_URL_TEST` includes `?sslmode=...` query param, postgres.js may double-handle it. Mitigation: document this in the .env.test.example warning if it surfaces.

4. **Test isolation.** Per-test fresh userId is good, but the test DB schema persists across tests. If a test crashes mid-INSERT, partial state may leak. Acceptable trade-off — alternative is per-test schema reset which is much slower.

---

## After dispatch — operator must do BEFORE running tests

Set `DATABASE_URL_TEST` in `contact-manager/.env.test.local`. Choose Option A, B, or C from precondition section above. **Tests will not run without this.**
