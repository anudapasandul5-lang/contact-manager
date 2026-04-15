import { getSupabaseServer } from "@/lib/supabase/server";
import {
  applyRelatedMediaToContacts,
  attachSignedMediaUrls,
  mapEntitiesById,
} from "@/lib/media/media";
import type {
  Company,
  ContactWithRelations,
  IntroRequest,
  NetworkData,
  PersonRelationship,
  Project,
} from "@/lib/supabase/types";
import {
  fetchVendorsWithRelations,
} from "@/lib/supabase/vendor-mutations";

type QueryBuilder = {
  select: (columns?: string) => QueryBuilder;
  eq: (column: string, value: string) => QueryBuilder;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
};

type SupabaseLike = {
  from: (table: string) => QueryBuilder;
};

function isMissingTableError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.message?.includes("Could not find the table") === true ||
    error.message?.includes("does not exist") === true
  );
}

function resolveSupabaseClient(accessTokenOrClient?: string | SupabaseLike): SupabaseLike {
  if (accessTokenOrClient && typeof accessTokenOrClient !== "string") {
    return accessTokenOrClient;
  }

  return getSupabaseServer(accessTokenOrClient) as unknown as SupabaseLike;
}

function normalizeContactType<T extends { type: string }>(contact: T): T {
  if (contact.type !== "service_provider") {
    return contact;
  }

  return {
    ...contact,
    type: "vendor",
  };
}

export async function fetchSupabaseNetworkData(
  userId: string,
  accessTokenOrClient?: string | SupabaseLike,
): Promise<NetworkData> {
  const supabase = resolveSupabaseClient(accessTokenOrClient);

  const [contactsRes, companiesRes, projectsRes, relationshipsRes, introRequestsRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("*, contact_companies(companies(*)), contact_projects(projects(*))")
      .eq("user_id", userId)
      .order("name"),
    supabase.from("companies").select("*").eq("user_id", userId).order("name"),
    supabase.from("projects").select("*").eq("user_id", userId).order("name"),
    supabase.from("person_relationships").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    supabase.from("intro_requests").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
  ]);

  if (
    contactsRes.error ||
    companiesRes.error ||
    projectsRes.error ||
    (introRequestsRes.error && !isMissingTableError(introRequestsRes.error))
  ) {
    throw new Error(
      contactsRes.error?.message ??
      companiesRes.error?.message ??
      projectsRes.error?.message ??
      introRequestsRes.error?.message ??
      "Failed to load network data.",
    );
  }

  const rawContacts = ((contactsRes.data as ContactWithRelations[]) ?? []).map((contact) => normalizeContactType(contact));
  const rawCompanies = (companiesRes.data as Company[]) ?? [];
  const rawProjects = (projectsRes.data as Project[]) ?? [];
  const companies = await attachSignedMediaUrls(supabase as never, "company", rawCompanies);
  const projects = await attachSignedMediaUrls(supabase as never, "project", rawProjects);
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const contactsWithSignedMedia = await attachSignedMediaUrls(supabase as never, "contact", rawContacts);
  const contacts = applyRelatedMediaToContacts(
    contactsWithSignedMedia,
    mapEntitiesById(companies),
    mapEntitiesById(projects),
  );
  const introRequests = isMissingTableError(introRequestsRes.error)
    ? []
    : ((introRequestsRes.data as IntroRequest[] | null) ?? []);

  const vendors = await fetchVendorsWithRelations(supabase as never, userId);

  if (relationshipsRes.error && !isMissingTableError(relationshipsRes.error)) {
    throw new Error(relationshipsRes.error.message);
  }

  const explicitRelationships: PersonRelationship[] = ((relationshipsRes.data as PersonRelationship[] | null) ?? []).map(
    (relationship) => ({
      ...relationship,
      evidence_company: relationship.evidence_company_id ? companiesById.get(relationship.evidence_company_id) ?? null : null,
      evidence_project: relationship.evidence_project_id ? projectsById.get(relationship.evidence_project_id) ?? null : null,
    }),
  );

  return {
    contacts,
    companies,
    vendors,
    projects,
    relationships: explicitRelationships,
    introRequests,
  };
}
