import { createClient } from "@supabase/supabase-js";
import {
  createGoogleOAuthCallbackRouteResponse,
} from "@/lib/auth/google-flow";
import { getSupabaseEnv } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const { url, anonKey } = getSupabaseEnv();
  const cookieHeader = request.headers.get("cookie");
  const cookies = new Map(
    (cookieHeader ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        const name = separator >= 0 ? part.slice(0, separator) : part;
        const value = separator >= 0 ? part.slice(separator + 1) : "";
        return [name, value];
      }),
  );

  return createGoogleOAuthCallbackRouteResponse(
    request.url,
    (name) => cookies.get(name) ?? null,
    (auth) => createClient(url, anonKey, { auth }).auth,
  );
}
