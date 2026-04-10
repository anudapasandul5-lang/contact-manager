import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { parseVendorPayload } from "@/lib/api/validation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { updateVendorWithRelations } from "@/lib/supabase/vendor-mutations";

export const runtime = "nodejs";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const payload = parseVendorPayload(body);
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    await updateVendorWithRelations(supabase, auth.user.id, id, payload);

    const response = NextResponse.json({ success: true });
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    const status =
      message === "Vendor not found."
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
  const { error } = await supabase.from("vendors").delete().eq("id", id).eq("user_id", auth.user.id);
  const response = error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ success: true });
  applySessionCookies(response, auth.resolved);
  return response;
}
