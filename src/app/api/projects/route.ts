import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { parseProjectPayload } from "@/lib/api/validation";
import { attachSignedMediaUrls } from "@/lib/media/media";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
  const { data, error } = await supabase.from("projects").select("*").eq("user_id", auth.user.id).order("name");
  const payload = error ? null : await attachSignedMediaUrls(supabase as never, "project", data ?? []);
  const response = error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json(payload ?? []);
  applySessionCookies(response, auth.resolved);
  return response;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { name, status, company_id } = parseProjectPayload(body);

    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const { data, error } = await supabase
      .from("projects")
      .insert({
        id: crypto.randomUUID(),
        user_id: auth.user.id,
        name,
        status: status || "planning",
        company_id: company_id || null,
        logo_path: null,
      })
      .select()
      .single();
    const [payload] = data ? await attachSignedMediaUrls(supabase as never, "project", [data]) : [];

    const response = error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json(payload ?? data, { status: 201 });
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    const response = NextResponse.json({ error: message }, { status: 400 });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
