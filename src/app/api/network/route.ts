import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { fetchSupabaseNetworkData } from "@/lib/supabase/network";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const payload = await fetchSupabaseNetworkData(auth.user.id, auth.resolved.accessToken ?? undefined);
    const response = NextResponse.json(payload);
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load network data.";
    const response = NextResponse.json({ error: message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
