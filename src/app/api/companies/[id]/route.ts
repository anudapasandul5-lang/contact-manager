import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { parseCompanyPayload } from "@/lib/api/validation";
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
    const { name, industry, color, is_owned } = parseCompanyPayload(body);

    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const { error } = await supabase
      .from("companies")
      .update({ name, industry, color: color || null, is_owned })
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
  await deleteEntityMedia(supabase as never, auth.user.id, "company", id).catch(() => {});
  const { error } = await supabase.from("companies").delete().eq("id", id).eq("user_id", auth.user.id);
  const response = error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ success: true });
  applySessionCookies(response, auth.resolved);
  return response;
}
