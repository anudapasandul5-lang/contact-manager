import assert from "node:assert/strict";
import test from "node:test";
import {
  createVendorWithRelations,
  updateVendorWithRelations,
} from "@/lib/supabase/vendor-mutations";

function makeRpcSpy(result: { data: unknown; error: null | { message: string } }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const selectBuilder = {
    eq: () => selectBuilder,
    order: () => Promise.resolve({ data: [], error: null }),
  };
  const mutationResult = Promise.resolve({ error: null });
  const supabase = {
    from: () => ({
      insert: () => mutationResult,
      delete: () => ({ eq: () => mutationResult }),
      select: () => selectBuilder,
    }),
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

test("createVendorWithRelations calls create_vendor_with_relations RPC", async () => {
  const { supabase, calls } = makeRpcSpy({
    data: { id: "vendor-1", name: "Acme" },
    error: null,
  });

  await createVendorWithRelations(supabase as Parameters<typeof createVendorWithRelations>[0], "user-1", {
    name: "Acme",
    specialty: "Design",
    notes: null,
    color: null,
    companyIds: ["company-1"],
    projectIds: [],
    people: [{ name: "Alice", email: "alice@acme.com", phone: null, role: null, bio: null }],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.fn, "create_vendor_with_relations");
  assert.equal(calls[0]!.args["p_name"], "Acme");
  assert.equal(calls[0]!.args["p_user_id"], "user-1");
  assert.deepEqual(calls[0]!.args["p_company_ids"], ["company-1"]);
  assert.deepEqual(calls[0]!.args["p_project_ids"], []);
  const people = calls[0]!.args["p_people"] as unknown[];
  assert.equal(people.length, 1);
  assert.equal((people[0] as { name?: unknown }).name, "Alice");
});

test("updateVendorWithRelations calls update_vendor_with_relations RPC", async () => {
  const { supabase, calls } = makeRpcSpy({
    data: { id: "vendor-1", name: "Acme Updated" },
    error: null,
  });

  await updateVendorWithRelations(supabase as Parameters<typeof updateVendorWithRelations>[0], "user-1", "vendor-1", {
    name: "Acme Updated",
    specialty: null,
    notes: "new notes",
    color: "#ff0000",
    companyIds: [],
    projectIds: ["project-1"],
    people: [],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.fn, "update_vendor_with_relations");
  assert.equal(calls[0]!.args["p_id"], "vendor-1");
  assert.equal(calls[0]!.args["p_notes"], "new notes");
  assert.deepEqual(calls[0]!.args["p_project_ids"], ["project-1"]);
  assert.deepEqual(calls[0]!.args["p_people"], []);
});

test("createVendorWithRelations throws when RPC returns an error", async () => {
  const { supabase } = makeRpcSpy({ data: null, error: { message: "insert failed" } });

  await assert.rejects(
    () =>
      createVendorWithRelations(supabase as Parameters<typeof createVendorWithRelations>[0], "user-1", {
        name: "X",
        specialty: null,
        notes: null,
        color: null,
        companyIds: [],
        projectIds: [],
        people: [],
      }),
    /insert failed/,
  );
});
