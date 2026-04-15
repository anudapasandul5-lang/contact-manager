# Google OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google sign-in as an additional login path that automatically creates Supabase accounts, reuses the existing HTTP-only cookie session flow, and keeps user data protected by the current owner-based RLS model.

**Architecture:** Keep the current email/password routes intact and add a thin Google OAuth server flow around them. Route handlers stay minimal by delegating redirect construction, callback exchange, and login error mapping to focused auth helper modules that are easy to test with fake Supabase clients.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase JS 2.x, Node test runner via `tsx`, existing cookie/session helpers.

---

## File Map

- Create: `src/lib/auth/oauth.ts`
  Purpose: shared Google OAuth constants and helpers for callback URLs, login error redirects, and user-facing login messages.
- Create: `src/lib/auth/oauth.test.ts`
  Purpose: verify callback URL construction and login error message mapping without involving Next route handlers.
- Create: `src/lib/auth/google-flow.ts`
  Purpose: encapsulate start and callback route logic so it can be tested with fake Supabase clients while reusing the existing cookie helpers.
- Create: `src/lib/auth/google-flow.test.ts`
  Purpose: verify Google OAuth start redirects, successful callback cookie handling, and failure cleanup paths.
- Create: `src/app/api/auth/google/start/route.ts`
  Purpose: call the shared Google start flow with a real Supabase client.
- Create: `src/app/api/auth/google/callback/route.ts`
  Purpose: call the shared Google callback flow with a real Supabase client.
- Create: `src/components/auth/LoginFormView.tsx`
  Purpose: pure presentational login form view so Google button and error rendering can be tested without DOM tooling.
- Create: `src/components/auth/LoginFormView.test.tsx`
  Purpose: render the pure view to static markup and verify the Google button plus OAuth error copy appear correctly.
- Modify: `src/components/auth/LoginForm.tsx`
  Purpose: read login query params, wire the Google start redirect, and delegate markup to `LoginFormView`.
- Modify: `README.md`
  Purpose: document the exact Supabase and Google Cloud values required for local and production Google OAuth setup.

### Task 1: Shared OAuth Helpers

**Files:**
- Create: `src/lib/auth/oauth.ts`
- Test: `src/lib/auth/oauth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleCallbackUrl,
  buildLoginErrorRedirectUrl,
  getOAuthErrorMessage,
} from "@/lib/auth/oauth";

test("buildGoogleCallbackUrl appends the callback path to the request origin", () => {
  assert.equal(
    buildGoogleCallbackUrl("http://localhost:3000/login"),
    "http://localhost:3000/api/auth/google/callback",
  );
});

test("buildLoginErrorRedirectUrl sends users back to login with a stable error code", () => {
  assert.equal(
    buildLoginErrorRedirectUrl("https://app.example.com/mind-map", "google_start_failed").toString(),
    "https://app.example.com/login?error=google_start_failed",
  );
});

test("getOAuthErrorMessage maps supported query codes to readable copy", () => {
  assert.equal(
    getOAuthErrorMessage("google_session_missing"),
    "We could not create a secure session. Please sign in again.",
  );
  assert.equal(getOAuthErrorMessage(null), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/auth/oauth.test.ts`
Expected: FAIL with module or export errors because `src/lib/auth/oauth.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export type OAuthLoginError =
  | "google_start_failed"
  | "google_callback_failed"
  | "google_session_missing";

export function buildGoogleCallbackUrl(requestUrl: string) {
  return new URL("/api/auth/google/callback", requestUrl).toString();
}

export function buildLoginErrorRedirectUrl(requestUrl: string, error: OAuthLoginError) {
  const url = new URL("/login", requestUrl);
  url.searchParams.set("error", error);
  return url;
}

export function getOAuthErrorMessage(error: string | null) {
  switch (error) {
    case "google_start_failed":
      return "Unable to start Google sign-in. Please try again.";
    case "google_callback_failed":
      return "Google sign-in was not completed. Please try again.";
    case "google_session_missing":
      return "We could not create a secure session. Please sign in again.";
    default:
      return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/auth/oauth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/oauth.ts src/lib/auth/oauth.test.ts
git commit -m "test: add oauth helper coverage"
```

### Task 2: Google OAuth Server Flow

