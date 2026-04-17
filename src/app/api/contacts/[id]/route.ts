import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { parseContactPayload } from "@/lib/api/validation";
import { deleteEntityMedia } from "@/lib/media/media";
import { getSupabaseServer } from "@/lib/supabase/server";
import { updateContactWithRelations } from "@/lib/supabase/contact-mutations";

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
    await updateContactWithRelations(supabase, auth.user.id, id, payload);

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
  const { error } = await supabase.from("contacts").delete().eq("id", id).eq("user_id", auth.user.id);
  if (error) {
    const response = NextResponse.json({ error: error.message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }
  deleteEntityMedia(supabase as never, auth.user.id, "contact", id).catch(() => {});
  const response = NextResponse.json({ success: true });
  applySessionCookies(response, auth.resolved);
  return response;
}
