"use client";

export interface MindMapFollowUp {
  id: string;
  user_id: string;
  contact_id: string;
  company_id: string | null;
  project_id: string | null;
  objective: string;
  notes: string | null;
  scheduled_for: string;
  completed_at: string | null;
  completion_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUpBucket {
  key: "overdue" | "today" | "upcoming";
  label: string;
  items: MindMapFollowUp[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : value == null ? null : null;
}

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(new Date(value).getTime());
}

function compareScheduledAt(left: MindMapFollowUp, right: MindMapFollowUp) {
  return new Date(left.scheduled_for).getTime() - new Date(right.scheduled_for).getTime();
}

function getStartOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getStartOfTomorrow(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

export function isFollowUpOpen(followUp: MindMapFollowUp) {
  return followUp.completed_at === null;
}

export function normalizeFollowUps(rawFollowUps: unknown): MindMapFollowUp[] {
  if (!Array.isArray(rawFollowUps)) {
    return [];
  }

  return rawFollowUps
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const {
        id,
        user_id,
        contact_id,
        company_id,
        project_id,
        objective,
        notes,
        scheduled_for,
        completed_at,
        completion_note,
        created_at,
        updated_at,
      } = entry;

      if (
        typeof id !== "string"
        || typeof user_id !== "string"
        || typeof contact_id !== "string"
        || typeof objective !== "string"
        || objective.trim().length === 0
        || !isValidDateString(scheduled_for)
        || !isValidDateString(created_at)
        || !isValidDateString(updated_at)
      ) {
        return null;
      }

      if (completed_at != null && !isValidDateString(completed_at)) {
        return null;
      }

      return {
        id,
        user_id,
        contact_id,
        company_id: getOptionalString(company_id),
        project_id: getOptionalString(project_id),
        objective: objective.trim(),
        notes: getOptionalString(notes),
        scheduled_for,
        completed_at: getOptionalString(completed_at),
        completion_note: getOptionalString(completion_note),
        created_at,
        updated_at,
      } satisfies MindMapFollowUp;
    })
    .filter((entry): entry is MindMapFollowUp => entry !== null)
    .sort(compareScheduledAt);
}

export function selectNextTouchForContact(
  followUps: MindMapFollowUp[],
  contactId: string | null | undefined,
): MindMapFollowUp | null {
  if (!contactId) {
    return null;
  }

  return (
    followUps
      .filter((followUp) => followUp.contact_id === contactId && isFollowUpOpen(followUp))
      .sort(compareScheduledAt)[0] ?? null
  );
}

export function buildFollowUpBuckets(followUps: MindMapFollowUp[], now = new Date()): FollowUpBucket[] {
  const startOfToday = getStartOfToday(now);
  const startOfTomorrow = getStartOfTomorrow(now);
  const openFollowUps = followUps.filter(isFollowUpOpen).sort(compareScheduledAt);

  return [
    {
      key: "overdue",
      label: "Overdue",
      items: openFollowUps.filter((followUp) => new Date(followUp.scheduled_for).getTime() < startOfToday.getTime()),
    },
    {
      key: "today",
      label: "Today",
      items: openFollowUps.filter((followUp) => {
        const scheduledAt = new Date(followUp.scheduled_for).getTime();
        return scheduledAt >= startOfToday.getTime() && scheduledAt < startOfTomorrow.getTime();
      }),
    },
    {
      key: "upcoming",
      label: "Upcoming",
      items: openFollowUps.filter((followUp) => new Date(followUp.scheduled_for).getTime() >= startOfTomorrow.getTime()),
    },
  ];
}
