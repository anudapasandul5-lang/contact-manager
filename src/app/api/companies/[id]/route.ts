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

    if (!error) {
      // Sync matching business name+color (best-effort)
      try {
        await supabase
          .from("businesses")
          .update({ name, color: color || "#6b7280" })
          .eq("id", `biz-${id}`)
          .eq("user_id", auth.user.id);
      } catch {
        // Ignore sync errors
      }
    }

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
  const bizId = `biz-${id}`;

  // Delete tasks tagged to this business (explicit — FK is SET NULL, not CASCADE)
  await supabase.from("tasks").delete().eq("business_id", bizId).eq("user_id", auth.user.id);

  // Delete business (cascades company_businesses junction via FK)
  await supabase.from("businesses").delete().eq("id", bizId).eq("user_id", auth.user.id);

  // Delete company — media cleanup is best-effort and runs without blocking
  const { error } = await supabase.from("companies").delete().eq("id", id).eq("user_id", auth.user.id);
  if (!error) {
    deleteEntityMedia(supabase as never, auth.user.id, "company", id).catch(() => {});
  }
  const response = error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ success: true });
  applySessionCookies(response, auth.resolved);
  return response;
}
