import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applySessionCookies, clearSessionCookies } from "@/lib/auth/session";
import { parseAuthCredentials } from "@/lib/auth/form";
import { getSupabaseEnv } from "@/lib/supabase/config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = parseAuthCredentials(body);

    const { url, anonKey } = getSupabaseEnv();
    const supabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      const response = NextResponse.json(
        { error: error?.message ?? "Invalid email or password." },
        { status: 401 },
      );
      clearSessionCookies(response);
      return response;
    }

    const response = NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

    applySessionCookies(response, {
      session: data.session,
      user: data.user,
      accessToken: data.session.access_token,
      cookiesChanged: true,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
