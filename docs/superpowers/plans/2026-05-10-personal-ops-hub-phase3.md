# Personal Ops Hub — Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land 3 pure-function modules — ForecastBuckets, RecurrenceEngine, SubtaskTree — in the `contact-manager/` submodule with full unit-test coverage. Unblocks Phase 4 (API routes), Phase 5 (forecast UI), Phase 6 (mindmap workload).

**Architecture:** Three independent pure-function modules under `contact-manager/src/lib/{forecast,recurrence,subtasks}/`. No DB, no I/O, no React. Vitest unit tests with golden inputs. `rrule` npm dep for RFC 5545 parsing. Native `Intl.DateTimeFormat` for tz arithmetic.

**Tech Stack:** TypeScript 5, Vitest 4, Node 20+, `rrule@^2.8`, `Intl.DateTimeFormat`

**Spec:** `docs/superpowers/specs/2026-05-10-personal-ops-hub-phase3-design.md`

---

## File Structure

**New files (all in `contact-manager/`):**

| Path | Responsibility |
|------|---------------|
| `src/lib/forecast/buckets.ts` | `bucketize(tasks, now, tz)` — sorts tasks into overdue/today/tomorrow/thisWeek/later/noDate |
| `src/lib/forecast/buckets.test.ts` | Vitest unit tests for ForecastBuckets (~18 tests) |
| `src/lib/recurrence/engine.ts` | `nextInstance`, `expandUntil`, `validateRrule` — wraps `rrule` lib |
| `src/lib/recurrence/engine.test.ts` | Vitest unit tests for RecurrenceEngine (~15 tests) |
| `src/lib/subtasks/tree.ts` | `buildTree`, `detectCycle`, `validateReparent`, `propagateCompletion` |
| `src/lib/subtasks/tree.test.ts` | Vitest unit tests for SubtaskTree (~14 tests) |

**Modified files:**

| Path | Change |
|------|--------|
| `contact-manager/package.json` | Add `rrule@^2.8.4` to `dependencies` |
| `contact-manager/package-lock.json` | Regenerated via `npm install` |

**Outer-repo modifications (after `contact-manager/` work merges):**

| Path | Change |
|------|--------|
| `contact-manager` (submodule pointer) | Bumped to phase 3 merge commit |

**Type-only import note:** `Task` type lives in `src/lib/repositories/tasks.ts` which has `import "server-only"` at top. Pure-fn modules MUST use `import type { Task } from "@/lib/repositories/tasks"` (not value import) so they remain client-importable.

---

## Task 0: Setup — branch + dependency

**Files:**
- Modify: `contact-manager/package.json`
- Generate: `contact-manager/package-lock.json`

- [ ] **Step 0.1: Create branch from contact-manager master**

```bash
cd contact-manager
git fetch origin
git checkout master
git pull origin master
git checkout -b feature/personal-ops-hub-phase3
```

Expected: branch created, working tree clean.

- [ ] **Step 0.2: Install rrule**

```bash
cd contact-manager
npm install rrule@^2.8.4
```

Expected: `node_modules/rrule/` exists. `package.json` shows `"rrule": "^2.8.4"` in `dependencies`. `package-lock.json` updated.

- [ ] **Step 0.3: Verify rrule import works**

Create a one-off check (do NOT commit this file):

```bash
cd contact-manager
node -e "const {RRule} = require('rrule'); const r = RRule.fromString('DTSTART:20260510T090000Z\nRRULE:FREQ=DAILY'); console.log(r.after(new Date(), false));"
```

Expected: a Date string in console output, no errors.

- [ ] **Step 0.4: Commit dep install**

```bash
cd contact-manager
git add package.json package-lock.json
git commit -m "chore(P3-0): install rrule@^2.8.4 for RecurrenceEngine"
```

Expected: 2 files committed. `git log --oneline -1` shows the commit.

---

## Task 1: ForecastBuckets — failing tests

**Files:**
- Create: `contact-manager/src/lib/forecast/buckets.test.ts`

- [ ] **Step 1.1: Create directory**

```bash
cd contact-manager
mkdir -p src/lib/forecast
```

- [ ] **Step 1.2: Write all failing tests for ForecastBuckets**

Create `contact-manager/src/lib/forecast/buckets.test.ts` with the full content below.

