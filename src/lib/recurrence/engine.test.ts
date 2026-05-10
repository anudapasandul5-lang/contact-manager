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
