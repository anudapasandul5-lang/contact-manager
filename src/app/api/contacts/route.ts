import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { parseContactPayload } from "@/lib/api/validation";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
  const { data, error } = await supabase
    .from("contacts")
    .select("*, contact_companies(companies(*)), contact_projects(projects(*))")
    .order("name");

  const response = error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json(data);

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

    const { data: contact, error } = await supabase.rpc("create_contact_with_relations", {
      p_name: payload.name,
      p_email: payload.email ?? null,
      p_phone: payload.phone ?? null,
      p_role: payload.role ?? null,
      p_bio: payload.bio ?? null,
      p_type: payload.type,
      p_company_ids: payload.companyIds,
      p_project_ids: payload.projectIds,
    });

    if (error) {
      throw new Error(error.message);
    }

    const response = NextResponse.json(contact, { status: 201 });
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