```ts
import { describe, it, expect } from "vitest";
import { bucketize } from "./buckets";
import type { Task } from "@/lib/repositories/tasks";

// Helper: build a Task with overrides
function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "task-" + Math.random().toString(36).slice(2, 10),
    user_id: "user-1",
    title: "test",
    notes: null,
    project_id: null,
    contact_id: null,
    company_id: null,
    business_id: null,
    parent_task_id: null,
    defer_date: null,
    due_date: null,
    completed_at: null,
    recurrence_rule: null,
    created_at: new Date("2026-05-01T00:00:00Z"),
    updated_at: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  } as Task;
}

const TZ = "Asia/Colombo"; // UTC+5:30, no DST
const NOW = new Date("2026-05-10T10:00:00Z"); // Sunday 15:30 in Colombo

describe("ForecastBuckets — bucketize", () => {
  it("empty input → all buckets empty", () => {
    const out = bucketize([], NOW, TZ);
    expect(out.overdue).toEqual([]);
    expect(out.today).toEqual([]);
    expect(out.tomorrow).toEqual([]);
    expect(out.thisWeek).toEqual([]);
    expect(out.later).toEqual([]);
    expect(out.noDate).toEqual([]);
  });

  it("completed tasks filtered out", () => {
    const t = makeTask({
      due_date: new Date("2026-05-10T08:00:00Z"),
      completed_at: new Date("2026-05-09T12:00:00Z"),
    });
    const out = bucketize([t], NOW, TZ);
    expect(out.today).toEqual([]);
    expect(out.overdue).toEqual([]);
  });

  it("subtasks (parent_task_id != null) filtered out", () => {
    const t = makeTask({
      parent_task_id: "parent-1",
      due_date: new Date("2026-05-10T08:00:00Z"),
    });
    const out = bucketize([t], NOW, TZ);
    expect(out.today).toEqual([]);
  });

  it("task with due_date == null and not deferred → noDate", () => {
    const t = makeTask({ due_date: null });
    const out = bucketize([t], NOW, TZ);
    expect(out.noDate).toHaveLength(1);
    expect(out.noDate[0].id).toBe(t.id);
  });

  it("task overdue by 1 day → overdue", () => {
    const t = makeTask({ due_date: new Date("2026-05-09T03:00:00Z") }); // May 9 in Colombo
    const out = bucketize([t], NOW, TZ);
    expect(out.overdue).toHaveLength(1);
  });

  it("task due today (Colombo wall-clock) → today", () => {
    // NOW is 2026-05-10 15:30 Colombo. Task at 09:00 Colombo same day.
    const t = makeTask({ due_date: new Date("2026-05-10T03:30:00Z") }); // 09:00 Colombo
    const out = bucketize([t], NOW, TZ);
    expect(out.today).toHaveLength(1);
  });

  it("task due today late evening (Colombo) → today", () => {
    // 23:30 Colombo = 18:00 UTC same day
    const t = makeTask({ due_date: new Date("2026-05-10T18:00:00Z") });
    const out = bucketize([t], NOW, TZ);
    expect(out.today).toHaveLength(1);
  });

  it("task due tomorrow → tomorrow", () => {
    // 2026-05-11 12:00 Colombo = 06:30 UTC
    const t = makeTask({ due_date: new Date("2026-05-11T06:30:00Z") });
    const out = bucketize([t], NOW, TZ);
    expect(out.tomorrow).toHaveLength(1);
  });

  it("task due day after tomorrow → thisWeek", () => {
    // 2026-05-12 12:00 Colombo
    const t = makeTask({ due_date: new Date("2026-05-12T06:30:00Z") });
    const out = bucketize([t], NOW, TZ);
    expect(out.thisWeek).toHaveLength(1);
  });

  it("task due Sunday end-of-week → thisWeek (NOW=Sunday means end-of-week is later today, but we're after midnight already)", () => {
    // NOW is Sun 2026-05-10. ISO week ends Sunday. Task due Sat 2026-05-16
    // ISO week: Mon-Sun. Current week (containing Sun May 10) = May 4-10.
    // So tasks for week-ahead would already be later. Use a NOW on Mon for clean test.
    const monNow = new Date("2026-05-11T10:00:00Z"); // Mon 15:30 Colombo
    const t = makeTask({ due_date: new Date("2026-05-17T05:00:00Z") }); // Sun 10:30 Colombo
    const out = bucketize([t], monNow, TZ);
    expect(out.thisWeek).toHaveLength(1);
  });

  it("task due next Monday (after current week) → later", () => {
    const monNow = new Date("2026-05-11T10:00:00Z"); // Mon
    const t = makeTask({ due_date: new Date("2026-05-18T05:00:00Z") }); // next Mon Colombo
    const out = bucketize([t], monNow, TZ);
    expect(out.later).toHaveLength(1);
  });

  it("task with future defer_date filtered out (none of the buckets)", () => {
    const t = makeTask({
      defer_date: new Date("2026-05-15T00:00:00Z"),
      due_date: new Date("2026-05-10T08:00:00Z"),
    });
    const out = bucketize([t], NOW, TZ);
    expect(out.today).toEqual([]);
    expect(out.noDate).toEqual([]);
    expect(out.overdue).toEqual([]);
  });

  it("task with past defer_date + due tomorrow → tomorrow", () => {
    const t = makeTask({
      defer_date: new Date("2026-05-08T00:00:00Z"),
      due_date: new Date("2026-05-11T06:30:00Z"),
    });
    const out = bucketize([t], NOW, TZ);
    expect(out.tomorrow).toHaveLength(1);
  });

  it("tz boundary — task at 22:00 UTC, Colombo tz → next day Colombo", () => {
    // NOW = 2026-05-10 10:00 UTC = 15:30 Colombo (still May 10 Colombo)
    // Task at 22:00 UTC May 10 = 03:30 Colombo May 11 → tomorrow
    const t = makeTask({ due_date: new Date("2026-05-10T22:00:00Z") });
    const out = bucketize([t], NOW, TZ);
    expect(out.tomorrow).toHaveLength(1);
  });

  it("tz boundary — task at 22:00 UTC, NYC tz → same day NYC", () => {
    // NOW UTC May 10 10:00 = May 10 06:00 NYC
    // Task UTC May 10 22:00 = May 10 18:00 NYC → today (NYC)
    const t = makeTask({ due_date: new Date("2026-05-10T22:00:00Z") });
    const out = bucketize([t], NOW, "America/New_York");
    expect(out.today).toHaveLength(1);
  });

  it("leap day handling — NOW=2028-02-29, due 2028-03-01 → tomorrow", () => {
    const leapNow = new Date("2028-02-29T05:00:00Z"); // 10:30 Colombo
    const t = makeTask({ due_date: new Date("2028-03-01T05:00:00Z") }); // 10:30 Colombo Mar 1
    const out = bucketize([t], leapNow, TZ);
    expect(out.tomorrow).toHaveLength(1);
  });

  it("invalid tz string throws", () => {
    expect(() => bucketize([], NOW, "Not/A_Real_Zone")).toThrow();
  });

  it("multiple tasks across buckets — counts correct", () => {
    const tasks = [
      makeTask({ id: "a", due_date: new Date("2026-05-09T03:00:00Z") }), // overdue
      makeTask({ id: "b", due_date: new Date("2026-05-10T03:30:00Z") }), // today
      makeTask({ id: "c", due_date: new Date("2026-05-11T06:30:00Z") }), // tomorrow
      makeTask({ id: "d", due_date: null }),                              // noDate
      makeTask({
        id: "e",
        due_date: new Date("2026-05-10T08:00:00Z"),
        completed_at: new Date("2026-05-10T09:00:00Z"),
      }),                                                                 // filtered
    ];
    const out = bucketize(tasks, NOW, TZ);
    expect(out.overdue).toHaveLength(1);
    expect(out.today).toHaveLength(1);
    expect(out.tomorrow).toHaveLength(1);
    expect(out.noDate).toHaveLength(1);
    const total =
      out.overdue.length +
      out.today.length +
      out.tomorrow.length +
      out.thisWeek.length +
      out.later.length +
      out.noDate.length;
    expect(total).toBe(4); // completed task excluded
  });
});
```

