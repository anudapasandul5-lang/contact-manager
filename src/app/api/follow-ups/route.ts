import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookies, authenticateRequest } from "@/lib/auth/session";
import { parseFollowUpCreatePayload } from "@/lib/api/validation";
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

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const { data, error } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("scheduled_for");

    if (error) {
      throw new Error(error.message);
    }

    const response = NextResponse.json(data ?? []);
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = normalizeFollowUpError(error instanceof Error ? error.message : "Failed to load follow-ups.");
    const response = NextResponse.json({ error: message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const payload = parseFollowUpCreatePayload(await request.json());
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const { data, error } = await supabase
      .from("follow_ups")
      .insert({
        id: crypto.randomUUID(),
        user_id: auth.user.id,
        contact_id: payload.contact_id,
        company_id: payload.company_id,
        project_id: payload.project_id,
        objective: payload.objective,
        notes: payload.notes,
        scheduled_for: payload.scheduled_for,
      })
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

    const response = NextResponse.json(data, { status: 201 });
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = normalizeFollowUpError(error instanceof Error ? error.message : "Failed to create follow-up.");
    const status = message.includes("required") || message.includes("valid") ? 400 : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
