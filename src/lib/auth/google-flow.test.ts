// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Session, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";
import {
  applyGoogleStorageMutations,
  createCookieBackedServerStorage,
  createGoogleOAuthCallbackRouteResponse,
  createGoogleOAuthCallbackResponse,
  createGoogleOAuthStartRouteResponse,
  createGooglePkceAuthOptions,
  createGoogleOAuthStartResponse,
  GOOGLE_PKCE_STORAGE_KEY,
  GOOGLE_PKCE_VERIFIER_COOKIE,
} from "@/lib/auth/google-flow";

function createMockSession(): Session {
  return {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    expires_at: 3600,
    token_type: "bearer",
    user: createMockUser(),
  } as Session;
}

function createMockUser(): User {
  return {
    id: "user-123",
    email: "person@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-04-10T00:00:00.000Z",
  } as User;
}

it("createGoogleOAuthStartResponse redirects to the Supabase provider URL", async () => {
  const response = await createGoogleOAuthStartResponse("http://localhost:3000/login", {
    signInWithOAuth: async ({ options }) => {
      assert.equal(options?.redirectTo, "http://localhost:3000/api/auth/google/callback");
      return {
        data: { url: "https://accounts.google.com/o/oauth2/v2/auth?mock=1" },
        error: null,
      };
    },
  });

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://accounts.google.com/o/oauth2/v2/auth?mock=1");
});