- [ ] **Step 1.3: Run tests — verify all fail**

```bash
cd contact-manager
npm test -- src/lib/forecast/buckets.test.ts
```

Expected: All ~18 tests fail with "Cannot find module './buckets'" or similar import error. This is correct — TDD red phase.

- [ ] **Step 1.4: Commit failing tests**

```bash
cd contact-manager
git add src/lib/forecast/buckets.test.ts
git commit -m "test(P3-1): failing tests for ForecastBuckets — 18 tests"
```

---

## Task 2: ForecastBuckets — implementation

**Files:**
- Create: `contact-manager/src/lib/forecast/buckets.ts`

- [ ] **Step 2.1: Implement buckets.ts**

Create `contact-manager/src/lib/forecast/buckets.ts` with the full content below.

```ts
import type { Task } from "@/lib/repositories/tasks";

export type Bucket = "overdue" | "today" | "tomorrow" | "thisWeek" | "later" | "noDate";
export type BucketedTasks = Record<Bucket, Task[]>;

/**
 * Sorts tasks into time-based forecast buckets.
 *
 * Filters out:
 *   - completed tasks (completed_at != null)
 *   - subtasks (parent_task_id != null)
 *   - deferred tasks (defer_date > now)
 *
 * @throws RangeError if `tz` is not a valid IANA timezone
 */
export function bucketize(tasks: Task[], now: Date, tz: string): BucketedTasks {
  // Throws RangeError if tz invalid — surfaces immediately
  const _validate = new Intl.DateTimeFormat(tz, { timeZone: tz });
  void _validate;

  const buckets: BucketedTasks = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    noDate: [],
  };

  const todayStart = startOfDay(now, tz);
  const todayEnd = endOfDay(now, tz);
  const tomorrowStart = addDaysWallClock(todayStart, 1, tz);
  const tomorrowEnd = endOfDay(tomorrowStart, tz);
  const dayAfterTomorrowStart = addDaysWallClock(todayStart, 2, tz);
  const weekEnd = endOfIsoWeek(now, tz);

  for (const task of tasks) {
    // Filter rules
    if (task.completed_at != null) continue;
    if (task.parent_task_id != null) continue;
    if (task.defer_date != null && task.defer_date.getTime() > now.getTime()) continue;

    const due = task.due_date;
    if (due == null) {
      buckets.noDate.push(task);
      continue;
    }

    if (due.getTime() < todayStart.getTime()) {
      buckets.overdue.push(task);
    } else if (due.getTime() <= todayEnd.getTime()) {
      buckets.today.push(task);
    } else if (due.getTime() <= tomorrowEnd.getTime()) {
      buckets.tomorrow.push(task);
    } else if (
      due.getTime() >= dayAfterTomorrowStart.getTime() &&
      due.getTime() <= weekEnd.getTime()
    ) {
      buckets.thisWeek.push(task);
    } else {
      buckets.later.push(task);
    }
  }

  return buckets;
}

// ─── TZ helpers ───────────────────────────────────────────────────────────────

/** Returns the wall-clock start of `date`'s day in `tz`, as a UTC Date. */
function startOfDay(date: Date, tz: string): Date {
  const parts = getDateParts(date, tz);
  return zonedDateToUtc(parts.year, parts.month, parts.day, 0, 0, 0, tz);
}

/** Returns the wall-clock 23:59:59.999 of `date`'s day in `tz`, as a UTC Date. */
function endOfDay(date: Date, tz: string): Date {
  const parts = getDateParts(date, tz);
  return zonedDateToUtc(parts.year, parts.month, parts.day, 23, 59, 59, tz, 999);
}

/** Adds N wall-clock days to a UTC Date, recomputing in `tz`. */
function addDaysWallClock(date: Date, days: number, tz: string): Date {
  const parts = getDateParts(date, tz);
  return zonedDateToUtc(parts.year, parts.month, parts.day + days, parts.hour, parts.minute, parts.second, tz);
}

/** Returns end of current ISO week (Sunday 23:59:59.999 in tz). */
function endOfIsoWeek(date: Date, tz: string): Date {
  const parts = getDateParts(date, tz);
  // JS getDay: Sun=0, Mon=1, ..., Sat=6. ISO week ends Sunday.
  // Days until Sunday from current weekday: (7 - weekday) % 7. If 0, today is Sunday.
  // We want days remaining UNTIL end of Sunday: if today=Sun, then 0 (today's eod).
  // If today=Mon, 6 days. If today=Sat, 1 day.
  const localDate = new Date(date.getTime());
  // Compute weekday in tz using formatToParts
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
  const weekdayStr = fmt.format(localDate);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = map[weekdayStr];
  const daysUntilSunday = (7 - weekday) % 7;
  return zonedDateToUtc(
    parts.year,
    parts.month,
    parts.day + daysUntilSunday,
    23,
    59,
    59,
    tz,
    999,
  );
}

/** Decompose a UTC Date into wall-clock components in `tz`. */
function getDateParts(date: Date, tz: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string): number => {
    const p = parts.find((x) => x.type === type);
    if (!p) throw new Error(`Missing ${type} part for tz ${tz}`);
    return parseInt(p.value, 10);
  };
  // Intl may return "24" for hour at midnight in some locales — normalise
  let hour = get("hour");
  if (hour === 24) hour = 0;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  };
}

/**
 * Convert wall-clock components in `tz` to a UTC Date.
 * Iteratively corrects for tz offset (handles DST and half-hour offsets).
 */
function zonedDateToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  tz: string,
  ms: number = 0,
): Date {
  // Initial guess: treat the wall-clock as UTC, then correct
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
  const guessParts = getDateParts(guess, tz);
  // Compute diff between intended wall-clock and what guess actually shows in tz
  const intendedMs = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const guessActualMs = Date.UTC(
    guessParts.year,
    guessParts.month - 1,
    guessParts.day,
    guessParts.hour,
    guessParts.minute,
    guessParts.second,
    ms,
  );
  const offsetMs = guessActualMs - intendedMs;
  return new Date(guess.getTime() - offsetMs);
}
```

