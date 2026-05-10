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
 * All occurrences in `(after, until)` — exclusive on both ends, sorted ascending.
 * If an occurrence falls exactly on `until`, it is NOT included.
 * Used by digest backfill cron to surface missed recurrences.
 *
 * @throws Error if `rruleStr` is malformed.
 */
export function expandUntil(rruleStr: string, after: Date, until: Date): Date[] {
  if (until.getTime() <= after.getTime()) return [];
  const rule = RRule.fromString(rruleStr);
  // inc=false: both endpoints exclusive → (after, until)
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
