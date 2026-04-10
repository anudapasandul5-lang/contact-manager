import type { ContactType } from "@/lib/supabase/types";

export interface ContactMutationPayload {
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  bio: string | null;
  type: ContactType;
  companyIds: string[];
  projectIds: string[];
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

export async function createContactWithRelations(
  supabase: SupabaseLike,
  userId: string,
  payload: ContactMutationPayload,
) {
  const { data, error } = await supabase.rpc("create_contact_with_relations", {
    p_id: crypto.randomUUID(),
    p_user_id: userId,
    p_name: payload.name,
    p_email: payload.email,
    p_phone: payload.phone,
    p_role: payload.role,
    p_bio: payload.bio,
    p_type: payload.type,
    p_company_ids: uniqueIds(payload.companyIds),
    p_project_ids: uniqueIds(payload.projectIds),
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create contact.");
  }

  return data;
}

export async function updateContactWithRelations(
  supabase: SupabaseLike,
  userId: string,
  contactId: string,
  payload: ContactMutationPayload,
) {
  const { data, error } = await supabase.rpc("update_contact_with_relations", {
    p_id: contactId,
    p_user_id: userId,
    p_name: payload.name,
    p_email: payload.email,
    p_phone: payload.phone,
    p_role: payload.role,
    p_bio: payload.bio,
    p_type: payload.type,
    p_company_ids: uniqueIds(payload.companyIds),
    p_project_ids: uniqueIds(payload.projectIds),
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Contact not found.");
  }

  return data;
}