- [ ] **Step 2.2: Run tests — verify all pass**

```bash
cd contact-manager
npm test -- src/lib/forecast/buckets.test.ts
```

Expected: All ~18 tests pass. If any fail, debug and fix tz math; do not move on.

- [ ] **Step 2.3: Type check**

```bash
cd contact-manager
npm run type-check
```

Expected: exit 0. No TS errors anywhere in repo.

- [ ] **Step 2.4: Lint**

```bash
cd contact-manager
npm run lint
```

Expected: exit 0.

- [ ] **Step 2.5: Commit implementation**

```bash
cd contact-manager
git add src/lib/forecast/buckets.ts
git commit -m "feat(P3-1): implement ForecastBuckets — all 18 tests green"
```

---

## Task 3: RecurrenceEngine — failing tests

**Files:**
- Create: `contact-manager/src/lib/recurrence/engine.test.ts`

- [ ] **Step 3.1: Create directory**

```bash
cd contact-manager
mkdir -p src/lib/recurrence
```

- [ ] **Step 3.2: Write all failing tests**

Create `contact-manager/src/lib/recurrence/engine.test.ts` with the full content below.

```ts
import { describe, it, expect } from "vitest";
import { nextInstance, expandUntil, validateRrule } from "./engine";

describe("RecurrenceEngine — validateRrule", () => {
  it("accepts FREQ=DAILY", () => {
    const r = validateRrule("DTSTART:20260510T090000Z\nRRULE:FREQ=DAILY");
    expect(r.ok).toBe(true);
  });

  it("rejects malformed string", () => {
    const r = validateRrule("not-a-rule");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeTruthy();
  });

  it("rejects empty string", () => {
    const r = validateRrule("");
    expect(r.ok).toBe(false);
  });
});

describe("RecurrenceEngine — nextInstance", () => {
  it("daily: next is the day after", () => {
    const out = nextInstance(
      "DTSTART:20260510T090000Z\nRRULE:FREQ=DAILY",
      new Date("2026-05-10T10:00:00Z"),
    );
    expect(out).not.toBeNull();
    expect(out!.toISOString()).toBe("2026-05-11T09:00:00.000Z");
  });

  it("weekly on Monday: next Monday after `after`", () => {
    // 2026-05-10 is Sunday. Next Monday = 2026-05-11.
    const out = nextInstance(
      "DTSTART:20260504T090000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO",
      new Date("2026-05-10T00:00:00Z"),
    );
    expect(out).not.toBeNull();
    expect(out!.toISOString()).toBe("2026-05-11T09:00:00.000Z");
  });

  it("monthly on 1st: next month's 1st", () => {
    const out = nextInstance(
      "DTSTART:20260501T090000Z\nRRULE:FREQ=MONTHLY;BYMONTHDAY=1",
      new Date("2026-05-10T00:00:00Z"),
    );
    expect(out).not.toBeNull();
    expect(out!.toISOString()).toBe("2026-06-01T09:00:00.000Z");
  });

  it("yearly Jan 1: next Jan 1", () => {
    const out = nextInstance(
      "DTSTART:20260101T090000Z\nRRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1",
      new Date("2026-05-10T00:00:00Z"),
    );
    expect(out).not.toBeNull();
    expect(out!.toISOString()).toBe("2027-01-01T09:00:00.000Z");
  });

  it("INTERVAL=2 weekly: skips alternate weeks", () => {
    const out = nextInstance(
      "DTSTART:20260504T090000Z\nRRULE:FREQ=WEEKLY;INTERVAL=2",
      new Date("2026-05-04T10:00:00Z"),
    );
    expect(out).not.toBeNull();
    // Next instance is 2026-05-18 (skipping 2026-05-11)
    expect(out!.toISOString()).toBe("2026-05-18T09:00:00.000Z");
  });

  it("UNTIL exhausted → null", () => {
    const out = nextInstance(
      "DTSTART:20260501T090000Z\nRRULE:FREQ=DAILY;UNTIL=20260510T000000Z",
      new Date("2026-06-01T00:00:00Z"),
    );
    expect(out).toBeNull();
  });

  it("COUNT exhausted → null", () => {
    // 3 daily occurrences from May 1, after May 5 → null
    const out = nextInstance(
      "DTSTART:20260501T090000Z\nRRULE:FREQ=DAILY;COUNT=3",
      new Date("2026-05-05T00:00:00Z"),
    );
    expect(out).toBeNull();
  });

  it("malformed rule throws", () => {
    expect(() =>
      nextInstance("garbage", new Date("2026-05-10T00:00:00Z")),
    ).toThrow();
  });

  it("BYDAY=MO,WE,FR: returns closest matching day", () => {
    // 2026-05-10 is Sunday. Next MO/WE/FR = Monday 2026-05-11.
    const out = nextInstance(
      "DTSTART:20260504T090000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
      new Date("2026-05-10T00:00:00Z"),
    );
    expect(out).not.toBeNull();
    expect(out!.toISOString()).toBe("2026-05-11T09:00:00.000Z");
  });
});

describe("RecurrenceEngine — expandUntil", () => {
  it("daily for 7 days returns 7 dates", () => {
    const out = expandUntil(
      "DTSTART:20260510T090000Z\nRRULE:FREQ=DAILY",
      new Date("2026-05-10T08:00:00Z"),
      new Date("2026-05-17T08:00:00Z"),
    );
    expect(out).toHaveLength(7);
    expect(out[0].toISOString()).toBe("2026-05-10T09:00:00.000Z");
    expect(out[6].toISOString()).toBe("2026-05-16T09:00:00.000Z");
  });

  it("empty range (until < after) → []", () => {
    const out = expandUntil(
      "DTSTART:20260510T090000Z\nRRULE:FREQ=DAILY",
      new Date("2026-05-15T00:00:00Z"),
      new Date("2026-05-10T00:00:00Z"),
    );
    expect(out).toEqual([]);
  });

  it("COUNT=5, range covers 10 → 5 dates", () => {
    const out = expandUntil(
      "DTSTART:20260510T090000Z\nRRULE:FREQ=DAILY;COUNT=5",
      new Date("2026-05-09T00:00:00Z"),
      new Date("2026-05-30T00:00:00Z"),
    );
    expect(out).toHaveLength(5);
  });
});
```

