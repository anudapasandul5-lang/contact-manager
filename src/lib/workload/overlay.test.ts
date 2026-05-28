import { describe, it, expect } from "vitest";
import type { Task } from "@/lib/repositories/tasks";
import { computeWorkload } from "./overlay";

// Helper to create minimal Task object for testing
function makeTask(overrides: Partial<Task>): Task {
  return {
    id: Math.random().toString(),
    user_id: "user-1",
    title: "Test task",
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
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

// Helper to create a date at start of day in a timezone (as UTC)
// This should return a UTC Date that represents midnight of the given calendar day
// in the test timezone (America/New_York)
function dateAtDayStart(year: number, month: number, day: number): Date {
  // Use the same logic as zonedDateToUtc to create midnight on that calendar day
  // For testing, we use "America/New_York" timezone
  const tz = "America/New_York";
  // Initial guess: UTC midnight of the calendar day
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  // Decompose to get what wall-clock time this represents in tz
  const guessParts = getDatePartsForTest(guess, tz);
  // Compute the offset
  const intendedMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const guessActualMs = Date.UTC(
    guessParts.year,
    guessParts.month - 1,
    guessParts.day,
    guessParts.hour,
    guessParts.minute,
    guessParts.second,
    0,
  );
  const offsetMs = guessActualMs - intendedMs;
  return new Date(guess.getTime() - offsetMs);
}

function getDatePartsForTest(date: Date, tz: string): {
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

describe("computeWorkload", () => {
  const tz = "America/New_York";

  // Test 1: empty tasks → empty map
  it("should return empty map when tasks array is empty", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const result = computeWorkload([], ["node1"], now, tz);
    expect(result.size).toBe(0);
  });

  // Test 2: completed task (completed_at set) → ignored
  it("should ignore tasks with completed_at set", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: now,
        completed_at: new Date(),
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBeUndefined();
  });

  // Test 3: subtask (parent_task_id set) → ignored
  it("should ignore tasks with parent_task_id set", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: now,
        parent_task_id: "parent-1",
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBeUndefined();
  });

  // Test 4: deferred task (defer_date > now) → ignored
  it("should ignore tasks with defer_date > now", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const futureDefer = dateAtDayStart(2025, 1, 20);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: now,
        defer_date: futureDefer,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBeUndefined();
  });

  // Test 5: task with no matching nodeId (only projectId) → not in output
  it("should not include tasks with no matching nodeId (only projectId)", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const tasks = [
      makeTask({
        project_id: "project-1",
        due_date: now,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBeUndefined();
  });

  // Test 6: overdue < 2 days → "overdue"
  it("should return 'overdue' for due_date < 2 days ago", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const yesterday = dateAtDayStart(2025, 1, 14);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: yesterday,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("overdue");
  });

  // Test 7: overdue ≥ 2 days → "rotting"
  it("should return 'rotting' for due_date >= 2 days ago", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const twoDaysAgo = dateAtDayStart(2025, 1, 13);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: twoDaysAgo,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("rotting");
  });

  // Test 8: due today → "due-today"
  it("should return 'due-today' for due_date within today's wall-clock day", () => {
    const now = dateAtDayStart(2025, 1, 15);
    // Due date same calendar day
    const today = dateAtDayStart(2025, 1, 15);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: today,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("due-today");
  });

  // Test 9: due tomorrow → "due-tomorrow"
  it("should return 'due-tomorrow' for due_date within tomorrow's wall-clock day", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const tomorrow = dateAtDayStart(2025, 1, 16);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: tomorrow,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("due-tomorrow");
  });

  // Test 10: due this week (after tomorrow, before end of Sunday) → "due-this-week"
  it("should return 'due-this-week' for due_date after tomorrow up to Sunday EOD", () => {
    // Mon Jan 13, 2025 → calculate this week boundaries
    const now = dateAtDayStart(2025, 1, 13); // Monday
    const thursdayThisWeek = dateAtDayStart(2025, 1, 16); // Thursday
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: thursdayThisWeek,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("due-this-week");
  });

  // Test 11: later bucket (no due_date constraint) → "active"
  it("should return 'active' for due_date in later bucket (far future)", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const nextMonth = dateAtDayStart(2025, 2, 15);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: nextMonth,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("active");
  });

  // Test 12: no due_date at all → "active"
  it("should return 'active' for task with no due_date", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: null,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("active");
  });

  // Test 13: worst-bucket wins: node has overdue + active task → "overdue"
  it("worst-bucket wins: should return 'overdue' when node has both overdue and active tasks", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const yesterday = dateAtDayStart(2025, 1, 14);
    const nextMonth = dateAtDayStart(2025, 2, 15);
    const tasks = [
      makeTask({
        id: "1",
        contact_id: "node1",
        due_date: yesterday,
      }),
      makeTask({
        id: "2",
        contact_id: "node1",
        due_date: nextMonth,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("overdue");
  });

  // Test 14: worst-bucket wins: node has rotting + due-today task → "rotting"
  it("worst-bucket wins: should return 'rotting' when node has both rotting and due-today tasks", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const threeDaysAgo = dateAtDayStart(2025, 1, 12);
    const today = dateAtDayStart(2025, 1, 15);
    const tasks = [
      makeTask({
        id: "1",
        contact_id: "node1",
        due_date: threeDaysAgo,
      }),
      makeTask({
        id: "2",
        contact_id: "node1",
        due_date: today,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("rotting");
  });

  // Test 15: multiple nodeIds each get correct independent state
  it("should compute correct independent state for multiple nodeIds", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const yesterday = dateAtDayStart(2025, 1, 14);
    const tomorrow = dateAtDayStart(2025, 1, 16);
    const tasks = [
      makeTask({
        id: "1",
        contact_id: "node1",
        due_date: yesterday,
      }),
      makeTask({
        id: "2",
        contact_id: "node2",
        due_date: tomorrow,
      }),
    ];
    const result = computeWorkload(tasks, ["node1", "node2"], now, tz);
    expect(result.get("node1")).toBe("overdue");
    expect(result.get("node2")).toBe("due-tomorrow");
  });

  // Test 16: due exactly at 2-day wall-clock boundary → "rotting" (boundary inclusive)
  it("should return 'rotting' for due_date exactly 2 days ago (boundary inclusive)", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const exactlyTwoDaysAgo = dateAtDayStart(2025, 1, 13);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: exactlyTwoDaysAgo,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("rotting");
  });

  // Test 17: due 1 day + 23:59:59 ago → "overdue" (not rotting)
  it("should return 'overdue' for due_date 1 day + 23:59:59 ago (not rotting)", () => {
    const now = dateAtDayStart(2025, 1, 15);
    // Jan 13 at 23:59:59 UTC = 18:59:59 NYC = within Jan 13 wall-clock day
    // Only 1 full calendar day before "today" (Jan 15), so "overdue" not "rotting"
    const almostTwoDaysAgo = new Date("2025-01-13T23:59:59.000Z");
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: almostTwoDaysAgo,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("overdue");
  });

  // Test 18: task with only project_id (no contact/company/business) → not in output
  it("should not include task with only project_id (no contact/company/business)", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const tasks = [
      makeTask({
        project_id: "proj-1",
        due_date: now,
      }),
    ];
    const result = computeWorkload(tasks, ["proj-1"], now, tz);
    expect(result.get("proj-1")).toBeUndefined();
  });

  // Test 19: task matched by contact_id does NOT light up company node
  it("should not light up company node if task matched only by contact_id", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const tasks = [
      makeTask({
        id: "1",
        contact_id: "contact-1",
        company_id: "company-1",
        due_date: now,
      }),
    ];
    // Task links to both; but we only request state for company
    // Task should light up company-1 because company_id is set
    const result = computeWorkload(tasks, ["company-1"], now, tz);
    expect(result.get("company-1")).toBe("due-today");
  });

  // Test 20: multiple tasks on same node all "active" → "active" (no false escalation)
  it("should return 'active' when multiple tasks on same node are all active", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const nextMonth = dateAtDayStart(2025, 2, 15);
    const tasks = [
      makeTask({
        id: "1",
        contact_id: "node1",
        due_date: nextMonth,
      }),
      makeTask({
        id: "2",
        contact_id: "node1",
        due_date: null,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("active");
  });

  // Test 21: empty nodeIds → empty map
  it("should return empty map for empty nodeIds array", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: now,
      }),
    ];
    const result = computeWorkload(tasks, [], now, tz);
    expect(result.size).toBe(0);
  });

  // Test 22: noDate task only → "active"
  it("should return 'active' for node with only noDate task", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: null,
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.get("node1")).toBe("active");
  });

  // Test 23: task with both contact_id="A" and company_id="B" → lights up BOTH nodes
  it("should light up both nodes when task has contact_id and company_id set", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const tasks = [
      makeTask({
        id: "1",
        contact_id: "contact-1",
        company_id: "company-1",
        due_date: now,
      }),
    ];
    const result = computeWorkload(tasks, ["contact-1", "company-1"], now, tz);
    expect(result.get("contact-1")).toBe("due-today");
    expect(result.get("company-1")).toBe("due-today");
  });

  // Test 24: invalid tz → RangeError; invalid now (NaN) → RangeError
  it("should throw RangeError for invalid timezone", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const tasks = [makeTask({ contact_id: "node1", due_date: now })];
    expect(() => computeWorkload(tasks, ["node1"], now, "Invalid/Tz")).toThrow(
      RangeError,
    );
  });

  it("should throw RangeError for invalid now (NaN Date)", () => {
    const invalidNow = new Date(NaN);
    const tasks = [
      makeTask({
        contact_id: "node1",
        due_date: dateAtDayStart(2025, 1, 15),
      }),
    ];
    expect(() => computeWorkload(tasks, ["node1"], invalidNow, tz)).toThrow(
      RangeError,
    );
  });

  // Test 25: task with defer_date === now is not filtered (boundary: strict greater-than)
  it("task with defer_date === now is not filtered (boundary: strict greater-than)", () => {
    const now = dateAtDayStart(2025, 1, 15);
    const tasks = [
      makeTask({
        contact_id: "node1",
        defer_date: now, // exactly now — NOT deferred
        due_date: now,   // due today
      }),
    ];
    const result = computeWorkload(tasks, ["node1"], now, tz);
    expect(result.has("node1")).toBe(true);
    expect(result.get("node1")).toBe("due-today");
  });
});
