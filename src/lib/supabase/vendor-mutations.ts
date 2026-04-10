import type { ContactWithRelations, VendorWithRelations } from "@/lib/supabase/types";

export interface VendorPersonMutationPayload {
  id?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  bio: string | null;
}

export interface VendorMutationPayload {
  name: string;
  specialty: string | null;
  notes: string | null;
  color: string | null;
  companyIds: string[];
  projectIds: string[];
  people: VendorPersonMutationPayload[];
}

type SupabaseLike = {
  from: (table: string) => any;
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

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

async function replaceVendorJoinRows(
  supabase: SupabaseLike,
  table: "vendor_companies" | "vendor_projects",
  vendorId: string,
  ids: string[],
) {
  const unique = uniqueIds(ids);
  const key = table === "vendor_companies" ? "company_id" : "project_id";

  const { error: deleteError } = await supabase.from(table).delete().eq("vendor_id", vendorId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (unique.length === 0) {
    return;
  }

  const rows = unique.map((id) => ({ vendor_id: vendorId, [key]: id }));
  const { error: insertError } = await (supabase.from(table) as any).insert(rows);
  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function replaceVendorPeople(
  supabase: SupabaseLike,
  vendorId: string,
  people: VendorPersonMutationPayload[],
) {
  const { error: deleteError } = await supabase.from("vendor_people").delete().eq("vendor_id", vendorId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (people.length === 0) {
    return;
  }

  const rows = people.map((person) => ({
    id: person.id || crypto.randomUUID(),
    vendor_id: vendorId,
    name: person.name,
    email: person.email,
    phone: person.phone,
    role: person.role,
    bio: person.bio,
  }));

  const { error: insertError } = await (supabase.from("vendor_people") as any).insert(rows);
  if (insertError) {
    throw new Error(insertError.message);
  }
}

export async function createVendorWithRelations(
  supabase: SupabaseLike,
  userId: string,
  payload: VendorMutationPayload,
) {
  const vendorId = crypto.randomUUID();
  const { data, error } = await supabase.rpc("create_vendor_with_relations", {
    p_id: vendorId,
    p_user_id: userId,
    p_name: payload.name,
    p_specialty: payload.specialty,
    p_notes: payload.notes,
    p_color: payload.color,
    p_company_ids: uniqueIds(payload.companyIds),
    p_project_ids: uniqueIds(payload.projectIds),
    p_people: payload.people.map((person) => ({
      id: person.id ?? null,
      name: person.name,
      email: person.email,
      phone: person.phone,
      role: person.role,
      bio: person.bio,
    })),
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create vendor.");
  }

  return data;
}

export async function updateVendorWithRelations(
  supabase: SupabaseLike,
  userId: string,
  vendorId: string,
  payload: VendorMutationPayload,
) {
  const { data, error } = await supabase.rpc("update_vendor_with_relations", {
    p_id: vendorId,
    p_user_id: userId,
    p_name: payload.name,
    p_specialty: payload.specialty,
    p_notes: payload.notes,
    p_color: payload.color,
    p_company_ids: uniqueIds(payload.companyIds),
    p_project_ids: uniqueIds(payload.projectIds),
    p_people: payload.people.map((person) => ({
      id: person.id ?? null,
      name: person.name,
      email: person.email,
      phone: person.phone,
      role: person.role,
      bio: person.bio,
    })),
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Vendor not found.");
  }

  return data;
}

export async function fetchVendorsWithRelations(
  supabase: SupabaseLike,
  userId: string,
): Promise<VendorWithRelations[]> {
  const { data, error } = await supabase
    .from("vendors")
    .select("*, vendor_people(*), vendor_companies(companies(*)), vendor_projects(projects(*))")
    .eq("user_id", userId)
    .order("name");

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data as VendorWithRelations[] | null) ?? [];
}

export async function migrateLegacyVendorContacts(
  supabase: SupabaseLike,
  userId: string,
  legacyContacts: ContactWithRelations[],
) {
  if (legacyContacts.length === 0) {
    return { migrated: 0 };
  }

  const existingVendorQuery = await (supabase
    .from("vendors")
    .select("*")
    .eq("user_id", userId)
    .order("name") as any);

  if (existingVendorQuery.error) {
    if (isMissingTableError(existingVendorQuery.error)) {
      return { migrated: 0, skipped: true };
    }

    throw new Error(existingVendorQuery.error.message);
  }

  const existingLegacyIds = new Set(
    ((existingVendorQuery.data as Array<{ legacy_contact_id?: string | null }> | null) ?? [])
      .map((vendor) => vendor.legacy_contact_id)
      .filter((value): value is string => Boolean(value)),
  );

  let migrated = 0;

  for (const contact of legacyContacts) {
    if (existingLegacyIds.has(contact.id)) {
      continue;
    }

    const vendorId = crypto.randomUUID();
    const { error: vendorError } = await (supabase.from("vendors") as any).insert({
      id: vendorId,
      user_id: userId,
      name: contact.name,
      specialty: contact.role,
      notes: contact.bio,
      color: null,
      legacy_contact_id: contact.id,
    });

    if (vendorError) {
      throw new Error(vendorError.message);
    }

    await replaceVendorJoinRows(
      supabase,
      "vendor_companies",
      vendorId,
      (contact.contact_companies ?? []).map(({ companies }) => companies.id),
    );
    await replaceVendorJoinRows(
      supabase,
      "vendor_projects",
      vendorId,
      (contact.contact_projects ?? []).map(({ projects }) => projects.id),
    );
    await replaceVendorPeople(supabase, vendorId, [
      {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        bio: contact.bio,
      },
    ]);

    const { error: deleteError } = await supabase.from("contacts").delete().eq("id", contact.id);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    migrated += 1;
  }

  return { migrated };
}
