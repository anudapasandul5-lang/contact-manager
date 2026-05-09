import assert from "node:assert/strict";
import test from "node:test";
import type { ContactWithRelations, VendorWithRelations } from "@/lib/supabase/types";
import {
  buildDirectoryItems,
  buildDirectoryStats,
  filterDirectoryItems,
} from "@/components/contacts/directory-items";

function createContact(overrides: Partial<ContactWithRelations>): ContactWithRelations {
  return {
    id: "contact-1",
    user_id: "user-1",
    name: "Alice Employee",
    email: "alice@example.com",
    phone: null,
    role: "Founder",
    type: "employee",
    notes: null,
    bio: "Leads partnerships",
    created_at: "2026-04-01T00:00:00.000Z",
    contact_companies: [],
    contact_projects: [],
    ...overrides,
  };
}

function createVendor(overrides: Partial<VendorWithRelations>): VendorWithRelations {
  return {
    id: "vendor-1",
    user_id: "user-1",
    name: "Acme Print Studio",
    specialty: "Printing",
    notes: "Fast turnaround",
    color: null,
    legacy_contact_id: null,
    created_at: "2026-04-01T00:00:00.000Z",
    vendor_people: [
      {
        id: "vendor-person-1",
        vendor_id: "vendor-1",
        name: "Nina Rep",
        email: "nina@acme.test",
        phone: null,
        role: "Account Manager",
        bio: null,
        created_at: "2026-04-01T00:00:00.000Z",
      },
    ],
    vendor_companies: [],
    vendor_projects: [],
    ...overrides,
  };
}

test("buildDirectoryItems includes vendor businesses as separate cards", () => {
  const items = buildDirectoryItems(
    [createContact({ id: "contact-1", type: "employee" })],
    [createVendor({ id: "vendor-1", name: "Acme Print Studio" })],
  );

  assert.equal(items.length, 2);
  const vendorItem = items.find((item) => item.kind === "vendor");
  assert.equal(vendorItem?.kind, "vendor");
  assert.equal(vendorItem?.vendor.name, "Acme Print Studio");
});

test("filterDirectoryItems can isolate vendor businesses without turning vendor people into cards", () => {
  const items = buildDirectoryItems(
    [
      createContact({ id: "contact-1", type: "vendor", name: "Eli Vendor" }),
      createContact({ id: "contact-2", type: "employee", name: "Alice Employee" }),
    ],
    [createVendor({ id: "vendor-1", name: "Acme Print Studio" })],
  );

  const filtered = filterDirectoryItems(items, "vendor", "");

  assert.equal(filtered.length, 2);
  assert.equal(filtered.some((item) => item.kind === "contact" && item.contact.type === "vendor"), true);
  assert.equal(filtered.some((item) => item.kind === "vendor" && item.vendor.vendor_people.length === 1), true);
});

test("filterDirectoryItems searches vendor business details and connected company names", () => {
  const items = buildDirectoryItems(
    [createContact({ id: "contact-1", name: "Alice Employee" })],
    [
      createVendor({
        id: "vendor-1",
        name: "Acme Print Studio",
        specialty: "Large format printing",
        vendor_companies: [
          {
            companies: {
              id: "company-1",
              user_id: "user-1",
              name: "Northstar",
              industry: "Media",
              color: null,
              is_owned: true,
              created_at: "2026-04-01T00:00:00.000Z",
            },
          },
        ],
      }),
    ],
  );

  assert.equal(filterDirectoryItems(items, "all", "northstar").length, 1);
  assert.equal(filterDirectoryItems(items, "all", "printing")[0]?.kind, "vendor");
});

test("buildDirectoryStats reports vendor businesses alongside contacts", () => {
  const items = buildDirectoryItems(
    [
      createContact({ id: "contact-1", type: "employee" }),
      createContact({ id: "contact-2", type: "vendor" }),
    ],
    [createVendor({ id: "vendor-1" })],
  );

  assert.deepEqual(buildDirectoryStats(items), {
    total: 3,
    employees: 1,
    vendors: 2,
    investors: 0,
    cofounders: 0,
    partners: 0,
  });
});
