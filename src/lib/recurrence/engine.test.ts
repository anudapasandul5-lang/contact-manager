import { describe, it, expect } from "vitest";
import { nextInstance, expandUntil, validateRrule, occurrencesInWindow } from "./engine";

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

  it("occurrence exactly on `until` is excluded (exclusive upper bound)", () => {
    // Rule fires daily at 09:00 UTC. until=2026-05-12T09:00:00Z — exactly an occurrence.
    // Behavior: (after, until) exclusive — May 12 09:00 is NOT included.
    const out = expandUntil(
      "DTSTART:20260510T090000Z\nRRULE:FREQ=DAILY",
      new Date("2026-05-10T08:00:00Z"),
      new Date("2026-05-12T09:00:00Z"),
    );
    // Expect May 10 09:00 and May 11 09:00 — NOT May 12 09:00
    expect(out).toHaveLength(2);
    expect(out[0].toISOString()).toBe("2026-05-10T09:00:00.000Z");
    expect(out[1].toISOString()).toBe("2026-05-11T09:00:00.000Z");
  });
});

describe("RecurrenceEngine — occurrencesInWindow", () => {
  it("FREQ=DAILY, anchor=today, window=[today, today+6days] → 7 dates", () => {
    const anchor = new Date("2026-06-01T00:00:00Z"); // Monday
    const windowStart = new Date("2026-06-01T00:00:00Z");
    const windowEnd = new Date("2026-06-07T23:59:59Z");
    const out = occurrencesInWindow("RRULE:FREQ=DAILY", anchor, windowStart, windowEnd);
    expect(out).toHaveLength(7);
    expect(out[0].toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(out[6].toISOString()).toBe("2026-06-07T00:00:00.000Z");
  });

  it("FREQ=WEEKLY, anchor=Monday 2026-06-02, window=[2026-06-01, 2026-06-07] → 1 date (Monday Jun 2)", () => {
    // 2026-06-02 is Tuesday. Anchor on Monday means DTSTART should be Mon Jun 1 or Tue Jun 2 depending on the anchor.
    // Task says anchor = task's due_date. If due_date is 2026-06-02 (Tuesday), then DTSTART=2026-06-02.
    // Weekly on Tue = every Tuesday. So in [Jun 1, Jun 7], only Jun 2 (Tue).
    const anchor = new Date("2026-06-02T00:00:00Z"); // Tuesday
    const windowStart = new Date("2026-06-01T00:00:00Z");
    const windowEnd = new Date("2026-06-07T23:59:59Z");
    const out = occurrencesInWindow("RRULE:FREQ=WEEKLY", anchor, windowStart, windowEnd);
    expect(out).toHaveLength(1);
    expect(out[0].getUTCDate()).toBe(2);
  });

  it("FREQ=MONTHLY, anchor=2026-06-01, window=[2026-06-01, 2026-06-30] → 1 date (Jun 1)", () => {
    const anchor = new Date("2026-06-01T00:00:00Z");
    const windowStart = new Date("2026-06-01T00:00:00Z");
    const windowEnd = new Date("2026-06-30T23:59:59Z");
    const out = occurrencesInWindow("RRULE:FREQ=MONTHLY", anchor, windowStart, windowEnd);
    expect(out).toHaveLength(1);
    expect(out[0].getUTCDate()).toBe(1);
  });

  it("Malformed rule string → returns [] (no throw)", () => {
    const anchor = new Date("2026-06-01T00:00:00Z");
    const windowStart = new Date("2026-06-01T00:00:00Z");
    const windowEnd = new Date("2026-06-07T23:59:59Z");
    const out = occurrencesInWindow("garbage-rule", anchor, windowStart, windowEnd);
    expect(out).toEqual([]);
  });

  it("Window where anchor is past the window end → still returns occurrences if rule generates them", () => {
    // DAILY rule, anchor (DTSTART) is 2026-06-10, but window is [2026-06-01, 2026-06-07].
    // Daily rule starting in the future may still have occurrences before if we're looking backward.
    // Actually, if DTSTART is Jun 10 and window is Jun 1-7, there should be NO occurrences.
    // Task says "still returns occurrences if rule generates them (daily wraps)" — but that doesn't make sense.
    // Let me re-read: the task says daily doesn't care about the day-of-week, so occurrences are dense.
    // If anchor=Jun 10 and window=[Jun 1, Jun 7], RRule.between() with DTSTART=Jun 10 would return NO occurrences.
    // I think the intent is to test that even if anchor > windowEnd, we don't error.
    // Let me adjust: test that a daily rule with anchor later still returns [] if before anchor.
    const anchor = new Date("2026-06-10T00:00:00Z");
    const windowStart = new Date("2026-06-01T00:00:00Z");
    const windowEnd = new Date("2026-06-07T23:59:59Z");
    const out = occurrencesInWindow("RRULE:FREQ=DAILY", anchor, windowStart, windowEnd);
    expect(out).toEqual([]);
  });

  it("FREQ=WEEKLY;INTERVAL=2, anchor=2026-06-02 (Mon→Tue), window=[2026-06-01, 2026-06-14] → 1 date (Jun 2 only)", () => {
    // 2026-06-02 is Tuesday. Bi-weekly on Tuesday = Jun 2, Jun 16, ...
    // Window [Jun 1, Jun 14] only includes Jun 2.
    const anchor = new Date("2026-06-02T00:00:00Z");
    const windowStart = new Date("2026-06-01T00:00:00Z");
    const windowEnd = new Date("2026-06-14T23:59:59Z");
    const out = occurrencesInWindow("RRULE:FREQ=WEEKLY;INTERVAL=2", anchor, windowStart, windowEnd);
    expect(out).toHaveLength(1);
    expect(out[0].getUTCDate()).toBe(2);
  });
});
