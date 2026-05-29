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
  const _validate = new Intl.DateTimeFormat("en-US", { timeZone: tz });
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
  // Use tomorrowStart as the anchor for week-end so that when today=Sunday,
  // we get the end of NEXT week (Mon–Sun) rather than collapsing thisWeek to empty.
  const weekEnd = endOfIsoWeek(tomorrowStart, tz);

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
export function startOfDay(date: Date, tz: string): Date {
  const parts = getDateParts(date, tz);
  return zonedDateToUtc(parts.year, parts.month, parts.day, 0, 0, 0, tz);
}

/** Returns the wall-clock 23:59:59.999 of `date`'s day in `tz`, as a UTC Date. */
function endOfDay(date: Date, tz: string): Date {
  const parts = getDateParts(date, tz);
  return zonedDateToUtc(parts.year, parts.month, parts.day, 23, 59, 59, tz, 999);
}

/** Adds N wall-clock days to a UTC Date, recomputing in `tz`. */
export function addDaysWallClock(date: Date, days: number, tz: string): Date {
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