it("createGoogleOAuthCallbackResponse stores session cookies and redirects to mind-map", async () => {
  const response = await createGoogleOAuthCallbackResponse(
    "http://localhost:3000/api/auth/google/callback?code=test-code",
    {
      exchangeCodeForSession: async (code) => {
        assert.equal(code, "test-code");
        return {
          data: {
            session: createMockSession(),
            user: createMockUser(),
          },
          error: null,
        };
      },
    },
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/mind-map");
  assert.equal(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value, "access-token");
  assert.equal(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value, "refresh-token");
});

it("createGoogleOAuthCallbackResponse clears cookies and redirects to login when code is missing", async () => {
  const response = await createGoogleOAuthCallbackResponse(
    "http://localhost:3000/api/auth/google/callback",
    {
      exchangeCodeForSession: async () => {
        throw new Error("should not be called");
      },
    },
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?error=google_callback_failed");
  assert.equal(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value, undefined);
  assert.equal(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value, undefined);
});

it("createGoogleOAuthCallbackResponse redirects to login when exchange fails without clearing app session cookies", async () => {
  const response = await createGoogleOAuthCallbackResponse(
    "http://localhost:3000/api/auth/google/callback?code=bad-code",
    {
      exchangeCodeForSession: async () => ({
        data: { session: createMockSession(), user: createMockUser() },
        error: new Error("bad code"),
      }),
    },
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?error=google_callback_failed");
  assert.equal(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value, undefined);
  assert.equal(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value, undefined);
});

it("createGoogleOAuthCallbackResponse redirects to login when session data is missing without clearing app session cookies", async () => {
  const response = await createGoogleOAuthCallbackResponse(
    "http://localhost:3000/api/auth/google/callback?code=missing-session",
    {
      exchangeCodeForSession: async () => ({
        data: { session: null, user: null },
        error: null,
      }),
    },
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?error=google_session_missing");
  assert.equal(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value, undefined);
  assert.equal(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value, undefined);
});

it("createGoogleOAuthStartResponse redirects to login when signInWithOAuth rejects", async () => {
  const response = await createGoogleOAuthStartResponse("http://localhost:3000/login", {
    signInWithOAuth: async () => {
      throw new Error("network failure");
    },
  });

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?error=google_start_failed");
});

it("createGoogleOAuthCallbackResponse redirects to login when exchangeCodeForSession rejects", async () => {
  const response = await createGoogleOAuthCallbackResponse(
    "http://localhost:3000/api/auth/google/callback?code=rejected",
    {
      exchangeCodeForSession: async () => {
        throw new Error("network failure");
      },
    },
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?error=google_callback_failed");
  assert.equal(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value, undefined);
  assert.equal(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value, undefined);
});

it("createGooglePkceAuthOptions configures the auth client for server-side PKCE", () => {
  const storage = createCookieBackedServerStorage(() => null);
  const options = createGooglePkceAuthOptions(storage);

  assert.equal(options.flowType, "pkce");
  assert.equal(options.storageKey, GOOGLE_PKCE_STORAGE_KEY);
  assert.equal(options.persistSession, true);
  assert.equal(options.autoRefreshToken, false);
  assert.equal(options.detectSessionInUrl, false);
  assert.equal(options.storage, storage);
});

it("createCookieBackedServerStorage reads staged values and records cookie mutations", async () => {
  const cookies = new Map<string, string>([["existing", "value"]]);
  const mutations: { name: string; value: string; maxAge: number }[] = [];
  const storage = createCookieBackedServerStorage(
    (name) => cookies.get(name) ?? null,
    mutations,
  );

  assert.equal(storage.isServer, true);
  assert.equal(await storage.getItem("existing"), "value");

  await storage.setItem("pkce-key", "verifier");
  assert.equal(await storage.getItem("pkce-key"), "verifier");

  await storage.removeItem("pkce-key");
  assert.equal(await storage.getItem("pkce-key"), null);

  assert.deepEqual(mutations, [
    { name: "pkce-key", value: "verifier", maxAge: 60 * 10 },
    { name: "pkce-key", value: "", maxAge: 0 },
  ]);
});

it("createCookieBackedServerStorage decodes browser-encoded PKCE cookie values", async () => {
  const storage = createCookieBackedServerStorage(
    (name) => (name === GOOGLE_PKCE_VERIFIER_COOKIE ? "%22verifier-token%22" : null),
  );

  assert.equal(await storage.getItem(GOOGLE_PKCE_VERIFIER_COOKIE), "\"verifier-token\"");
});

it("applyGoogleStorageMutations only persists verifier cookie mutations", () => {
  const nextResponse = NextResponse.redirect("http://localhost:3000/login");

  applyGoogleStorageMutations(nextResponse, [
    { name: GOOGLE_PKCE_STORAGE_KEY, value: "serialized-session", maxAge: 60 * 60 },
    { name: GOOGLE_PKCE_VERIFIER_COOKIE, value: "verifier-token", maxAge: 60 * 10 },
  ]);

  assert.equal(nextResponse.cookies.get(GOOGLE_PKCE_STORAGE_KEY)?.value, undefined);
  assert.equal(nextResponse.cookies.get(GOOGLE_PKCE_VERIFIER_COOKIE)?.value, "verifier-token");
});

it("createGoogleOAuthStartRouteResponse builds PKCE auth options and applies verifier cookie mutations", async () => {
  let capturedOptions:
    | ReturnType<typeof createGooglePkceAuthOptions>
    | undefined;

  const response = await createGoogleOAuthStartRouteResponse(
    "http://localhost:3000/login",
    () => null,
    (authOptions) => {
      capturedOptions = authOptions;

      return {
        signInWithOAuth: async ({ options }) => {
          assert.equal(options.redirectTo, "http://localhost:3000/api/auth/google/callback");
          await authOptions.storage.setItem(GOOGLE_PKCE_VERIFIER_COOKIE, "verifier-token");
          return {
            data: { url: "https://accounts.google.com/o/oauth2/v2/auth?mock=1" },
            error: null,
          };
        },
      };
    },
  );

  assert.equal(capturedOptions?.flowType, "pkce");
  assert.equal(capturedOptions?.storageKey, GOOGLE_PKCE_STORAGE_KEY);
  assert.equal(response.headers.get("location"), "https://accounts.google.com/o/oauth2/v2/auth?mock=1");
  assert.equal(response.cookies.get(GOOGLE_PKCE_VERIFIER_COOKIE)?.value, "verifier-token");
});

it("createGoogleOAuthCallbackRouteResponse skips auth client creation when code is missing and clears the verifier cookie", async () => {
  let createClientCalls = 0;

  const response = await createGoogleOAuthCallbackRouteResponse(
    "http://localhost:3000/api/auth/google/callback",
    (name) => (name === GOOGLE_PKCE_VERIFIER_COOKIE ? "stored-verifier" : null),
    () => {
      createClientCalls += 1;
      throw new Error("should not create auth client");
    },
  );

  assert.equal(createClientCalls, 0);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?error=google_callback_failed");
  assert.equal(response.cookies.get(GOOGLE_PKCE_VERIFIER_COOKIE)?.value, "");
  assert.equal(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value, undefined);
  assert.equal(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value, undefined);
});

it("createGoogleOAuthCallbackRouteResponse builds PKCE auth options for callback requests", async () => {
  let capturedOptions:
    | ReturnType<typeof createGooglePkceAuthOptions>
    | undefined;

  const response = await createGoogleOAuthCallbackRouteResponse(
    "http://localhost:3000/api/auth/google/callback?code=test-code",
    () => null,
    (authOptions) => {
      capturedOptions = authOptions;
      return {
        exchangeCodeForSession: async (code) => {
          assert.equal(code, "test-code");
          return {
            data: {
              session: createMockSession(),
              user: createMockUser(),
            },
            error: null,
          };
        },
      };
    },
  );

  assert.equal(capturedOptions?.flowType, "pkce");
  assert.equal(capturedOptions?.storageKey, GOOGLE_PKCE_STORAGE_KEY);
  assert.equal(response.headers.get("location"), "http://localhost:3000/mind-map");
});

it("createGoogleOAuthCallbackRouteResponse clears only the verifier cookie when auth client rejects", async () => {
  const response = await createGoogleOAuthCallbackRouteResponse(
    "http://localhost:3000/api/auth/google/callback?code=rejected",
    (name) => (name === GOOGLE_PKCE_VERIFIER_COOKIE ? "stored-verifier" : null),
    () => ({
      exchangeCodeForSession: async () => {
        throw new Error("network failure");
      },
    }),
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?error=google_callback_failed");
  assert.equal(response.cookies.get(GOOGLE_PKCE_VERIFIER_COOKIE)?.value, "");
  assert.equal(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value, undefined);
  assert.equal(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value, undefined);
});
