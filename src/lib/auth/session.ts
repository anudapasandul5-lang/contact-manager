import { cache } from "react";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/config";

export const ACCESS_TOKEN_COOKIE = "cm-access-token";
export const REFRESH_TOKEN_COOKIE = "cm-refresh-token";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export interface ResolvedSession {
  session: Session | null;
  user: User | null;
  accessToken: string | null;
  cookiesChanged: boolean;
}

export function createResolvedSession(session: Session, user: User): ResolvedSession {
  return {
    session,
    user,
    accessToken: session.access_token,
    cookiesChanged: true,
  };
}

function createAuthClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getCookieValue(store: CookieReader, name: string) {
  return store.get(name)?.value ?? null;
}

export async function resolveSessionFromCookies(store: CookieReader): Promise<ResolvedSession> {
  const accessToken = getCookieValue(store, ACCESS_TOKEN_COOKIE);
  const refreshToken = getCookieValue(store, REFRESH_TOKEN_COOKIE);

  if (!accessToken && !refreshToken) {
    return { session: null, user: null, accessToken: null, cookiesChanged: false };
  }

  const supabase = createAuthClient();

  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data.user) {
      return {
        session: null,
        user: data.user,
        accessToken,
        cookiesChanged: false,
      };
    }
  }

  if (!refreshToken) {
    return { session: null, user: null, accessToken: null, cookiesChanged: !!accessToken };
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session || !data.user) {
    return { session: null, user: null, accessToken: null, cookiesChanged: true };
  }

  return {
    session: data.session,
    user: data.user,
    accessToken: data.session.access_token,
    cookiesChanged: true,
  };
}

function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function applySessionCookies(response: NextResponse, resolved: ResolvedSession) {
  if (resolved.session) {
    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      resolved.session.access_token,
      getCookieOptions(resolved.session.expires_in ?? 3600),
    );
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      resolved.session.refresh_token,
      getCookieOptions(60 * 60 * 24 * 30),
    );
    return;
  }

  if (resolved.cookiesChanged) {
    clearSessionCookies(response);
  }
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", getCookieOptions(0));
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", getCookieOptions(0));
}

export const authenticateRequest = cache(async (request: NextRequest) => {
  const resolved = await resolveSessionFromCookies(request.cookies);

  if (!resolved.user) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    applySessionCookies(response, resolved);
    return { user: null, response } as const;
  }

  return { user: resolved.user, resolved } as const;
});
