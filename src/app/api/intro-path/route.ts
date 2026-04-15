import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookies, authenticateRequest } from "@/lib/auth/session";
import { findBestIntroPath } from "@/lib/intro/graph";
import { fetchSupabaseNetworkData } from "@/lib/supabase/network";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;
  }

  try {
    const targetContactId = request.nextUrl.searchParams.get("targetContactId");
    if (!targetContactId) {
      throw new Error("targetContactId is required.");
    }

    const data = await fetchSupabaseNetworkData(auth.user.id, auth.resolved.accessToken ?? undefined);
    const result = findBestIntroPath(data, targetContactId);

    if (!result) {
      const response = NextResponse.json({ error: "Target contact not found." }, { status: 404 });
      applySessionCookies(response, auth.resolved);
      return response;
    }

    const response = NextResponse.json(result);
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to calculate intro path.";
    const status = message.includes("required") ? 400 : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
