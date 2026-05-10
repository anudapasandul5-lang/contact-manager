# Personal Ops Hub — Phase 3 Design: Pure-fn Trio

**Date:** 2026-05-10
**Branch:** `feature/personal-ops-hub-phase3` (fresh from `contact-manager/master`)
**PRD:** `docs/prd/personal-ops-hub.md`
**Phases done:** Phase 1 (test infra, PR #15), Phase 2 (TaskRepository + BusinessRegistry, PR #16)
**Goal:** Land 3 pure-function modules — ForecastBuckets, RecurrenceEngine, SubtaskTree — with full unit-test coverage. Unblocks Phase 4 (API routes), Phase 5 (forecast UI), and Phase 6 (mindmap workload integration).

---

## Architecture

Three pure-function modules. No DB. No I/O. No React. No mocks needed — pure inputs → pure outputs. Vitest unit tests with golden inputs. TDD discipline matches Phase 2: failing tests committed before implementation.

**Working directory:** `contact-manager/` (submodule).

**File footprint:**
- `src/lib/forecast/buckets.ts` + `buckets.test.ts`
- `src/lib/recurrence/engine.ts` + `engine.test.ts`
- `src/lib/subtasks/tree.ts` + `tree.test.ts`

**New runtime deps:** `rrule@^2.8` (RFC 5545 parser used by Module 2).
**No date library** — native `Date` + `Intl.DateTimeFormat(tz, opts).formatToParts()` for tz arithmetic. Node 20+ supports this cleanly.

**Style:** Functional. Named exports. No classes. Each function takes explicit inputs — no module-level state, no singletons.

**Server-only marker:** None of these modules touch DB or secrets, so they MAY be imported from client code. No `import "server-only"` needed (different from Phase 2 repos).

---

## Module 1: ForecastBuckets

`src/lib/forecast/buckets.ts`

### Public interface

```ts
import type { Task } from "@/lib/repositories/tasks";

export type Bucket = "overdue" | "today" | "tomorrow" | "thisWeek" | "later" | "noDate";
export type BucketedTasks = Record<Bucket, Task[]>;

export function bucketize(tasks: Task[], now: Date, tz: string): BucketedTasks;
```

### Bucket rules

Run in this order (first match wins):

1. **Filter out** any task where:
   - `completed_at != null` (done)
   - `parent_task_id != null` (subtask — only top-level in forecast)
   - `defer_date != null && defer_date > now` (deferred)
2. **`overdue`** — `due_date != null && due_date < startOfToday(tz)`
3. **`today`** — `due_date` falls within `[startOfToday(tz), endOfToday(tz)]`
4. **`tomorrow`** — `due_date` falls within tomorrow (00:00–23:59:59 in tz)
5. **`thisWeek`** — `due_date` is between day-after-tomorrow and end of current ISO week (Sunday 23:59:59 in tz)
6. **`later`** — `due_date >= next Monday in tz`
7. **`noDate`** — `due_date == null` AND not deferred (already filtered above)

### Timezone math

Use `Intl.DateTimeFormat(tz, { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)` to extract calendar fields in `tz`. Build a `Date` for `startOfToday(tz)` by composing the y/m/d at 00:00 and computing the UTC offset for that wall-clock moment.

Helper functions kept module-local:
- `startOfDay(date: Date, tz: string): Date`
- `endOfDay(date: Date, tz: string): Date`
- `addDays(date: Date, n: number): Date` (UTC arithmetic, tz-agnostic)
- `endOfIsoWeek(date: Date, tz: string): Date` (Sunday 23:59:59 in tz)

### Error contract

- Throws on invalid `tz` string (`Intl.DateTimeFormat` will throw `RangeError`)
- Empty `tasks` array → all buckets empty arrays
- `now` MUST be a valid Date — caller's responsibility

### Tests (≈18)

Golden-input tests against frozen `now`:

1. Empty input → all buckets empty
2. All-completed → all buckets empty
3. All-subtasks → all buckets empty
4. Single task with `due_date == null` → `noDate`
5. Task overdue by 1 day → `overdue`
6. Task overdue by 1 hour (across midnight in tz) → `overdue`
7. Task due today at 09:00 in `Asia/Colombo` → `today`
8. Task due today at 23:30 in `Asia/Colombo` → `today`
9. Task due tomorrow → `tomorrow`
10. Task due day after tomorrow → `thisWeek`
11. Task due Sunday end-of-week → `thisWeek`
12. Task due next Monday → `later`
13. Task with `defer_date` in future → filtered out (none of the buckets)
14. Task with `defer_date` in past + due tomorrow → `tomorrow` (defer expired)
15. Tz boundary — task at 22:00 UTC, `tz=Asia/Colombo` (UTC+5:30) → wall-clock 03:30 next day → bucket reflects Colombo day, not UTC
16. Tz boundary — task at 22:00 UTC, `tz=America/New_York` (UTC-5) → wall-clock 17:00 same day → bucket reflects NYC day
17. Leap day handling — `now=2028-02-29`, task due `2028-03-01` → `tomorrow`
18. Invalid tz string → throws `RangeError`

---

## Module 2: RecurrenceEngine

`src/lib/recurrence/engine.ts`

### Public interface

```ts
export type ValidationResult = { ok: true } | { ok: false; error: string };

export function nextInstance(rruleStr: string, after: Date): Date | null;
export function expandUntil(rruleStr: string, after: Date, until: Date): Date[];
export function validateRrule(rruleStr: string): ValidationResult;
```

### Semantics

- `nextInstance(rrule, after)` — first occurrence strictly after `after`. Returns `null` if `COUNT` or `UNTIL` exhausted.
- `expandUntil(rrule, after, until)` — all occurrences in `(after, until]`, sorted ascending. Used by digest backfill cron to surface missed recurrences.
- `validateRrule(rrule)` — wraps `RRule.fromString` in try/catch. Returns `{ok: true}` or `{ok: false, error: <message>}`. Used by API to reject malformed input.

### Implementation notes

- Use `rrule` npm package directly. Construct with `RRule.fromString(rruleStr)`.
- `nextInstance` calls `rule.after(after, false)` (`false` = exclusive of `after`).
- `expandUntil` calls `rule.between(after, until, false, true)` (start exclusive, end inclusive).
- DTSTART handling: if `rrule` string has DTSTART, use it; else require caller-supplied DTSTART encoded into `rruleStr` (validation catches missing).
- All dates in/out are UTC `Date` objects. TZ semantics handled by caller — recurrence math is calendar-agnostic at this layer.

### Error contract

- `validateRrule` never throws — wraps everything in try/catch and returns result.
- `nextInstance` and `expandUntil` throw on malformed RRULE — caller should pre-validate. Documented.

### Tests (≈15)

1. `validateRrule("FREQ=DAILY")` → `{ok: true}`
2. `validateRrule("not-a-rule")` → `{ok: false, error: ...}`
3. `validateRrule("")` → `{ok: false, ...}`
4. Daily — `nextInstance("DTSTART:20260510T090000Z\nRRULE:FREQ=DAILY", 2026-05-10T10:00Z)` → `2026-05-11T09:00Z`
5. Weekly on Mon — `FREQ=WEEKLY;BYDAY=MO` → next Monday after `after`
6. Monthly on 1st — `FREQ=MONTHLY;BYMONTHDAY=1` → next 1st of month
7. Yearly — `FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1` → next Jan 1
8. INTERVAL=2 — `FREQ=WEEKLY;INTERVAL=2` → every other week
9. UNTIL exhausted — rule with `UNTIL=20260601T000000Z`, `after=2026-06-02` → `null`
10. COUNT exhausted — rule with `COUNT=3`, after 3rd instance → `null`
11. `expandUntil` daily for 7 days → 7 dates
12. `expandUntil` empty range (until < after) → `[]`
13. `expandUntil` with COUNT=5, range covers 10 → returns 5
14. `nextInstance` with malformed rule → throws
15. BYDAY=MO,WE,FR — picks closest matching day

---

## Module 3: SubtaskTree

`src/lib/subtasks/tree.ts`

### Public interface

```ts
import type { Task } from "@/lib/repositories/tasks";

export type TaskNode = Task & { children: TaskNode[] };
export type ValidationResult = { ok: true } | { ok: false; error: string };

export function buildTree(tasks: Task[]): TaskNode[];
export function detectCycle(tasks: Task[], proposedParentId: string, childId: string): boolean;
export function validateReparent(
  tasks: Task[],
  taskId: string,
  newParentId: string | null,
): ValidationResult;
export function propagateCompletion(tasks: Task[], parentId: string): string[];
```

### Semantics

- `buildTree(tasks)` — returns roots (`parent_task_id IS NULL`). Each root has recursive `children` array. Orphans (`parent_task_id` references a task not in input) treated as roots; no warning at this layer (caller can detect by comparing input length to flat-tree length).
- `detectCycle(tasks, proposedParentId, childId)` — walks ancestor chain of `proposedParentId` via `parent_task_id`. Returns `true` if `childId` appears in the chain (would create cycle). Returns `false` if safe.
- `validateReparent(tasks, taskId, newParentId)`:
  - `newParentId == null` → `{ok: true}` (move to top level always allowed)
  - `newParentId == taskId` → `{ok: false, error: "cannot parent task to itself"}`
  - `newParentId` not in `tasks` → `{ok: false, error: "parent not found"}`
  - `detectCycle(tasks, newParentId, taskId)` true → `{ok: false, error: "cycle detected"}`
  - otherwise `{ok: true}`
- `propagateCompletion(tasks, parentId)` — returns flat array of all descendant task IDs (DFS). Used by API route when user opts to "complete subtasks too".

### Implementation notes

- `buildTree` builds a `Map<id, TaskNode>` first (clone each task with `children: []`), then iterates a second pass to attach children to parents. O(N).
- `detectCycle` walks parent chain via Map lookup. Bounded depth — practical limit ~20 in real use, but no hard cap enforced (tree allowed any depth).
- No max-depth limit (deferred — UI can render deep trees as nested or flatten with breadcrumb).

### Error contract

- All functions pure. None throw — return results or empty arrays.
- Invalid input (e.g., `taskId` not in tasks) → `validateReparent` returns `{ok: false, error: "task not found"}`.

### Tests (≈14)

1. `buildTree([])` → `[]`
2. `buildTree` with single root → `[{...task, children: []}]`
3. `buildTree` with 1 root + 2 children → 1 node with 2 children
4. `buildTree` with 3-level tree (grandparent → parent → child) → correctly nested
5. `buildTree` with orphan (parent missing) → orphan promoted to root
6. `detectCycle` — A → B → A direct cycle → `true`
7. `detectCycle` — proposedParent==child → `true` (self-cycle)
8. `detectCycle` — A → B, propose `parent(A)=B` → `true` (would cycle)
9. `detectCycle` — independent subtrees → `false`
10. `validateReparent` to null → `{ok: true}`
11. `validateReparent` self → `{ok: false}`
12. `validateReparent` to descendant → `{ok: false, cycle}`
13. `validateReparent` parent missing → `{ok: false, not found}`
14. `propagateCompletion` returns all descendants in DFS order

---

## Parallel dispatch plan

| Task | Depends on | Model | Why |
|------|------------|-------|-----|
| P3-1 ForecastBuckets | — | Sonnet | Tz arithmetic needs care; many edge tests |
| P3-2 RecurrenceEngine | rrule npm install | Sonnet | RFC 5545 wrapping; many test cases |
| P3-3 SubtaskTree | — | Sonnet | Cycle detection logic + tree assembly |

**P3-0 prereq:** `npm install rrule` in contact-manager. Single commit.

**Dispatch order:** P3-0 first (dep install). P3-1, P3-2, P3-3 have **disjoint file footprint** and **no module deps** between them. Per Phase 2 lesson (parallel agents on same git repo can race), **dispatch SEQUENTIAL: P3-1 → P3-2 → P3-3**, each with its own commit set. Mirror Phase 2 pattern.

---

## Definition of Done

- [ ] `npm test` exits 0 in `contact-manager/` (existing 205 + ~47 new = ~252 total)
- [ ] All 205 EXISTING Phase 2 tests still pass (regression gate)
- [ ] `npm run type-check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `rrule` listed in `dependencies` (not devDependencies) in `contact-manager/package.json`
- [ ] No mocks anywhere — all tests are pure-input → pure-output
- [ ] TDD commit order verified — failing tests precede implementation in git log
- [ ] Each module has its own subdirectory under `src/lib/`
- [ ] Tasks reviewed (spec + code quality) and APPROVED
- [ ] PR opened against `contact-manager` master (PR-A)
- [ ] Outer repo PR (PR-B) bumps submodule pointer + commits Phase 3 spec/plan docs

---

## Risk watchlist

1. **Tz arithmetic edge cases.** DST transitions, leap seconds, half-hour offsets (Asia/Colombo is UTC+5:30 — no DST, but other tz tests may hit DST). Mitigation: explicit edge-case tests for boundary moments (#15, #16, #17 in ForecastBuckets).
2. **rrule lib version skew.** `rrule@2.x` vs `rrule@3.x` have API differences. Pin minor version. Test that `RRule.fromString` returns a `RRule` instance with `.after()` and `.between()`.
3. **buildTree orphan behavior.** If schema FK constraint `ON DELETE SET NULL` is later changed, orphans may appear differently. Document current behavior — orphan promoted to root.
4. **Type import from Phase 2.** `Task` type imported from `@/lib/repositories/tasks` — Phase 2 must export `Task`. Verified merged. If import path changes during Phase 4, update here too.

---

## After dispatch

1. Operator runs `npm install` in `contact-manager/` (rrule pulled in).
2. Operator runs `npm test` — verifies all green.
3. Outer repo bumps submodule pointer; commits spec + plan docs.
4. Open PRs.