- [ ] **Step 3.3: Run tests — verify all fail**

```bash
cd contact-manager
npm test -- src/lib/recurrence/engine.test.ts
```

Expected: All ~15 tests fail (module not found).

- [ ] **Step 3.4: Commit failing tests**

```bash
cd contact-manager
git add src/lib/recurrence/engine.test.ts
git commit -m "test(P3-2): failing tests for RecurrenceEngine — 15 tests"
```

---

## Task 4: RecurrenceEngine — implementation

**Files:**
- Create: `contact-manager/src/lib/recurrence/engine.ts`

- [ ] **Step 4.1: Implement engine.ts**

Create `contact-manager/src/lib/recurrence/engine.ts` with the full content below.

```ts
import { RRule } from "rrule";

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * First occurrence strictly after `after`. Returns null if rule exhausted (COUNT/UNTIL).
 *
 * @throws Error if `rruleStr` is malformed. Pre-validate via `validateRrule` if untrusted.
 */
export function nextInstance(rruleStr: string, after: Date): Date | null {
  const rule = RRule.fromString(rruleStr);
  // second arg `inc=false` = strictly after, exclusive
  const next = rule.after(after, false);
  return next ?? null;
}

/**
 * All occurrences in `(after, until]`, sorted ascending.
 * Used by digest backfill cron to surface missed recurrences.
 *
 * @throws Error if `rruleStr` is malformed.
 */
export function expandUntil(rruleStr: string, after: Date, until: Date): Date[] {
  if (until.getTime() <= after.getTime()) return [];
  const rule = RRule.fromString(rruleStr);
  // `between(start, end, inc)` — both ends inclusive when inc=true.
  // We want strictly-after-`after`, so use inc=false on start and pad `until` to inclusive.
  return rule.between(after, until, false);
}

/**
 * Wraps RRule parsing in try/catch. Never throws.
 * Use to validate user-supplied RRULE strings at API boundary.
 */
export function validateRrule(rruleStr: string): ValidationResult {
  try {
    if (!rruleStr || rruleStr.trim().length === 0) {
      return { ok: false, error: "rrule string is empty" };
    }
    RRule.fromString(rruleStr);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
```

