import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { parseProjectPayload } from "@/lib/api/validation";
import { deleteEntityMedia } from "@/lib/media/media";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, status, company_id } = parseProjectPayload(body);

    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const { error } = await supabase
      .from("projects")
      .update({ name, status, company_id: company_id || null })
      .eq("id", id)
      .eq("user_id", auth.user.id);

    const response = error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ success: true });
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    const response = NextResponse.json({ error: message }, { status: 400 });
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
  const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", auth.user.id);
  if (error) {
    const response = NextResponse.json({ error: error.message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }
  deleteEntityMedia(supabase as never, auth.user.id, "project", id).catch(() => {});
  const response = NextResponse.json({ success: true });
  applySessionCookies(response, auth.resolved);
  return response;
}
