import assert from "node:assert/strict";
import test from "node:test";
import {
  parseContactPayload,
  parseFollowUpCompletionPayload,
  parseFollowUpCreatePayload,
  parseFollowUpPatchPayload,
} from "@/lib/api/validation";

test("parseContactPayload accepts vendor contacts after the provider merge", () => {
  const payload = parseContactPayload({
    name: "Vera Vendor",
    type: "vendor",
    companyIds: ["company-1"],
    projectIds: ["project-1"],
  });

  assert.equal(payload.type, "vendor");
  assert.deepEqual(payload.companyIds, ["company-1"]);
  assert.deepEqual(payload.projectIds, ["project-1"]);
});

test("parseContactPayload rejects the removed service_provider type", () => {
  assert.throws(
    () =>
      parseContactPayload({
        name: "Priya Provider",
        type: "service_provider",
      }),
    /valid contact type/i,
  );
});

test("parseFollowUpCreatePayload requires objective and scheduled_for while normalizing optional links", () => {
  const payload = parseFollowUpCreatePayload({
    contact_id: " contact-1 ",
    company_id: " company-1 ",
    project_id: "",
    objective: " Reconnect about Q3 planning ",
    notes: " Bring the deck ",
    scheduled_for: "2026-04-20",
  });

  assert.deepEqual(payload, {
    contact_id: "contact-1",
    company_id: "company-1",
    project_id: null,
    objective: "Reconnect about Q3 planning",
    notes: "Bring the deck",
    scheduled_for: new Date("2026-04-20").toISOString(),
  });
});

test("parseFollowUpCreatePayload rejects missing required fields", () => {
  assert.throws(
    () =>
      parseFollowUpCreatePayload({
        contact_id: "contact-1",
        objective: "   ",
        scheduled_for: "",
      }),
    /objective and scheduled follow-up date are required/i,
  );
});

test("parseFollowUpPatchPayload only allows editable fields", () => {
  const payload = parseFollowUpPatchPayload({
    company_id: "",
    project_id: "project-1",
    objective: "Confirm implementation details",
    notes: "Use the revised brief",
    scheduled_for: "2026-04-21T09:30:00.000Z",
  });

  assert.deepEqual(payload, {
    company_id: null,
    project_id: "project-1",
    objective: "Confirm implementation details",
    notes: "Use the revised brief",
    scheduled_for: "2026-04-21T09:30:00.000Z",
  });
});

test("parseFollowUpCompletionPayload supports an optional next follow-up", () => {
  const payload = parseFollowUpCompletionPayload({
    completion_note: "Left voicemail",
    next: {
      contact_id: "contact-1",
      company_id: null,
      project_id: "project-2",
      objective: "Try again next week",
      notes: "",
      scheduled_for: "2026-04-28T10:00:00.000Z",
    },
  });

  assert.deepEqual(payload, {
    completion_note: "Left voicemail",
    next: {
      contact_id: "contact-1",
      company_id: null,
      project_id: "project-2",
      objective: "Try again next week",
      notes: null,
      scheduled_for: "2026-04-28T10:00:00.000Z",
    },
  });
});

test("parseFollowUpCompletionPayload rejects an invalid nested next follow-up", () => {
  assert.throws(
    () =>
      parseFollowUpCompletionPayload({
        completion_note: "Done",
        next: {
          contact_id: "",
          objective: "",
          scheduled_for: "not-a-date",
        },
      }),
    /contact, objective and scheduled follow-up date are required/i,
  );
});