- [ ] **Step 4.2: Run tests — verify all pass**

```bash
cd contact-manager
npm test -- src/lib/recurrence/engine.test.ts
```

Expected: All ~15 tests pass.

- [ ] **Step 4.3: Type check**

```bash
cd contact-manager
npm run type-check
```

Expected: exit 0.

- [ ] **Step 4.4: Lint**

```bash
cd contact-manager
npm run lint
```

Expected: exit 0.

- [ ] **Step 4.5: Commit implementation**

```bash
cd contact-manager
git add src/lib/recurrence/engine.ts
git commit -m "feat(P3-2): implement RecurrenceEngine — all 15 tests green"
```

---

## Task 5: SubtaskTree — failing tests

**Files:**
- Create: `contact-manager/src/lib/subtasks/tree.test.ts`

- [ ] **Step 5.1: Create directory**

```bash
cd contact-manager
mkdir -p src/lib/subtasks
```

- [ ] **Step 5.2: Write all failing tests**

Create `contact-manager/src/lib/subtasks/tree.test.ts` with the full content below.

```ts
import { describe, it, expect } from "vitest";
import {
  buildTree,
  detectCycle,
  validateReparent,
  propagateCompletion,
} from "./tree";
import type { Task } from "@/lib/repositories/tasks";

function makeTask(id: string, parentId: string | null = null): Task {
  return {
    id,
    user_id: "user-1",
    title: id,
    notes: null,
    project_id: null,
    contact_id: null,
    company_id: null,
    business_id: null,
    parent_task_id: parentId,
    defer_date: null,
    due_date: null,
    completed_at: null,
    recurrence_rule: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as Task;
}

describe("SubtaskTree — buildTree", () => {
  it("empty input → []", () => {
    expect(buildTree([])).toEqual([]);
  });

  it("single root → 1 node, no children", () => {
    const out = buildTree([makeTask("a")]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("a");
    expect(out[0].children).toEqual([]);
  });

  it("1 root + 2 children → 1 node with 2 children", () => {
    const tasks = [makeTask("a"), makeTask("b", "a"), makeTask("c", "a")];
    const out = buildTree(tasks);
    expect(out).toHaveLength(1);
    expect(out[0].children).toHaveLength(2);
    const childIds = out[0].children.map((c) => c.id).sort();
    expect(childIds).toEqual(["b", "c"]);
  });

  it("3-level tree (gp → p → c) correctly nested", () => {
    const tasks = [
      makeTask("gp"),
      makeTask("p", "gp"),
      makeTask("c", "p"),
    ];
    const out = buildTree(tasks);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("gp");
    expect(out[0].children).toHaveLength(1);
    expect(out[0].children[0].id).toBe("p");
    expect(out[0].children[0].children).toHaveLength(1);
    expect(out[0].children[0].children[0].id).toBe("c");
  });

  it("orphan (parent missing) promoted to root", () => {
    const tasks = [makeTask("orphan", "missing-parent")];
    const out = buildTree(tasks);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("orphan");
  });
});

describe("SubtaskTree — detectCycle", () => {
  it("self-cycle (proposedParent == childId) → true", () => {
    const tasks = [makeTask("a")];
    expect(detectCycle(tasks, "a", "a")).toBe(true);
  });

  it("direct cycle A→B, propose parent(A)=B → true", () => {
    const tasks = [makeTask("a"), makeTask("b", "a")];
    expect(detectCycle(tasks, "b", "a")).toBe(true);
  });

  it("3-level cycle A→B→C, propose parent(A)=C → true", () => {
    const tasks = [makeTask("a"), makeTask("b", "a"), makeTask("c", "b")];
    expect(detectCycle(tasks, "c", "a")).toBe(true);
  });

  it("independent subtrees → false", () => {
    const tasks = [
      makeTask("a"),
      makeTask("b", "a"),
      makeTask("c"),
      makeTask("d", "c"),
    ];
    expect(detectCycle(tasks, "c", "b")).toBe(false);
  });
});

describe("SubtaskTree — validateReparent", () => {
  it("newParentId == null → ok (move to top level)", () => {
    const tasks = [makeTask("a"), makeTask("b", "a")];
    expect(validateReparent(tasks, "b", null)).toEqual({ ok: true });
  });

  it("self-parent → not ok", () => {
    const tasks = [makeTask("a")];
    const r = validateReparent(tasks, "a", "a");
    expect(r.ok).toBe(false);
  });

  it("parent under descendant → not ok (cycle)", () => {
    const tasks = [makeTask("a"), makeTask("b", "a")];
    // try to make A's parent = B (B is A's child)
    const r = validateReparent(tasks, "a", "b");
    expect(r.ok).toBe(false);
  });

  it("parent missing → not ok", () => {
    const tasks = [makeTask("a")];
    const r = validateReparent(tasks, "a", "ghost");
    expect(r.ok).toBe(false);
  });

  it("task missing → not ok", () => {
    const tasks = [makeTask("a")];
    const r = validateReparent(tasks, "ghost", "a");
    expect(r.ok).toBe(false);
  });

  it("valid reparent (sibling subtree) → ok", () => {
    const tasks = [
      makeTask("a"),
      makeTask("b", "a"),
      makeTask("c"),
    ];
    // Move c under a
    expect(validateReparent(tasks, "c", "a")).toEqual({ ok: true });
  });
});

describe("SubtaskTree — propagateCompletion", () => {
  it("no descendants → []", () => {
    const tasks = [makeTask("a")];
    expect(propagateCompletion(tasks, "a")).toEqual([]);
  });

  it("returns all descendants in DFS order", () => {
    const tasks = [
      makeTask("a"),
      makeTask("b", "a"),
      makeTask("c", "b"),
      makeTask("d", "a"),
    ];
    const out = propagateCompletion(tasks, "a");
    expect(out.sort()).toEqual(["b", "c", "d"]);
  });
});
```

