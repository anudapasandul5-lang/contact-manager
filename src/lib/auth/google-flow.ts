import type { Session, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { applySessionCookies, createResolvedSession } from "@/lib/auth/session";
import { buildGoogleCallbackUrl, buildLoginErrorRedirectUrl } from "@/lib/auth/oauth";

const PKCE_COOKIE_MAX_AGE_SECONDS = 60 * 10;
export const GOOGLE_PKCE_STORAGE_KEY = "cm-google-pkce";
export const GOOGLE_PKCE_VERIFIER_COOKIE = `${GOOGLE_PKCE_STORAGE_KEY}-code-verifier`;

export interface CookieStorageMutation {
  name: string;
  value: string;
  maxAge: number;
}

type CookieValueReader = (name: string) => string | null;

type CookieBackedServerStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  isServer: true;
};

type OAuthStartClient = {
  signInWithOAuth(input: {
    provider: "google";
    options: {
      redirectTo: string;
      queryParams?: Record<string, string>;
    };
  }): Promise<{
    data: { url: string | null };
    error: Error | null;
  }>;
};

type OAuthCallbackClient = {
  exchangeCodeForSession(code: string): Promise<{
    data: {
      session: Session | null;
      user: User | null;
    };
    error: Error | null;
  }>;
};

type GooglePkceAuthOptions = ReturnType<typeof createGooglePkceAuthOptions>;

type OAuthClientFactory<TClient> = (authOptions: GooglePkceAuthOptions) => TClient;

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getGoogleStorageCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function createCookieBackedServerStorage(
  readCookieValue: CookieValueReader,
  mutations: CookieStorageMutation[] = [],
): CookieBackedServerStorage {
  const stagedValues = new Map<string, string | null>();

  return {
    isServer: true,
    async getItem(key) {
      if (stagedValues.has(key)) {
        return stagedValues.get(key) ?? null;
      }

      const value = readCookieValue(key);
      return value === null ? null : decodeCookieValue(value);
    },
    async setItem(key, value) {
      if (stagedValues.get(key) === value) {
        return;
      }
      stagedValues.set(key, value);
      mutations.push({ name: key, value, maxAge: PKCE_COOKIE_MAX_AGE_SECONDS });
    },
    async removeItem(key) {
      if (stagedValues.has(key) && stagedValues.get(key) === null) {
        return;
      }
      stagedValues.set(key, null);
      mutations.push({ name: key, value: "", maxAge: 0 });
    },
  };
}

export function createGooglePkceAuthOptions(storage: CookieBackedServerStorage) {
  return {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    flowType: "pkce" as const,
    storageKey: GOOGLE_PKCE_STORAGE_KEY,
    storage,
  };
}

export function applyGoogleStorageMutations(
  response: NextResponse,
  mutations: CookieStorageMutation[],
) {
  for (const mutation of mutations) {
    if (mutation.name !== GOOGLE_PKCE_VERIFIER_COOKIE) {
      continue;
    }

    response.cookies.set(
      mutation.name,
      mutation.value,
      getGoogleStorageCookieOptions(mutation.maxAge),
    );
  }
}

export async function createGoogleOAuthStartRouteResponse(
  requestUrl: string,
  readCookieValue: CookieValueReader,
  createAuthClient: OAuthClientFactory<OAuthStartClient>,
) {
  const storageMutations: CookieStorageMutation[] = [];
  const storage = createCookieBackedServerStorage(readCookieValue, storageMutations);
  const authOptions = createGooglePkceAuthOptions(storage);
  const authClient = createAuthClient(authOptions);
  const response = await createGoogleOAuthStartResponse(requestUrl, authClient);
  applyGoogleStorageMutations(response, storageMutations);
  return response;
}

export async function createGoogleOAuthCallbackRouteResponse(
  requestUrl: string,
  readCookieValue: CookieValueReader,
  createAuthClient: OAuthClientFactory<OAuthCallbackClient>,
) {
  const storageMutations: CookieStorageMutation[] = [];
  const storage = createCookieBackedServerStorage(readCookieValue, storageMutations);
  const authOptions = createGooglePkceAuthOptions(storage);
  const request = new URL(requestUrl);
  const code = request.searchParams.get("code");

  if (!code) {
    await storage.removeItem(GOOGLE_PKCE_VERIFIER_COOKIE);
    const response = await createGoogleOAuthCallbackResponse(requestUrl, {
      exchangeCodeForSession: async () => ({
        data: { session: null, user: null },
        error: new Error("OAuth code missing"),
      }),
    });
    applyGoogleStorageMutations(response, storageMutations);
    return response;
  }

  const authClient = createAuthClient(authOptions);
  const response = await createGoogleOAuthCallbackResponse(requestUrl, authClient);

  if (new URL(response.headers.get("location") ?? requestUrl).pathname === "/login") {
    await storage.removeItem(GOOGLE_PKCE_VERIFIER_COOKIE);
  }

  applyGoogleStorageMutations(response, storageMutations);
  return response;
}

export async function createGoogleOAuthStartResponse(
  requestUrl: string,
  authClient: OAuthStartClient,
) {
  const callbackUrl = buildGoogleCallbackUrl(requestUrl);
  let data: { url: string | null };
  let error: Error | null;

  try {
    ({ data, error } = await authClient.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl, queryParams: { prompt: "select_account" } },
    }));
  } catch {
    return NextResponse.redirect(buildLoginErrorRedirectUrl(requestUrl, "google_start_failed"));
  }

  if (error || !data.url) {
    return NextResponse.redirect(buildLoginErrorRedirectUrl(requestUrl, "google_start_failed"));
  }

  return NextResponse.redirect(data.url);
}

export async function createGoogleOAuthCallbackResponse(
  requestUrl: string,
  authClient: OAuthCallbackClient,
) {
  const request = new URL(requestUrl);
  const code = request.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(buildLoginErrorRedirectUrl(requestUrl, "google_callback_failed"));
  }

  let data: { session: Session | null; user: User | null };
  let error: Error | null;

  try {
    ({ data, error } = await authClient.exchangeCodeForSession(code));
  } catch {
    return NextResponse.redirect(buildLoginErrorRedirectUrl(requestUrl, "google_callback_failed"));
  }

  if (error) {
    return NextResponse.redirect(buildLoginErrorRedirectUrl(requestUrl, "google_callback_failed"));
  }

  if (!data.session || !data.user) {
    return NextResponse.redirect(buildLoginErrorRedirectUrl(requestUrl, "google_session_missing"));
  }

  const response = NextResponse.redirect(new URL("/mind-map", requestUrl));
  applySessionCookies(response, createResolvedSession(data.session, data.user));
  return response;
}
