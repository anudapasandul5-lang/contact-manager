import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveAvatarUrl } from "@/lib/media/media";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) return auth.response;

  const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);

  const { data, error } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_path")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    const response = NextResponse.json({ error: error.message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }

  const avatarUrl = data?.avatar_path
    ? await resolveAvatarUrl(supabase as never, data.avatar_path as string)
    : null;

  const response = NextResponse.json({
    display_name: data?.display_name ?? null,
    avatar_url: avatarUrl,
    email: auth.user.email ?? null,
  });
  applySessionCookies(response, auth.resolved);
  return response;
}

const patchSchema = z.object({
  display_name: z.string().max(100).nullable(),
});

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const response = NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    applySessionCookies(response, auth.resolved);
    return response;
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const response = NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 422 },
    );
    applySessionCookies(response, auth.resolved);
    return response;
  }

  const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);

  // Read current row to preserve avatar_path during upsert
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("avatar_path")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const { error } = await supabase.from("user_profiles").upsert({
    user_id: auth.user.id,
    display_name: parsed.data.display_name,
    avatar_path: (existing?.avatar_path as string | null) ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    const response = NextResponse.json({ error: error.message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }

  const response = NextResponse.json({ success: true });
  applySessionCookies(response, auth.resolved);
  return response;
}