- [ ] **Step 5.3: Run tests — verify all fail**

```bash
cd contact-manager
npm test -- src/lib/subtasks/tree.test.ts
```

Expected: All ~16 tests fail (module not found).

- [ ] **Step 5.4: Commit failing tests**

```bash
cd contact-manager
git add src/lib/subtasks/tree.test.ts
git commit -m "test(P3-3): failing tests for SubtaskTree — 16 tests"
```

---

## Task 6: SubtaskTree — implementation

**Files:**
- Create: `contact-manager/src/lib/subtasks/tree.ts`

- [ ] **Step 6.1: Implement tree.ts**

Create `contact-manager/src/lib/subtasks/tree.ts` with the full content below.

```ts
import type { Task } from "@/lib/repositories/tasks";

export type TaskNode = Task & { children: TaskNode[] };
export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Build a forest of TaskNodes from a flat task array.
 * Tasks whose `parent_task_id` is null OR refers to a missing task become roots.
 */
export function buildTree(tasks: Task[]): TaskNode[] {
  const nodeMap = new Map<string, TaskNode>();
  for (const t of tasks) {
    nodeMap.set(t.id, { ...t, children: [] });
  }
  const roots: TaskNode[] = [];
  for (const t of tasks) {
    const node = nodeMap.get(t.id)!;
    if (t.parent_task_id == null) {
      roots.push(node);
      continue;
    }
    const parent = nodeMap.get(t.parent_task_id);
    if (parent == null) {
      // orphan — promote to root
      roots.push(node);
    } else {
      parent.children.push(node);
    }
  }
  return roots;
}

/**
 * Returns true if making `proposedParentId` the parent of `childId` would create a cycle.
 *
 * Walks the ancestor chain of proposedParentId. If childId appears in the chain
 * (or proposedParentId == childId), returns true.
 */
export function detectCycle(
  tasks: Task[],
  proposedParentId: string,
  childId: string,
): boolean {
  if (proposedParentId === childId) return true;
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  let cursor: string | null = proposedParentId;
  const visited = new Set<string>();
  while (cursor != null) {
    if (cursor === childId) return true;
    if (visited.has(cursor)) return false; // existing cycle in data, not caused by our move
    visited.add(cursor);
    const next = taskMap.get(cursor);
    cursor = next?.parent_task_id ?? null;
  }
  return false;
}

/**
 * Validate a reparent operation. Pure check — does not mutate.
 *
 * Rejects:
 *   - taskId not in `tasks`
 *   - newParentId not in `tasks` (when not null)
 *   - newParentId == taskId (self-parent)
 *   - moving taskId under one of its own descendants (cycle)
 */
export function validateReparent(
  tasks: Task[],
  taskId: string,
  newParentId: string | null,
): ValidationResult {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  if (!taskMap.has(taskId)) {
    return { ok: false, error: "task not found" };
  }
  if (newParentId == null) {
    return { ok: true };
  }
  if (newParentId === taskId) {
    return { ok: false, error: "cannot parent task to itself" };
  }
  if (!taskMap.has(newParentId)) {
    return { ok: false, error: "parent not found" };
  }
  if (detectCycle(tasks, newParentId, taskId)) {
    return { ok: false, error: "cycle detected" };
  }
  return { ok: true };
}

/**
 * Returns all descendant task IDs of `parentId`, in DFS order.
 * Excludes parentId itself.
 */
export function propagateCompletion(tasks: Task[], parentId: string): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const t of tasks) {
    if (t.parent_task_id == null) continue;
    const arr = childrenByParent.get(t.parent_task_id) ?? [];
    arr.push(t.id);
    childrenByParent.set(t.parent_task_id, arr);
  }
  const out: string[] = [];
  const stack: string[] = [...(childrenByParent.get(parentId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    out.push(id);
    const grandkids = childrenByParent.get(id) ?? [];
    for (const g of grandkids) stack.push(g);
  }
  return out;
}
```

- [ ] **Step 6.2: Run tests — verify all pass**

```bash
cd contact-manager
npm test -- src/lib/subtasks/tree.test.ts
```

Expected: All ~16 tests pass.

- [ ] **Step 6.3: Type check**

```bash
cd contact-manager
npm run type-check
```

Expected: exit 0.

- [ ] **Step 6.4: Lint**

```bash
cd contact-manager
npm run lint
```

Expected: exit 0.

