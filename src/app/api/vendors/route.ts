import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { parseVendorPayload } from "@/lib/api/validation";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  createVendorWithRelations,
  fetchVendorsWithRelations,
  migrateLegacyVendorContacts,
} from "@/lib/supabase/vendor-mutations";
import type { ContactWithRelations } from "@/lib/supabase/types";

export const runtime = "nodejs";

function mapLegacyVendorContacts(legacyContacts: ContactWithRelations[], userId: string) {
  return legacyContacts.map((contact) => ({
    id: `legacy-vendor-${contact.id}`,
    user_id: userId,
    name: contact.name,
    specialty: contact.role,
    notes: contact.bio,
    color: null,
    legacy_contact_id: contact.id,
    created_at: contact.created_at,
    vendor_people: [
      {
        id: `legacy-vendor-person-${contact.id}`,
        vendor_id: `legacy-vendor-${contact.id}`,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        bio: contact.bio,
        created_at: contact.created_at,
      },
    ],
    vendor_companies: contact.contact_companies ?? [],
    vendor_projects: contact.contact_projects ?? [],
  }));
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
  const legacyContactsRes = await supabase
    .from("contacts")
    .select("*, contact_companies(companies(*)), contact_projects(projects(*))")
    .eq("user_id", auth.user.id)
    .eq("type", "vendor")
    .order("name");

  if (legacyContactsRes.error) {
    const response = NextResponse.json({ error: legacyContactsRes.error.message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }

  const legacyContacts = (legacyContactsRes.data as ContactWithRelations[] | null) ?? [];

  try {
    await migrateLegacyVendorContacts(supabase, auth.user.id, legacyContacts);
    const vendors = await fetchVendorsWithRelations(supabase, auth.user.id);
    const payload = vendors.length > 0 ? vendors : mapLegacyVendorContacts(legacyContacts, auth.user.id);
    const response = NextResponse.json(payload);
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load vendors.";
    const response = NextResponse.json({ error: message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const payload = parseVendorPayload(body);
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const vendor = await createVendorWithRelations(supabase, auth.user.id, payload);

    const response = NextResponse.json(vendor, { status: 201 });
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    const status = message.includes("required") || message.includes("valid") ? 400 : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
