import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { parseCompanyPayload } from "@/lib/api/validation";
import { attachSignedMediaUrls } from "@/lib/media/media";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
  const { data, error } = await supabase.from("companies").select("*").eq("user_id", auth.user.id).order("name");
  const payload = error ? null : await attachSignedMediaUrls(supabase as never, "company", data ?? []);
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
    const { name, industry, color, is_owned } = parseCompanyPayload(body);

    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    const { data, error } = await supabase
      .from("companies")
      .insert({
        id: crypto.randomUUID(),
        user_id: auth.user.id,
        name,
        industry,
        color: color || null,
        logo_path: null,
        is_owned: is_owned ?? false,
      })
      .select()
      .single();
    const [payload] = data ? await attachSignedMediaUrls(supabase as never, "company", [data]) : [];

    // Auto-create matching business for forecast/task grouping (best-effort)
    if (data) {
      try {
        const bizId = `biz-${data.id}`;
        await supabase.from("businesses").insert({
          id: bizId,
          user_id: auth.user.id,
          name,
          color: color || "#6b7280",
        });
        await supabase.from("company_businesses").insert({
          company_id: data.id,
          business_id: bizId,
        });
      } catch {
        // Silently ignore business sync errors; company creation succeeds regardless
      }
    }

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
