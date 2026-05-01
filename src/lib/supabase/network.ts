import { getSupabaseServer } from "@/lib/supabase/server";
import {
  applyRelatedMediaToContacts,
  attachSignedMediaUrls,
  mapEntitiesById,
  resolveAvatarUrl,
} from "@/lib/media/media";
import type {
  Company,
  ContactWithRelations,
  FollowUp,
  IntroRequest,
  NetworkData,
  PersonRelationship,
  Project,
  UserProfile,
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
  maybeSingle: () => Promise<{
    data: Record<string, unknown> | null;
    error: { code?: string; message?: string } | null;
  }>;
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

  const [contactsRes, companiesRes, projectsRes, relationshipsRes, introRequestsRes, followUpsRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("*, contact_companies(companies(*)), contact_projects(projects(*))")
      .eq("user_id", userId)
      .order("name"),
    supabase.from("companies").select("*").eq("user_id", userId).order("name"),
    supabase.from("projects").select("*").eq("user_id", userId).order("name"),
    supabase.from("person_relationships").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    supabase.from("intro_requests").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    supabase.from("follow_ups").select("*").eq("user_id", userId).order("scheduled_for"),
  ]);

  if (
    contactsRes.error ||
    companiesRes.error ||
    projectsRes.error ||
    (introRequestsRes.error && !isMissingTableError(introRequestsRes.error)) ||
    (followUpsRes.error && !isMissingTableError(followUpsRes.error))
  ) {
    throw new Error(
      contactsRes.error?.message ??
      companiesRes.error?.message ??
      projectsRes.error?.message ??
      introRequestsRes.error?.message ??
      followUpsRes.error?.message ??
      "Failed to load network data.",
    );
  }

  const rawContacts = ((contactsRes.data as ContactWithRelations[]) ?? []).map((contact) => normalizeContactType(contact));
  const rawCompanies = (companiesRes.data as Company[]) ?? [];
  const rawProjects = (projectsRes.data as Project[]) ?? [];
  const [companies, projects, contactsWithSignedMedia, vendors, profileRes] = await Promise.all([
    attachSignedMediaUrls(supabase as never, "company", rawCompanies),
    attachSignedMediaUrls(supabase as never, "project", rawProjects),
    attachSignedMediaUrls(supabase as never, "contact", rawContacts),
    fetchVendorsWithRelations(supabase as never, userId),
    supabase
      .from("user_profiles")
      .select("display_name, avatar_path")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const contacts = applyRelatedMediaToContacts(
    contactsWithSignedMedia,
    mapEntitiesById(companies),
    mapEntitiesById(projects),
  );
  const introRequests = isMissingTableError(introRequestsRes.error)
    ? []
    : ((introRequestsRes.data as IntroRequest[] | null) ?? []);
  const followUps = isMissingTableError(followUpsRes.error)
    ? []
    : ((followUpsRes.data as FollowUp[] | null) ?? []);

  const avatarUrl =
    !profileRes.error && profileRes.data?.avatar_path
      ? await resolveAvatarUrl(supabase as never, String(profileRes.data.avatar_path))
      : null;

  const currentUser: UserProfile = {
    display_name: !profileRes.error && profileRes.data?.display_name
      ? String(profileRes.data.display_name)
      : null,
    avatar_url: avatarUrl,
  };

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
    followUps,
    currentUser,
  };
}
