import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookies, authenticateRequest } from "@/lib/auth/session";
import { parseFollowUpCompletionPayload } from "@/lib/api/validation";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function normalizeFollowUpError(message: string) {
  if (message.includes("Could not find the table") || message.includes("follow_ups")) {
    return "Follow-up storage is not set up yet. Run setup-database.sql in Supabase, then try again.";
  }

  return message;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const payload = parseFollowUpCompletionPayload(await request.json());
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const { data, error } = await supabase.rpc("complete_follow_up_with_optional_next", {
      p_follow_up_id: id,
      p_user_id: auth.user.id,
      p_completion_note: payload.completion_note,
      p_next_follow_up: payload.next,
    });

    if (error) {
      throw new Error(error.message);
    }

    const response = NextResponse.json(data);
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = normalizeFollowUpError(error instanceof Error ? error.message : "Failed to complete follow-up.");
    const status =
      message.includes("already completed")
        ? 409
        : message.includes("not found")
          ? 404
          : message.includes("required") || message.includes("valid")
            ? 400
            : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