**Files:**
- Create: `src/lib/auth/google-flow.ts`
- Create: `src/lib/auth/google-flow.test.ts`
- Create: `src/app/api/auth/google/start/route.ts`
- Create: `src/app/api/auth/google/callback/route.ts`
- Modify: `src/lib/auth/session.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/session";
import {
  createGoogleOAuthStartResponse,
  createGoogleOAuthCallbackResponse,
} from "@/lib/auth/google-flow";

test("createGoogleOAuthStartResponse redirects to the Supabase provider URL", async () => {
  const response = await createGoogleOAuthStartResponse(
    "http://localhost:3000/login",
    {
      signInWithOAuth: async ({ options }) => {
        assert.equal(options?.redirectTo, "http://localhost:3000/api/auth/google/callback");
        return {
          data: { url: "https://accounts.google.com/o/oauth2/v2/auth?mock=1" },
          error: null,
        };
      },
    },
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://accounts.google.com/o/oauth2/v2/auth?mock=1");
});

test("createGoogleOAuthCallbackResponse stores session cookies and redirects to mind-map", async () => {
  const response = await createGoogleOAuthCallbackResponse(
    "http://localhost:3000/api/auth/google/callback?code=test-code",
    {
      exchangeCodeForSession: async (code) => {
        assert.equal(code, "test-code");
        return {
          data: {
            session: {
              access_token: "access-token",
              refresh_token: "refresh-token",
              expires_in: 3600,
            },
            user: {
              id: "user-123",
              email: "person@example.com",
            },
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

test("createGoogleOAuthCallbackResponse clears cookies and redirects to login when exchange fails", async () => {
  const response = await createGoogleOAuthCallbackResponse(
    "http://localhost:3000/api/auth/google/callback?code=bad-code",
    {
      exchangeCodeForSession: async () => ({
        data: { session: null, user: null },
        error: new Error("bad code"),
      }),
    },
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?error=google_callback_failed");
  assert.equal(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value, "");
  assert.equal(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value, "");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/lib/auth/google-flow.test.ts`
Expected: FAIL because the Google flow helpers and route files do not exist yet.

- [ ] **Step 3: Add a tiny session helper for Supabase OAuth results**

```ts
export function createResolvedSession(
  session: Session,
  user: User,
): ResolvedSession {
  return {
    session,
    user,
    accessToken: session.access_token,
    cookiesChanged: true,
  };
}
```

Place that helper in `src/lib/auth/session.ts` near the existing cookie helpers so OAuth callback handling can reuse the same cookie application path as email/password sign-in.

- [ ] **Step 4: Implement the shared Google OAuth flow**

```ts
import { NextResponse } from "next/server";
import {
  applySessionCookies,
  clearSessionCookies,
  createResolvedSession,
} from "@/lib/auth/session";
import {
  buildGoogleCallbackUrl,
  buildLoginErrorRedirectUrl,
} from "@/lib/auth/oauth";

export async function createGoogleOAuthStartResponse(
  requestUrl: string,
  authClient: {
    signInWithOAuth: (input: {
      provider: "google";
      options: { redirectTo: string };
    }) => Promise<{ data: { url: string | null }; error: Error | null }>;
  },
) {
  const callbackUrl = buildGoogleCallbackUrl(requestUrl);
  const { data, error } = await authClient.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  });

  if (error || !data.url) {
    return NextResponse.redirect(buildLoginErrorRedirectUrl(requestUrl, "google_start_failed"));
  }

  return NextResponse.redirect(data.url);
}

export async function createGoogleOAuthCallbackResponse(
  requestUrl: string,
  authClient: {
    exchangeCodeForSession: (code: string) => Promise<{
      data: { session: any; user: any };
      error: Error | null;
    }>;
  },
) {
  const url = new URL(requestUrl);
  const code = url.searchParams.get("code");

  if (!code) {
    const response = NextResponse.redirect(
      buildLoginErrorRedirectUrl(requestUrl, "google_callback_failed"),
    );
    clearSessionCookies(response);
    return response;
  }

  const { data, error } = await authClient.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    const response = NextResponse.redirect(
      buildLoginErrorRedirectUrl(requestUrl, "google_callback_failed"),
    );
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.redirect(new URL("/mind-map", requestUrl));
  applySessionCookies(response, createResolvedSession(data.session, data.user));
  return response;
}
```

- [ ] **Step 5: Implement the route wrappers**

```ts
// src/app/api/auth/google/start/route.ts
import { createClient } from "@supabase/supabase-js";
import { createGoogleOAuthStartResponse } from "@/lib/auth/google-flow";
import { getSupabaseEnv } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return createGoogleOAuthStartResponse(request.url, supabase.auth);
}
```

```ts
// src/app/api/auth/google/callback/route.ts
import { createClient } from "@supabase/supabase-js";
import { createGoogleOAuthCallbackResponse } from "@/lib/auth/google-flow";
import { getSupabaseEnv } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return createGoogleOAuthCallbackResponse(request.url, supabase.auth);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx tsx --test src/lib/auth/google-flow.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth/session.ts src/lib/auth/google-flow.ts src/lib/auth/google-flow.test.ts src/app/api/auth/google/start/route.ts src/app/api/auth/google/callback/route.ts
git commit -m "feat: add server-side google oauth flow"
```

### Task 3: Login UI Integration

**Files:**
- Create: `src/components/auth/LoginFormView.tsx`
- Create: `src/components/auth/LoginFormView.test.tsx`
- Modify: `src/components/auth/LoginForm.tsx`

- [ ] **Step 1: Write the failing view test**

