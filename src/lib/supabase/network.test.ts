// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
      maybeSingle: async () => ({
        data: Array.isArray(data) ? (data[0] ?? null) : data,
        error: null,
      }),
    },
  };
}

function createSupabaseStub(results: Partial<Record<string, ReturnType<typeof createOrderedResult>>>) {
  return {
    from(table: string) {
      const result = results[table] ?? createOrderedResult(null);
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

it("fetchSupabaseNetworkData scopes base queries to the authenticated user", async () => {
  const contacts = createOrderedResult([]);
  const companies = createOrderedResult([]);
  const projects = createOrderedResult([]);
  const relationships = createOrderedResult([]);
  const introRequests = createOrderedResult([]);
  const followUps = createOrderedResult([]);
  const vendors = createOrderedResult([]);
  const userProfiles = createOrderedResult(null);

  const supabase = createSupabaseStub({
    contacts,
    companies,
    projects,
    person_relationships: relationships,
    intro_requests: introRequests,
    follow_ups: followUps,
    vendors,
    user_profiles: userProfiles,
  });

  await fetchSupabaseNetworkData("user-123", supabase as never);

  for (const [table, call] of [
    ["contacts", contacts.queryCall],
    ["companies", companies.queryCall],
    ["projects", projects.queryCall],
    ["person_relationships", relationships.queryCall],
    ["intro_requests", introRequests.queryCall],
    ["follow_ups", followUps.queryCall],
    ["user_profiles", userProfiles.queryCall],
  ] as const) {
    assert.deepEqual(call.eqCalls, [{ column: "user_id", value: "user-123" }], `Expected ${table} to filter by user_id`);
  }
});

it("fetchSupabaseNetworkData normalizes legacy service providers into vendor contacts", async () => {
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
  const followUps = createOrderedResult([]);
  const vendors = createOrderedResult([]);

  const supabase = createSupabaseStub({
    contacts,
    companies,
    projects,
    person_relationships: relationships,
    intro_requests: introRequests,
    follow_ups: followUps,
    vendors,
  });

  const result = await fetchSupabaseNetworkData("user-123", supabase as never);

  assert.equal(result.contacts.length, 1);
  assert.equal(result.contacts[0]?.type, "vendor");
  assert.deepEqual(result.currentUser, { display_name: null, avatar_url: null });
});

it("fetchSupabaseNetworkData attaches signed media URLs to top-level and related entities", async () => {
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
  const followUps = createOrderedResult([]);
  const vendors = createOrderedResult([]);

  const supabase = createSupabaseStub({
    contacts,
    companies,
    projects,
    person_relationships: relationships,
    intro_requests: introRequests,
    follow_ups: followUps,
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

it("fetchSupabaseNetworkData includes the signed current user profile", async () => {
  const supabase = createSupabaseStub({
    contacts: createOrderedResult([]),
    companies: createOrderedResult([]),
    projects: createOrderedResult([]),
    person_relationships: createOrderedResult([]),
    intro_requests: createOrderedResult([]),
    follow_ups: createOrderedResult([]),
    vendors: createOrderedResult([]),
    user_profiles: createOrderedResult({
      display_name: "Alice",
      avatar_path: "user-123/profile/avatar.png",
    }),
  });

  const result = await fetchSupabaseNetworkData("user-123", supabase as never);

  assert.deepEqual(result.currentUser, {
    display_name: "Alice",
    avatar_url: "https://signed.test/user-123/profile/avatar.png",
  });
});

it("fetchSupabaseNetworkData returns follow-ups ordered alongside the network payload", async () => {
  const contacts = createOrderedResult([]);
  const companies = createOrderedResult([]);
  const projects = createOrderedResult([]);
  const relationships = createOrderedResult([]);
  const introRequests = createOrderedResult([]);
  const followUps = createOrderedResult([
    {
      id: "follow-up-1",
      user_id: "user-123",
      contact_id: "contact-1",
      company_id: "company-1",
      project_id: null,
      objective: "Reconnect about roadmap timing",
      notes: "Share the updated milestone plan",
      scheduled_for: "2026-04-22T09:00:00.000Z",
      completed_at: null,
      completion_note: null,
      created_at: "2026-04-17T08:00:00.000Z",
      updated_at: "2026-04-17T08:00:00.000Z",
    },
  ]);
  const vendors = createOrderedResult([]);

  const supabase = createSupabaseStub({
    contacts,
    companies,
    projects,
    person_relationships: relationships,
    intro_requests: introRequests,
    follow_ups: followUps,
    vendors,
  });

  const result = await fetchSupabaseNetworkData("user-123", supabase as never);

  assert.deepEqual(result.followUps, [
    {
      id: "follow-up-1",
      user_id: "user-123",
      contact_id: "contact-1",
      company_id: "company-1",
      project_id: null,
      objective: "Reconnect about roadmap timing",
      notes: "Share the updated milestone plan",
      scheduled_for: "2026-04-22T09:00:00.000Z",
      completed_at: null,
      completion_note: null,
      created_at: "2026-04-17T08:00:00.000Z",
      updated_at: "2026-04-17T08:00:00.000Z",
    },
  ]);
});
