import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookies, authenticateRequest } from "@/lib/auth/session";
import { parseIntroRequestPayload } from "@/lib/api/validation";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function normalizeIntroRequestError(message: string) {
  if (message.includes("Could not find the table") || message.includes("intro_requests")) {
    return "Warm intro request storage is not set up yet. Run setup-database.sql in Supabase, then try again.";
  }

  return message;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const payload = parseIntroRequestPayload(await request.json());
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const { data, error } = await supabase
      .from("intro_requests")
      .update({
        requester_contact_id: payload.requester_contact_id,
        connector_contact_id: payload.connector_contact_id,
        target_contact_id: payload.target_contact_id,
        status: payload.status,
        message_draft: payload.message_draft,
        requested_at: payload.requested_at,
        resolved_at: payload.resolved_at,
        outcome_notes: payload.outcome_notes,
      })
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error("Intro request not found.");
    }

    const response = NextResponse.json(data);
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = normalizeIntroRequestError(error instanceof Error ? error.message : "Failed to update intro request.");
    const status =
      message === "Intro request not found."
        ? 404
        : message.includes("required") || message.includes("valid")
          ? 400
          : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