```tsx
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LoginFormView } from "@/components/auth/LoginFormView";

test("LoginFormView renders the Google button and oauth error copy", () => {
  const html = renderToStaticMarkup(
    <LoginFormView
      mode="sign-in"
      email=""
      password=""
      error={null}
      success={null}
      oauthError="Google sign-in was not completed. Please try again."
      isPending={false}
      onEmailChange={() => {}}
      onPasswordChange={() => {}}
      onModeChange={() => {}}
      onSubmit={() => {}}
      onGoogleClick={() => {}}
    />,
  );

  assert.match(html, /Continue with Google/);
  assert.match(html, /Google sign-in was not completed/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/components/auth/LoginFormView.test.tsx`
Expected: FAIL because the presentational component does not exist yet.

- [ ] **Step 3: Create the pure view component**

```tsx
type LoginFormViewProps = {
  mode: AuthMode;
  email: string;
  password: string;
  error: string | null;
  success: string | null;
  oauthError: string | null;
  isPending: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleClick: () => void;
};

export function LoginFormView(props: LoginFormViewProps) {
  return (
    <section>
      <div className="mb-4">
        <Button type="button" variant="outline" className="w-full" onClick={props.onGoogleClick}>
          Continue with Google
        </Button>
      </div>

      {props.oauthError && (
        <p className="rounded-lg border px-3 py-2 text-sm text-red-600">
          {props.oauthError}
        </p>
      )}

      {/* keep the existing mode toggle, fields, email/password error, success, and submit button here */}
    </section>
  );
}
```

- [ ] **Step 4: Wire `LoginForm.tsx` to the new Google flow**

```tsx
import { useSearchParams } from "next/navigation";
import { getOAuthErrorMessage } from "@/lib/auth/oauth";
import { LoginFormView } from "@/components/auth/LoginFormView";

export function LoginForm() {
  const searchParams = useSearchParams();
  const oauthError = getOAuthErrorMessage(searchParams.get("error"));

  function handleGoogleSignIn() {
    window.location.assign("/api/auth/google/start");
  }

  return (
    <LoginFormView
      mode={mode}
      email={email}
      password={password}
      error={error}
      success={success}
      oauthError={oauthError}
      isPending={isPending}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onModeChange={(nextMode) => {
        setMode(nextMode);
        setError(null);
        setSuccess(null);
      }}
      onSubmit={handleSubmit}
      onGoogleClick={handleGoogleSignIn}
    />
  );
}
```

- [ ] **Step 5: Run focused tests to verify the UI passes**

Run: `npx tsx --test src/components/auth/LoginFormView.test.tsx`
Expected: PASS

- [ ] **Step 6: Run auth regression tests**

Run: `npx tsx --test src/lib/auth/form.test.ts src/lib/auth/oauth.test.ts src/lib/auth/google-flow.test.ts src/components/auth/LoginFormView.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/auth/LoginForm.tsx src/components/auth/LoginFormView.tsx src/components/auth/LoginFormView.test.tsx src/lib/auth/oauth.ts src/lib/auth/oauth.test.ts
git commit -m "feat: add google login option to login form"
```

### Task 4: Setup Documentation And Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add the Google setup note**

```md
## Google Sign-In Setup

This app supports Google login through Supabase Auth.

1. In Supabase Auth Providers, enable Google.
2. In Google Cloud, create a Web OAuth client.
3. Set the authorized redirect URI to:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. For local development, Supabase should redirect back into:
   `http://localhost:3000/api/auth/google/callback`
5. For production, set your site domain so the app callback becomes:
   `https://<your-app-domain>/api/auth/google/callback`
```

- [ ] **Step 2: Run lint on touched files**

Run: `npx eslint src/lib/auth/session.ts src/lib/auth/oauth.ts src/lib/auth/google-flow.ts src/app/api/auth/google/start/route.ts src/app/api/auth/google/callback/route.ts src/components/auth/LoginForm.tsx src/components/auth/LoginFormView.tsx`
Expected: no lint errors

- [ ] **Step 3: Run the full focused verification set**

Run: `npx tsx --test src/lib/auth/form.test.ts src/lib/auth/oauth.test.ts src/lib/auth/google-flow.test.ts src/components/auth/LoginFormView.test.tsx`
Expected: PASS

Run: `npm run build`
Expected: Next.js production build completes successfully

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add google oauth setup notes"
```

## Self-Review

- Spec coverage:
  - Google as an additional login option: Task 3
  - Server-side redirect and callback: Task 2
  - Automatic account creation via Supabase OAuth: Task 2
  - HTTP-only cookie reuse: Task 2
  - Secure user data isolation and no client-only auth source of truth: Task 2
  - Friendly login errors: Tasks 1 and 3
  - Setup guidance for Supabase and Google Cloud: Task 4
- Placeholder scan:
  - No `TBD`, `TODO`, or vague “handle errors” steps remain.
- Type consistency:
  - `OAuthLoginError`, `buildGoogleCallbackUrl`, `buildLoginErrorRedirectUrl`, `getOAuthErrorMessage`, `createGoogleOAuthStartResponse`, and `createGoogleOAuthCallbackResponse` are used consistently across the plan.
