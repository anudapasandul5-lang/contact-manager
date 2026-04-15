import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applySessionCookies, clearSessionCookies } from "@/lib/auth/session";
import { getAuthModeConfig, parseAuthCredentials } from "@/lib/auth/form";
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

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      const response = NextResponse.json({ error: error.message }, { status: 400 });
      clearSessionCookies(response);
      return response;
    }

    if (!data.user) {
      const response = NextResponse.json({ error: "Unable to create account." }, { status: 500 });
      clearSessionCookies(response);
      return response;
    }

    const requiresEmailConfirmation = !data.session;
    const response = NextResponse.json(
      {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        requiresEmailConfirmation,
        successMessage: requiresEmailConfirmation
          ? getAuthModeConfig("sign-up").successLabel
          : undefined,
      },
      { status: 201 },
    );

    if (data.session) {
      applySessionCookies(response, {
        session: data.session,
        user: data.user,
        accessToken: data.session.access_token,
        cookiesChanged: true,
      });
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
