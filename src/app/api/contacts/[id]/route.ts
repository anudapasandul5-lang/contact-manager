import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { parseContactPayload } from "@/lib/api/validation";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const payload = parseContactPayload(body);
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);

    const { error } = await supabase.rpc("update_contact_with_relations", {
      p_contact_id: id,
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
      if (error.code === "P0002") throw new Error("Contact not found.");
      throw new Error(error.message);
    }

    const response = NextResponse.json({ success: true });
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    const status =
      message === "Contact not found."
        ? 404
        : message.includes("required") || message.includes("valid")
          ? 400
          : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  const { id } = await params;
  const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  const response = error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ success: true });
  applySessionCookies(response, auth.resolved);
  return response;
}
