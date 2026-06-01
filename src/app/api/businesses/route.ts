import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) return auth.response;

  const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, color")
    .eq("user_id", auth.user.id)
    .order("created_at");

  const response = error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json(data ?? []);
  applySessionCookies(response, auth.resolved);
  return response;
}
