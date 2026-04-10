import assert from "node:assert/strict";
import test from "node:test";
import {
  createVendorWithRelations,
  updateVendorWithRelations,
} from "@/lib/supabase/vendor-mutations";

function makeRpcSpy(result: { data: unknown; error: null | { message: string } }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const supabase = {
    from: () => ({
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ eq: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }), eq: () => Promise.resolve({ data: [], error: null }) }),
    }),
    rpc: (fn: string, args: Record<string, unknown>) => {
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

  await createVendorWithRelations(supabase as any, "user-1", {
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
  assert.equal((people[0] as any).name, "Alice");
});

test("updateVendorWithRelations calls update_vendor_with_relations RPC", async () => {
  const { supabase, calls } = makeRpcSpy({
    data: { id: "vendor-1", name: "Acme Updated" },
    error: null,
  });

  await updateVendorWithRelations(supabase as any, "user-1", "vendor-1", {
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
      createVendorWithRelations(supabase as any, "user-1", {
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
