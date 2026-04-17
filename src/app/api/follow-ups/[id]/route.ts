import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookies, authenticateRequest } from "@/lib/auth/session";
import { parseFollowUpPatchPayload } from "@/lib/api/validation";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function normalizeFollowUpError(message: string) {
  if (message.includes("Could not find the table") || message.includes("follow_ups")) {
    return "Follow-up storage is not set up yet. Run setup-database.sql in Supabase, then try again.";
  }

  return message;
}

function isDuplicateOpenFollowUp(error: { code?: string; message?: string } | null) {
  return error?.code === "23505"
    || error?.message?.includes("follow_ups_one_open_per_contact_idx") === true;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const payload = parseFollowUpPatchPayload(await request.json());
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const { data, error } = await supabase
      .from("follow_ups")
      .update(payload)
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .is("completed_at", null)
      .select()
      .single();

    if (error) {
      if (isDuplicateOpenFollowUp(error)) {
        const response = NextResponse.json(
          { error: "This contact already has an open follow-up." },
          { status: 409 },
        );
        applySessionCookies(response, auth.resolved);
        return response;
      }

      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Follow-up not found.");
    }

    const response = NextResponse.json(data);
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = normalizeFollowUpError(error instanceof Error ? error.message : "Failed to update follow-up.");
    const status =
      message === "Follow-up not found."
        ? 404
        : message.includes("required") || message.includes("valid")
          ? 400
          : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
