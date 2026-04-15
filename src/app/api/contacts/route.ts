import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { parseContactPayload } from "@/lib/api/validation";
import {
  applyRelatedMediaToContacts,
  attachSignedMediaUrls,
  mapEntitiesById,
} from "@/lib/media/media";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createContactWithRelations } from "@/lib/supabase/contact-mutations";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
  const [
    { data, error },
    { data: companiesData, error: companiesError },
    { data: projectsData, error: projectsError },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("*, contact_companies(companies(*)), contact_projects(projects(*))")
      .eq("user_id", auth.user.id)
      .order("name"),
    supabase.from("companies").select("*").eq("user_id", auth.user.id).order("name"),
    supabase.from("projects").select("*").eq("user_id", auth.user.id).order("name"),
  ]);

  const payload = error || companiesError || projectsError
    ? null
    : applyRelatedMediaToContacts(
        await attachSignedMediaUrls(supabase as never, "contact", data ?? []),
        mapEntitiesById(await attachSignedMediaUrls(supabase as never, "company", companiesData ?? [])),
        mapEntitiesById(await attachSignedMediaUrls(supabase as never, "project", projectsData ?? [])),
      );

  const response = error || companiesError || projectsError
    ? NextResponse.json({ error: error?.message ?? companiesError?.message ?? projectsError?.message }, { status: 500 })
    : NextResponse.json(payload ?? []);

  applySessionCookies(response, auth.resolved);
  return response;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const payload = parseContactPayload(body);
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const contact = await createContactWithRelations(supabase, auth.user.id, payload);
    const [enrichedContact] = await attachSignedMediaUrls(supabase as never, "contact", [contact]);

    const response = NextResponse.json(enrichedContact, { status: 201 });
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
