import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { MEDIA_BUCKET, validateMediaUpload, resolveAvatarUrl } from "@/lib/media/media";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    const response = NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    applySessionCookies(response, auth.resolved);
    return response;
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    const response = NextResponse.json({ error: "A file is required." }, { status: 400 });
    applySessionCookies(response, auth.resolved);
    return response;
  }

  let mimeType: string;
  let extension: string;
  try {
    ({ mimeType, extension } = validateMediaUpload(file));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid file.";
    const response = NextResponse.json({ error: message }, { status: 400 });
    applySessionCookies(response, auth.resolved);
    return response;
  }

  const storagePath = `${auth.user.id}/profile/avatar.${extension}`;
  const body = Buffer.from(await file.arrayBuffer());
  const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, body, { contentType: mimeType, upsert: true });

  if (uploadError) {
    const response = NextResponse.json({ error: uploadError.message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }

  // Read current display_name to preserve it during upsert
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const { error: upsertError } = await supabase.from("user_profiles").upsert({
    user_id: auth.user.id,
    display_name: (existing?.display_name as string | null) ?? null,
    avatar_path: storagePath,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
    const response = NextResponse.json({ error: upsertError.message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }

  const avatarUrl = await resolveAvatarUrl(supabase as never, storagePath);
  const response = NextResponse.json({ avatar_url: avatarUrl });
  applySessionCookies(response, auth.resolved);
  return response;
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) return auth.response;

  const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("avatar_path")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existing?.avatar_path) {
    await supabase.storage.from(MEDIA_BUCKET).remove([existing.avatar_path as string]);
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ avatar_path: null, updated_at: new Date().toISOString() })
    .eq("user_id", auth.user.id);

  if (error) {
    const response = NextResponse.json({ error: error.message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }

  const response = NextResponse.json({ success: true });
  applySessionCookies(response, auth.resolved);
  return response;
}
