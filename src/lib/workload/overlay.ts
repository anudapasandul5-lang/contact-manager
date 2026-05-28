import type { Task } from "@/lib/repositories/tasks";

// MUST be `import type` — tasks.ts has `import "server-only"` at top.
// Value import will crash client bundle.

export type RingState =
  | "rotting"
  | "overdue"
  | "due-today"
  | "due-tomorrow"
  | "due-this-week"
  | "active"
  | "none";

/**
 * Computes the workload ring state for each nodeId.
 *
 * Filters out:
 *   - completed tasks (completed_at != null)
 *   - subtasks (parent_task_id != null)
 *   - deferred tasks (defer_date > now)
 *
 * FK matching: a task belongs to a nodeId if ANY of contact_id | company_id | business_id === nodeId.
 *
 * Ring state priority (worst wins):
 *   1. rotting — due_date < startOfDay(now - 2 calendar days, tz)
 *   2. overdue — due_date < startOfDay(now, tz) but NOT rotting
 *   3. due-today — due_date within today's wall-clock day in tz
 *   4. due-tomorrow — due_date within tomorrow's wall-clock day in tz
 *   5. due-this-week — due_date within this ISO week (after tomorrow, up to Sunday EOD)
 *   6. active — due_date in later bucket or no due_date
 *   7. none — no open tasks linked (OMIT from output map)
 *
 * @throws RangeError if `tz` is invalid or `now` is NaN
 * @returns Map<nodeId, RingState> — only entries for nodeIds with ≥1 matching open task
 */
export function computeWorkload(
  tasks: Task[],
  nodeIds: string[],
  now: Date,
  tz: string,
): Map<string, RingState> {
  // Guard: invalid now
  if (Number.isNaN(now.getTime())) {
    throw new RangeError("now is not a valid Date");
  }

  // Guard: invalid tz (throws RangeError)
  const _validate = new Intl.DateTimeFormat("en-US", { timeZone: tz });
  void _validate;

  // Guard: empty nodeIds
  if (nodeIds.length === 0) {
    return new Map();
  }

  // Build nodeId set for O(1) lookup
  const nodeIdSet = new Set(nodeIds);

  // Compute key day boundaries for ring state logic
  const todayStart = startOfDay(now, tz);
  const todayEnd = endOfDay(now, tz);
  const tomorrowStart = addDaysWallClock(todayStart, 1, tz);
  const tomorrowEnd = endOfDay(tomorrowStart, tz);
  const dayAfterTomorrowStart = addDaysWallClock(todayStart, 2, tz);
  // Use tomorrowStart as anchor for week-end (like bucketize)
  const weekEnd = endOfIsoWeek(tomorrowStart, tz);
  // 2 days ago for rotting boundary
  const twoDaysAgoStart = addDaysWallClock(todayStart, -2, tz);

  // Map to track worst ring state per nodeId
  const nodeRingState = new Map<string, RingState>();

  for (const task of tasks) {
    // Filter rules
    if (task.completed_at != null) continue;
    if (task.parent_task_id != null) continue;
    if (task.defer_date != null && task.defer_date.getTime() > now.getTime()) continue;

    // FK matching: collect all matching nodeIds for this task
    const matchingNodeIds: string[] = [];
    if (task.contact_id && nodeIdSet.has(task.contact_id)) {
      matchingNodeIds.push(task.contact_id);
    }
    if (task.company_id && nodeIdSet.has(task.company_id)) {
      matchingNodeIds.push(task.company_id);
    }
    if (task.business_id && nodeIdSet.has(task.business_id)) {
      matchingNodeIds.push(task.business_id);
    }

    // Skip if no matching nodeIds
    if (matchingNodeIds.length === 0) continue;

    // Determine ring state for this task
    const taskState = determineRingState(
      task.due_date,
      todayStart,
      todayEnd,
      tomorrowStart,
      tomorrowEnd,
      dayAfterTomorrowStart,
      twoDaysAgoStart,
      weekEnd,
    );

    // Apply to all matching nodeIds (worst wins)
    for (const nodeId of matchingNodeIds) {
      const currentState = nodeRingState.get(nodeId);
      const newState = worstState(currentState, taskState);
      nodeRingState.set(nodeId, newState);
    }
  }

  return nodeRingState;
}

/**
 * Determine the ring state for a single task based on its due_date.
 */
function determineRingState(
  due_date: Date | null,
  todayStart: Date,
  todayEnd: Date,
  tomorrowStart: Date,
  tomorrowEnd: Date,
  dayAfterTomorrowStart: Date,
  twoDaysAgoStart: Date,
  weekEnd: Date,
): RingState {
  // No due_date → "active"
  if (due_date == null) {
    return "active";
  }

  const dueTime = due_date.getTime();
  const todayStartTime = todayStart.getTime();

  // rotting: due_date <= startOfDay(now - 2 calendar days) — boundary inclusive
  if (dueTime <= twoDaysAgoStart.getTime()) {
    return "rotting";
  }

  // overdue: due_date < startOfDay(now) but NOT rotting
  if (dueTime < todayStartTime) {
    return "overdue";
  }

  // due-today: due_date within today
  if (dueTime <= todayEnd.getTime()) {
    return "due-today";
  }

  // due-tomorrow: due_date within tomorrow
  if (dueTime <= tomorrowEnd.getTime()) {
    return "due-tomorrow";
  }

  // due-this-week: due_date >= day-after-tomorrow AND <= Sunday EOD
  if (dueTime >= dayAfterTomorrowStart.getTime() && dueTime <= weekEnd.getTime()) {
    return "due-this-week";
  }

  // later bucket → "active"
  return "active";
}

export const RING_PRIORITY: Record<RingState, number> = {
  rotting: 6,
  overdue: 5,
  "due-today": 4,
  "due-tomorrow": 3,
  "due-this-week": 2,
  active: 1,
  none: 0,
};

/**
 * Return the "worst" ring state (worst = most urgent).
 * Priority order: rotting > overdue > due-today > due-tomorrow > due-this-week > active > none
 */
export function worstState(a: RingState | undefined, b: RingState): RingState {
  if (a === undefined) return b;

  return RING_PRIORITY[a] >= RING_PRIORITY[b] ? a : b;
}

// ─── TZ helpers ───────────────────────────────────────────────────────────────
// Copied from buckets.ts — minimal, self-contained

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
  const localDate = new Date(date.getTime());
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
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
  const guessParts = getDateParts(guess, tz);
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
