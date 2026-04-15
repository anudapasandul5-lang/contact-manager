import assert from "node:assert/strict";
import test from "node:test";
import { fetchSupabaseNetworkData } from "@/lib/supabase/network";

function createOrderedResult<T>(data: T) {
  const queryCall = { eqCalls: [] as Array<{ column: string; value: string }> };

  return {
    queryCall,
    builder: {
      select() {
        return this;
      },
      eq(column: string, value: string) {
        queryCall.eqCalls.push({ column, value });
        return this;
      },
      order: async () => ({ data, error: null }),
    },
  };
}

function createSupabaseStub(results: Record<string, ReturnType<typeof createOrderedResult>>) {
  return {
    from(table: string) {
      const result = results[table];
      if (!result) {
        throw new Error(`Unexpected table ${table}`);
      }

      return result.builder;
    },
    storage: {
      from() {
        return {
          createSignedUrl: async (path: string) => ({
            data: { signedUrl: `https://signed.test/${path}` },
            error: null,
          }),
        };
      },
    },
  };
}

test("fetchSupabaseNetworkData scopes base queries to the authenticated user", async () => {
  const contacts = createOrderedResult([]);
  const companies = createOrderedResult([]);
  const projects = createOrderedResult([]);
  const relationships = createOrderedResult([]);
  const introRequests = createOrderedResult([]);
  const vendors = createOrderedResult([]);

  const supabase = createSupabaseStub({
    contacts,
    companies,
    projects,
    person_relationships: relationships,
    intro_requests: introRequests,
    vendors,
  });

  await fetchSupabaseNetworkData("user-123", supabase as never);

  for (const [table, call] of [
    ["contacts", contacts.queryCall],
    ["companies", companies.queryCall],
    ["projects", projects.queryCall],
    ["person_relationships", relationships.queryCall],
    ["intro_requests", introRequests.queryCall],
  ] as const) {
    assert.deepEqual(call.eqCalls, [{ column: "user_id", value: "user-123" }], `Expected ${table} to filter by user_id`);
  }
});

test("fetchSupabaseNetworkData normalizes legacy service providers into vendor contacts", async () => {
  const contacts = createOrderedResult([
    {
      id: "contact-1",
      user_id: "user-123",
      name: "Priya Provider",
      email: null,
      phone: null,
      role: null,
      type: "service_provider",
      notes: null,
      bio: null,
      created_at: "2026-04-01T00:00:00.000Z",
      contact_companies: [],
      contact_projects: [],
    },
  ]);
  const companies = createOrderedResult([]);
  const projects = createOrderedResult([]);
  const relationships = createOrderedResult([]);
  const introRequests = createOrderedResult([]);
  const vendors = createOrderedResult([]);

  const supabase = createSupabaseStub({
    contacts,
    companies,
    projects,
    person_relationships: relationships,
    intro_requests: introRequests,
    vendors,
  });

  const result = await fetchSupabaseNetworkData("user-123", supabase as never);

  assert.equal(result.contacts.length, 1);
  assert.equal(result.contacts[0]?.type, "vendor");
});

test("fetchSupabaseNetworkData attaches signed media URLs to top-level and related entities", async () => {
  const contacts = createOrderedResult([
    {
      id: "contact-1",
      user_id: "user-123",
      name: "Sarah Johnson",
      email: null,
      phone: null,
      role: "PM",
      type: "employee",
      notes: null,
      bio: null,
      photo_path: "user-123/contacts/contact-1/profile.jpg",
      created_at: "2026-04-01T00:00:00.000Z",
      contact_companies: [
        {
          companies: {
            id: "company-1",
            user_id: "user-123",
            name: "Alpha Corp",
            industry: "Tech",
            color: "#3b82f6",
            logo_path: "user-123/companies/company-1/logo.png",
            is_owned: true,
            created_at: "2026-04-01T00:00:00.000Z",
          },
        },
      ],
      contact_projects: [
        {
          projects: {
            id: "project-1",
            user_id: "user-123",
            name: "Launch",
            status: "active",
            company_id: "company-1",
            logo_path: "user-123/projects/project-1/logo.webp",
            created_at: "2026-04-01T00:00:00.000Z",
          },
        },
      ],
    },
  ]);
  const companies = createOrderedResult([
    {
      id: "company-1",
      user_id: "user-123",
      name: "Alpha Corp",
      industry: "Tech",
      color: "#3b82f6",
      logo_path: "user-123/companies/company-1/logo.png",
      is_owned: true,
      created_at: "2026-04-01T00:00:00.000Z",
    },
  ]);
  const projects = createOrderedResult([
    {
      id: "project-1",
      user_id: "user-123",
      name: "Launch",
      status: "active",
      company_id: "company-1",
      logo_path: "user-123/projects/project-1/logo.webp",
      created_at: "2026-04-01T00:00:00.000Z",
    },
  ]);
  const relationships = createOrderedResult([]);
  const introRequests = createOrderedResult([]);
  const vendors = createOrderedResult([]);

  const supabase = createSupabaseStub({
    contacts,
    companies,
    projects,
    person_relationships: relationships,
    intro_requests: introRequests,
    vendors,
  });

  const result = await fetchSupabaseNetworkData("user-123", supabase as never);

  assert.equal(result.contacts[0]?.photo_url, "https://signed.test/user-123/contacts/contact-1/profile.jpg");
  assert.equal(result.companies[0]?.logo_url, "https://signed.test/user-123/companies/company-1/logo.png");
  assert.equal(result.projects[0]?.logo_url, "https://signed.test/user-123/projects/project-1/logo.webp");
  assert.equal(
    result.contacts[0]?.contact_companies[0]?.companies.logo_url,
    "https://signed.test/user-123/companies/company-1/logo.png",
  );
  assert.equal(
    result.contacts[0]?.contact_projects[0]?.projects.logo_url,
    "https://signed.test/user-123/projects/project-1/logo.webp",
  );
});
