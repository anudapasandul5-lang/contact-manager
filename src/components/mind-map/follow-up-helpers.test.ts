// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  buildFollowUpBuckets,
  normalizeFollowUps,
  selectNextTouchForContact,
} from "./follow-up-helpers";

it("normalizeFollowUps drops invalid entries and keeps valid follow-ups sorted", () => {
  const followUps = normalizeFollowUps([
    {
      id: "follow-up-2",
      user_id: "user-1",
      contact_id: "contact-1",
      objective: "Review proposal",
      notes: null,
      scheduled_for: "2026-04-18T09:00:00.000Z",
      completed_at: null,
      completion_note: null,
      company_id: null,
      project_id: null,
      created_at: "2026-04-10T09:00:00.000Z",
      updated_at: "2026-04-10T09:00:00.000Z",
    },
    {
      id: "broken",
      user_id: "user-1",
      contact_id: "contact-2",
      objective: "",
      scheduled_for: "not-a-date",
      completed_at: null,
      completion_note: null,
      company_id: null,
      project_id: null,
      created_at: "2026-04-10T09:00:00.000Z",
      updated_at: "2026-04-10T09:00:00.000Z",
    },
    {
      id: "follow-up-1",
      user_id: "user-1",
      contact_id: "contact-1",
      objective: " Send recap ",
      notes: "Bring pricing",
      scheduled_for: "2026-04-17T08:00:00.000Z",
      completed_at: null,
      completion_note: null,
      company_id: "company-1",
      project_id: null,
      created_at: "2026-04-10T09:00:00.000Z",
      updated_at: "2026-04-10T09:00:00.000Z",
    },
  ]);

  assert.equal(followUps.length, 2);
  assert.deepEqual(followUps.map((followUp) => followUp.id), ["follow-up-1", "follow-up-2"]);
  assert.equal(followUps[0]?.objective, "Send recap");
});

it("buildFollowUpBuckets groups only open follow-ups by local day boundaries", () => {
  const followUps = normalizeFollowUps([
    {
      id: "overdue",
      user_id: "user-1",
      contact_id: "contact-1",
      objective: "Past due",
      notes: null,
      scheduled_for: "2026-04-16T15:00:00.000Z",
      completed_at: null,
      completion_note: null,
      company_id: null,
      project_id: null,
      created_at: "2026-04-10T09:00:00.000Z",
      updated_at: "2026-04-10T09:00:00.000Z",
    },
    {
      id: "today",
      user_id: "user-1",
      contact_id: "contact-2",
      objective: "Today",
      notes: null,
      scheduled_for: "2026-04-17T07:00:00.000Z",
      completed_at: null,
      completion_note: null,
      company_id: null,
      project_id: null,
      created_at: "2026-04-10T09:00:00.000Z",
      updated_at: "2026-04-10T09:00:00.000Z",
    },
    {
      id: "upcoming",
      user_id: "user-1",
      contact_id: "contact-3",
      objective: "Later",
      notes: null,
      scheduled_for: "2026-04-18T10:00:00.000Z",
      completed_at: null,
      completion_note: null,
      company_id: null,
      project_id: null,
      created_at: "2026-04-10T09:00:00.000Z",
      updated_at: "2026-04-10T09:00:00.000Z",
    },
    {
      id: "completed",
      user_id: "user-1",
      contact_id: "contact-4",
      objective: "Done",
      notes: null,
      scheduled_for: "2026-04-17T12:00:00.000Z",
      completed_at: "2026-04-17T12:30:00.000Z",
      completion_note: "Handled",
      company_id: null,
      project_id: null,
      created_at: "2026-04-10T09:00:00.000Z",
      updated_at: "2026-04-10T09:00:00.000Z",
    },
  ]);

  const buckets = buildFollowUpBuckets(followUps, new Date("2026-04-17T11:00:00.000+05:30"));

  assert.deepEqual(
    buckets.map((bucket) => [bucket.key, bucket.items.map((item) => item.id)]),
    [
      ["overdue", ["overdue"]],
      ["today", ["today"]],
      ["upcoming", ["upcoming"]],
    ],
  );
});

it("selectNextTouchForContact returns the earliest open follow-up for a contact", () => {
  const followUps = normalizeFollowUps([
    {
      id: "later",
      user_id: "user-1",
      contact_id: "contact-1",
      objective: "Later",
      notes: null,
      scheduled_for: "2026-04-20T09:00:00.000Z",
      completed_at: null,
      completion_note: null,
      company_id: null,
      project_id: null,
      created_at: "2026-04-10T09:00:00.000Z",
      updated_at: "2026-04-10T09:00:00.000Z",
    },
    {
      id: "earlier",
      user_id: "user-1",
      contact_id: "contact-1",
      objective: "Sooner",
      notes: null,
      scheduled_for: "2026-04-17T09:00:00.000Z",
      completed_at: null,
      completion_note: null,
      company_id: null,
      project_id: null,
      created_at: "2026-04-10T09:00:00.000Z",
      updated_at: "2026-04-10T09:00:00.000Z",
    },
    {
      id: "done",
      user_id: "user-1",
      contact_id: "contact-1",
      objective: "Closed",
      notes: null,
      scheduled_for: "2026-04-16T09:00:00.000Z",
      completed_at: "2026-04-16T09:30:00.000Z",
      completion_note: null,
      company_id: null,
      project_id: null,
      created_at: "2026-04-10T09:00:00.000Z",
      updated_at: "2026-04-10T09:00:00.000Z",
    },
  ]);

  assert.equal(selectNextTouchForContact(followUps, "contact-1")?.id, "earlier");
  assert.equal(selectNextTouchForContact(followUps, "contact-2"), null);
});
