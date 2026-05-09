// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createContactWithRelations,
  updateContactWithRelations,
} from "@/lib/supabase/contact-mutations";

function makeRpcSpy(result: { data: unknown; error: null | { message: string } }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const supabase = {
    from: () => ({}),
    rpc: (fn: string, args?: Record<string, unknown>) => {
      if (!args) {
        throw new Error("Expected RPC args.");
      }
      calls.push({ fn, args });
      return Promise.resolve(result);
    },
  };
  return { supabase, calls };
}

it("createContactWithRelations calls create_contact_with_relations RPC with correct args", async () => {
  const { supabase, calls } = makeRpcSpy({
    data: { id: "abc", name: "Test" },
    error: null,
  });

  await createContactWithRelations(supabase, "user-1", {
    name: "Test",
    email: "test@example.com",
    phone: null,
    role: null,
    bio: null,
    notes: null,
    type: "employee",
    companyIds: ["company-1", "company-1"],
    projectIds: [],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.fn, "create_contact_with_relations");
  assert.equal(calls[0]!.args["p_name"], "Test");
  assert.equal(calls[0]!.args["p_user_id"], "user-1");
  assert.equal(calls[0]!.args["p_type"], "employee");
  assert.equal(calls[0]!.args["p_notes"], null);
  assert.deepEqual(calls[0]!.args["p_company_ids"], ["company-1"]);
  assert.deepEqual(calls[0]!.args["p_project_ids"], []);
});

it("createContactWithRelations throws when RPC returns an error", async () => {
  const { supabase } = makeRpcSpy({ data: null, error: { message: "duplicate key" } });

  await assert.rejects(
    () =>
      createContactWithRelations(supabase, "user-1", {
        name: "Test",
        email: null,
        phone: null,
        role: null,
        bio: null,
        notes: null,
        type: "employee",
        companyIds: [],
        projectIds: [],
      }),
    /duplicate key/,
  );
});

it("updateContactWithRelations calls update_contact_with_relations RPC with correct args", async () => {
  const { supabase, calls } = makeRpcSpy({
    data: { id: "contact-1", name: "Updated" },
    error: null,
  });

  await updateContactWithRelations(supabase, "user-1", "contact-1", {
    name: "Updated",
    email: null,
    phone: null,
    role: "Engineer",
    bio: null,
    notes: null,
    type: "employee",
    companyIds: [],
    projectIds: ["project-1"],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.fn, "update_contact_with_relations");
  assert.equal(calls[0]!.args["p_id"], "contact-1");
  assert.equal(calls[0]!.args["p_user_id"], "user-1");
  assert.equal(calls[0]!.args["p_role"], "Engineer");
  assert.deepEqual(calls[0]!.args["p_project_ids"], ["project-1"]);
});

it("updateContactWithRelations throws when RPC returns an error", async () => {
  const { supabase } = makeRpcSpy({ data: null, error: { message: "contact not found" } });

  await assert.rejects(
    () =>
      updateContactWithRelations(supabase, "user-1", "missing-id", {
        name: "X",
        email: null,
        phone: null,
        role: null,
        bio: null,
        notes: null,
        type: "employee",
        companyIds: [],
        projectIds: [],
      }),
    /contact not found/,
  );
});