- [ ] **Step 6.5: Commit implementation**

```bash
cd contact-manager
git add src/lib/subtasks/tree.ts
git commit -m "feat(P3-3): implement SubtaskTree — all 16 tests green"
```

---

## Task 7: Final verification + push

**Files:** none

- [ ] **Step 7.1: Run full test suite**

```bash
cd contact-manager
npm test
```

Expected: All tests pass. Phase 2 had ~205 tests; Phase 3 adds ~49 (~18 + ~15 + ~16) = ~254 total. **No regressions** — verify count by inspecting summary.

- [ ] **Step 7.2: Type check**

```bash
cd contact-manager
npm run type-check
```

Expected: exit 0.

- [ ] **Step 7.3: Lint**

```bash
cd contact-manager
npm run lint
```

Expected: exit 0.

- [ ] **Step 7.4: Push branch**

```bash
cd contact-manager
git push -u origin feature/personal-ops-hub-phase3
```

Expected: branch published; remote tracking set.

- [ ] **Step 7.5: Open PR-A (contact-manager)**

```bash
cd contact-manager
gh pr create --title "Phase 3: pure-fn trio (ForecastBuckets, RecurrenceEngine, SubtaskTree)" --body "$(cat <<'EOF'
## Summary
- Add `src/lib/forecast/buckets.ts` — sorts tasks into time buckets (overdue/today/tomorrow/thisWeek/later/noDate). Tz-aware via `Intl.DateTimeFormat`.
- Add `src/lib/recurrence/engine.ts` — wraps `rrule` lib. `nextInstance`, `expandUntil`, `validateRrule`.
- Add `src/lib/subtasks/tree.ts` — `buildTree`, `detectCycle`, `validateReparent`, `propagateCompletion`.
- ~49 new pure-function unit tests. No DB. No mocks.

## Test plan
- [ ] `npm test` — all green (~254 total, ~49 new)
- [ ] `npm run type-check` — exit 0
- [ ] `npm run lint` — exit 0

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed.

- [ ] **Step 7.6: Bump submodule pointer in outer repo + commit plan**

```bash
cd ..  # outer repo: c:/Users/anuda/OneDrive/Desktop/Mindmap website
git checkout master
git pull origin master
git checkout -b feature/personal-ops-hub-phase3
git submodule update --remote contact-manager  # pulls phase3 branch HEAD
# After PR-A merges, re-run: git submodule update --remote contact-manager
git add contact-manager docs/superpowers/specs/2026-05-10-personal-ops-hub-phase3-design.md docs/superpowers/plans/2026-05-10-personal-ops-hub-phase3.md
git commit -m "chore(P3): bump contact-manager submodule + add phase 3 spec/plan"
git push -u origin feature/personal-ops-hub-phase3
```

Note: outer-repo PR (PR-B) should be opened AFTER PR-A merges. The submodule pointer should reference the merge commit on `contact-manager/master`, not the WIP branch HEAD.

- [ ] **Step 7.7: After PR-A merges, finalize PR-B**

```bash
cd contact-manager
git checkout master
git pull origin master
cd ..
git submodule update --remote contact-manager
git add contact-manager
git commit -m "chore(P3): bump submodule to phase 3 merge commit"
git push
gh pr create --title "Phase 3: bump contact-manager + docs" --body "$(cat <<'EOF'
## Summary
- Bumps `contact-manager` submodule to Phase 3 merge.
- Adds Phase 3 spec + plan to `docs/superpowers/`.

## Test plan
- [ ] CI green
- [ ] `git submodule status` shows the merge commit (not branch HEAD)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Definition of Done

- [ ] All 7 tasks complete and committed
- [ ] `npm test` exits 0 in `contact-manager/` (~254 total)
- [ ] `npm run type-check` exits 0
- [ ] `npm run lint` exits 0
- [ ] No mocks anywhere — pure-fn tests use literal inputs only
- [ ] TDD commit order verified — `git log --oneline` shows `test(P3-N)` commits before `feat(P3-N)` commits
- [ ] `rrule` listed in `dependencies` (not devDependencies)
- [ ] PR-A (contact-manager) opened and reviewed
- [ ] PR-B (outer repo, submodule bump + docs) opened after PR-A merges

---

## Risks & mitigations

1. **Tz arithmetic edge cases.** DST transitions (e.g., America/New_York spring-forward), half-hour offsets (Asia/Colombo UTC+5:30, IST UTC+5:30, Iran UTC+3:30). Mitigation: `zonedDateToUtc` uses iterative-correction approach that handles offset shifts. Tests cover Colombo + NYC.

2. **rrule lib version skew.** `rrule@2.x` API: `RRule.fromString(str)`, `.after(date, inc)`, `.between(start, end, inc)`. Pin `^2.8.4` to stay on stable API. If `rrule` upgrades to 3.x with API breaks, future contributor must adapt — not a Phase 3 concern.

3. **Type-only import discipline.** If a contributor mistakenly does `import { Task }` (value) instead of `import type { Task }`, the "server-only" guard in `tasks.ts` will fail at build time when this module imports from a client component. Mitigation: the type-only form is used in every test and impl file shown above.

4. **Test count regression detection.** Phase 2 baseline ~205 tests. Phase 3 adds ~49. If a future change drops tests, the count check in Task 7.1 catches it. Run `npm test` and verify total in summary.
