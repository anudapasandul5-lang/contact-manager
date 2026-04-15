import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookies, authenticateRequest } from "@/lib/auth/session";
import {
  deleteEntityMedia,
  isMediaEntityType,
  uploadEntityMedia,
} from "@/lib/media/media";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getValidatedEntityType(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string" || !isMediaEntityType(value)) {
    throw new Error("A valid entity type is required.");
  }

  return value;
}

function getValidatedEntityId(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("An entity id is required.");
  }

  return value.trim();
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const formData = await request.formData();
    const entityType = getValidatedEntityType(formData.get("entityType"));
    const entityId = getValidatedEntityId(formData.get("entityId"));
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("A file is required.");
    }

    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const payload = await uploadEntityMedia(supabase as never, auth.user.id, entityType, entityId, file);
    const response = NextResponse.json(payload);
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload image.";
    const status = message.includes("valid") || message.includes("required") || message.includes("Only") || message.includes("smaller")
      ? 400
      : message === "Entity not found."
        ? 404
        : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const entityType = getValidatedEntityType(body?.entityType ?? null);
    const entityId = getValidatedEntityId(body?.entityId ?? null);
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);

    await deleteEntityMedia(supabase as never, auth.user.id, entityType, entityId);

    const response = NextResponse.json({ success: true });
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove image.";
    const status = message.includes("valid") || message.includes("required")
      ? 400
      : message === "Entity not found."
        ? 404
        : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
