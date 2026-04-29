import assert from "node:assert/strict";
import test from "node:test";
import { buildVendorGraphElements } from "@/components/mind-map/vendor-graph";
import type { VendorWithRelations } from "@/lib/supabase/types";

function createVendor(): VendorWithRelations {
  const timestamp = new Date().toISOString();

  return {
    id: "vendor-1",
    user_id: "user-1",
    name: "Acme Printing",
    specialty: "Print shop",
    notes: null,
    color: null,
    legacy_contact_id: null,
    created_at: timestamp,
    vendor_companies: [
      {
        companies: {
          id: "company-1",
          user_id: "user-1",
          name: "Acme Co",
          industry: "Printing",
          color: null,
          is_owned: true,
          created_at: timestamp,
        },
      },
    ],
    vendor_projects: [
      {
        projects: {
          id: "project-1",
          user_id: "user-1",
          name: "Rebrand",
          status: "active",
          company_id: "company-1",
          created_at: timestamp,
        },
      },
    ],
    vendor_people: [
      {
        id: "person-1",
        vendor_id: "vendor-1",
        name: "John",
        email: null,
        phone: null,
        role: "Rep",
        bio: null,
        created_at: timestamp,
      },
    ],
  };
}

test("buildVendorGraphElements keeps vendor businesses without rendering vendor people", () => {
  const { nodes, edges } = buildVendorGraphElements([createVendor()]);

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0]?.id, "vendor-vendor-1");
  assert.equal(nodes[0]?.data.peopleCount, 1);
  assert.ok(edges.some((edge) => edge.id === "vendor-vendor-1-company-company-1"));
  assert.ok(edges.some((edge) => edge.id === "vendor-vendor-1-project-project-1"));
  assert.ok(nodes.every((node) => !node.id.startsWith("vendor-person-")));
  assert.ok(edges.every((edge) => !edge.id.includes("vendor-person-")));
});
