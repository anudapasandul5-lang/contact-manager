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

// REC_NOW = Mon 2026-05-11 10:00 UTC = Mon 15:30 Colombo
// Week boundaries in Colombo: today=Mon May 11, tomorrow=Tue May 12, thisWeek=Wed-Sun May 13-17, later=May 18+
const REC_NOW = new Date("2026-05-11T10:00:00Z"); // Mon 15:30 Colombo
const REC_TZ = "Asia/Colombo";

describe("ForecastBuckets — recurring task fan-out", () => {
  // A) Daily recurring task with due_date = today → instances in today, tomorrow, and thisWeek
  it("A) daily recurring task anchored today fans into today, tomorrow, thisWeek buckets", () => {
    // Anchor = May 11 10:00 UTC (today in Colombo). FREQ=DAILY will produce:
    // May 11 (today), May 12 (tomorrow), May 13-17 (thisWeek within the window)
    const t = makeTask({
      id: "rec-daily",
      due_date: new Date("2026-05-11T10:00:00Z"), // today anchor
      recurrence_rule: "RRULE:FREQ=DAILY",
    });
    const out = bucketize([t], REC_NOW, REC_TZ);

    // Should have at least 1 instance today, 1 tomorrow, some thisWeek
    expect(out.today.length).toBeGreaterThanOrEqual(1);
    expect(out.tomorrow.length).toBeGreaterThanOrEqual(1);
    expect(out.thisWeek.length).toBeGreaterThanOrEqual(1);
    expect(out.later).toHaveLength(0);
    expect(out.noDate).toHaveLength(0);

    // All instances should be the same task id
    expect(out.today[0].id).toBe("rec-daily");
    expect(out.tomorrow[0].id).toBe("rec-daily");

    // Instance due_dates should be overridden correctly
    const todayInstance = out.today[0];
    const tomorrowInstance = out.tomorrow[0];
    // today instance due_date should be May 11
    expect(todayInstance.due_date!.toISOString().startsWith("2026-05-11")).toBe(true);
    // tomorrow instance due_date should be May 12
    expect(tomorrowInstance.due_date!.toISOString().startsWith("2026-05-12")).toBe(true);
  });

  // B) Weekly recurring task with anchor=today → exactly 1 instance in today's bucket
  it("B) weekly recurring task anchored today produces exactly 1 instance in today bucket", () => {
    const t = makeTask({
      id: "rec-weekly",
      due_date: new Date("2026-05-11T10:00:00Z"), // today = Mon
      recurrence_rule: "RRULE:FREQ=WEEKLY",
    });
    const out = bucketize([t], REC_NOW, REC_TZ);

    // WEEKLY from Mon May 11 — within [todayStart, weekEnd] only May 11 falls in window
    // (next weekly occurrence is May 18 which is past weekEnd)
    expect(out.today).toHaveLength(1);
    expect(out.today[0].id).toBe("rec-weekly");
    expect(out.tomorrow).toHaveLength(0);
    expect(out.thisWeek).toHaveLength(0);
    expect(out.later).toHaveLength(0);
  });

  // C) Recurring task with due_date far in the future → empty occs → fallback to "later"
  it("C) recurring task with anchor past weekEnd falls back to later bucket", () => {
    // Anchor = Jun 1 2026 — well past weekEnd (May 17). occurrencesInWindow returns [].
    const t = makeTask({
      id: "rec-future",
      due_date: new Date("2026-06-01T10:00:00Z"),
      recurrence_rule: "RRULE:FREQ=DAILY",
    });
    const out = bucketize([t], REC_NOW, REC_TZ);

    expect(out.later).toHaveLength(1);
    expect(out.later[0].id).toBe("rec-future");
    expect(out.today).toHaveLength(0);
    expect(out.tomorrow).toHaveLength(0);
    expect(out.thisWeek).toHaveLength(0);
  });

  // D) Recurring task with due_date = null → noDate (unchanged)
  it("D) recurring task with null due_date lands in noDate", () => {
    const t = makeTask({
      id: "rec-nodate",
      due_date: null,
      recurrence_rule: "RRULE:FREQ=DAILY",
    });
    const out = bucketize([t], REC_NOW, REC_TZ);

    expect(out.noDate).toHaveLength(1);
    expect(out.noDate[0].id).toBe("rec-nodate");
  });

  // E) Non-recurring task behavior unchanged (regression)
  it("E) non-recurring tasks behave unchanged after refactor", () => {
    const tasks = [
      makeTask({ id: "nr-overdue", due_date: new Date("2026-05-10T03:00:00Z") }), // overdue
      makeTask({ id: "nr-today", due_date: new Date("2026-05-11T06:30:00Z") }),   // today (10:00 Colombo)
      makeTask({ id: "nr-tomorrow", due_date: new Date("2026-05-12T06:30:00Z") }), // tomorrow
      makeTask({ id: "nr-thisweek", due_date: new Date("2026-05-13T06:30:00Z") }), // thisWeek
      makeTask({ id: "nr-later", due_date: new Date("2026-05-18T06:30:00Z") }),    // later
      makeTask({ id: "nr-nodate", due_date: null }),
    ];
    const out = bucketize(tasks, REC_NOW, REC_TZ);

    expect(out.overdue.map((t) => t.id)).toContain("nr-overdue");
    expect(out.today.map((t) => t.id)).toContain("nr-today");
    expect(out.tomorrow.map((t) => t.id)).toContain("nr-tomorrow");
    expect(out.thisWeek.map((t) => t.id)).toContain("nr-thisweek");
    expect(out.later.map((t) => t.id)).toContain("nr-later");
    expect(out.noDate.map((t) => t.id)).toContain("nr-nodate");
  });
});
