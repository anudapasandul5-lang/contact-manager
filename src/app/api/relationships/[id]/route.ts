import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookies, authenticateRequest } from "@/lib/auth/session";
import { parseRelationshipPayload } from "@/lib/api/validation";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function canonicalPair(sourceId: string, targetId: string) {
  return sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
}

function normalizeRelationshipError(message: string) {
  if (message.includes("Could not find the table") || message.includes("person_relationships")) {
    return "Relationship link storage is not set up yet. Run setup-database.sql in Supabase, then try again.";
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
    const payload = parseRelationshipPayload(await request.json());
    const [sourceContactId, targetContactId] = canonicalPair(payload.source_contact_id, payload.target_contact_id);
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const { data, error } = await supabase
      .from("person_relationships")
      .update({
        source_contact_id: sourceContactId,
        target_contact_id: targetContactId,
        strength: payload.strength,
        is_inferred: false,
        evidence_type: payload.evidence_type,
        evidence_company_id: payload.evidence_company_id,
        evidence_project_id: payload.evidence_project_id,
        last_confirmed_at: payload.last_confirmed_at,
        how_they_know_each_other: payload.how_they_know_each_other,
        notes: payload.notes,
      })
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error("Relationship not found.");
    }

    const response = NextResponse.json(data);
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = normalizeRelationshipError(error instanceof Error ? error.message : "Failed to update relationship.");
    const status =
      message === "Relationship not found."
        ? 404
        : message.includes("required") || message.includes("valid")
          ? 400
          : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
