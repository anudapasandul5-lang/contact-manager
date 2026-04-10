# Google OAuth Design

Date: 2026-04-10
Project: Contact Manager
Status: Draft for review

## Goal

Add Google sign-in as an additional authentication option alongside the existing email/password flow. First-time Google users should be able to create an account automatically through Supabase Auth. The implementation must preserve the app's current server-side session handling and keep user-owned data isolated by the existing Row Level Security model.

## Current State

- The login experience is rendered by [LoginForm](C:/Users/anuda/Downloads/Mindmap%20website/Mindmap%20website/contact-manager/src/components/auth/LoginForm.tsx).
- Email/password sign-in and sign-up are handled by the existing API routes under `src/app/api/auth/sign-in` and `src/app/api/auth/sign-up`.
- Protected pages rely on HTTP-only cookies managed by [session.ts](C:/Users/anuda/Downloads/Mindmap%20website/Mindmap%20website/contact-manager/src/lib/auth/session.ts).
- App data is scoped by `user_id`, and the owner-based Supabase policies in `20260401_user_owned_network.sql` enforce `auth.uid() = user_id` for reads and writes.

## Chosen Approach

Implement Google OAuth using a server-side redirect and callback flow:

1. The login page will expose a `Continue with Google` button in addition to the current email/password form.
2. Clicking that button will navigate to a new server route that starts Supabase Google OAuth.
3. Supabase and Google will redirect back to a new callback route in the app.
4. The callback route will exchange the OAuth code for a Supabase session.
5. The app will set the same HTTP-only access and refresh token cookies used by the current auth system.
6. The user will be redirected to `/mind-map`.

This approach keeps all protected app behavior on the existing server-managed session path and avoids introducing a parallel client-only auth state.

## Why This Approach

### Recommended Option

Use server-side Google OAuth routes that plug into the current cookie-based session model.

### Rejected Alternatives

- Client-side `signInWithOAuth` only:
  Faster to wire up, but it would split auth responsibilities between browser state and the existing server-side cookie/session guards.
- Full migration to Supabase SSR helper packages:
  Useful long-term, but larger than needed for adding one provider.

## User Experience

### Login Page

- Keep the current `Sign In` and `Create Account` email/password tabs unchanged.
- Add a Google sign-in button above the email form submit area.
- Label it clearly as an alternate sign-in method.
- Do not remove email/password.

### Sign-In Behavior

- If the user already has a Google-backed Supabase account, they are signed in and redirected to `/mind-map`.
- If the user has never used Google before, Supabase creates the auth account automatically and the user is signed in.
- If the user cancels Google sign-in or an exchange fails, they are redirected back to `/login` with a short friendly error.

## Technical Design

### New Routes

#### `GET /api/auth/google/start`

Responsibilities:

- Create a Supabase client using the existing environment helpers.
- Call `supabase.auth.signInWithOAuth({ provider: "google" })`.
- Provide a `redirectTo` value pointing to the app callback route.
- Redirect the browser to the returned Google/Supabase authorization URL.
- If URL generation fails, redirect back to `/login` with an error indicator.

#### `GET /api/auth/google/callback`

Responsibilities:

- Accept the OAuth callback query parameters.
- Exchange the returned code for a session via Supabase.
- If a valid session is returned:
  - Apply the existing HTTP-only cookies using the shared cookie helpers.
  - Redirect to `/mind-map`.
- If the exchange fails or no session is returned:
  - Clear stale cookies.
  - Redirect to `/login` with an error indicator.

### Shared Auth Helpers

The existing session helpers should remain the single source of truth for cookie names and cookie options. If needed, a small helper can be added for OAuth callback handling, but the cookie-setting logic should continue to flow through the existing `applySessionCookies` and `clearSessionCookies` functions.

### Login UI Changes

`LoginForm` will gain:

- a Google button
- a click handler that navigates to `/api/auth/google/start`
- error rendering for OAuth callback failures returned to `/login`

The existing email/password behavior should remain untouched.

## Security Model

### Authentication Security

- Access and refresh tokens remain stored in HTTP-only cookies.
- Protected routes continue to authenticate requests by resolving the session from cookies on the server.
- The browser should never become the sole source of truth for protected app access.

### Data Isolation

Automatic Google account creation is safe in this app because data authorization is separated from identity creation:

- Supabase creates a unique auth user for the Google account.
- New and updated rows continue to be written with `user_id = auth.user.id`.
- Existing RLS policies already restrict access to rows owned by the authenticated user.

This means a new Google user can create their own account automatically, but they still cannot read or mutate another user's data.

### Callback Safety

- The callback route should accept only the provider response needed for the Supabase exchange.
- Failed callback exchanges must clear stale cookies before redirecting.
- Redirect targets should stay internal to the app for this first version.

## Supabase And Google Configuration

### Supabase

- Enable the Google auth provider.
- Set the Google client ID and client secret in the Supabase provider config.
- Keep email auth enabled.

### Google Cloud

Create a Google OAuth web application and register:

- Authorized redirect URI:
  `https://<your-project-ref>.supabase.co/auth/v1/callback`

For local development and production app redirects after Supabase returns control to the app, the app's `redirectTo` value must point at:

- Local dev:
  `http://localhost:3000/api/auth/google/callback`
- Production:
  `https://<your-app-domain>/api/auth/google/callback`

The implementation should derive the app callback origin from the incoming request so the same code works locally and in production without adding a second auth mode.

## Error Handling

### Start Route Errors

- If Supabase fails to generate the OAuth URL, redirect to `/login?error=google_start_failed`.

### Callback Errors

- If the callback is missing the required code, redirect to `/login?error=google_callback_failed`.
- If Supabase rejects the exchange, redirect to `/login?error=google_callback_failed`.
- If the exchange returns no session, clear cookies and redirect to `/login?error=google_session_missing`.

### UI Messages

Map the above query parameters to short user-facing messages, for example:

- `Unable to start Google sign-in. Please try again.`
- `Google sign-in was not completed. Please try again.`
- `We could not create a secure session. Please sign in again.`

## Testing Strategy

### Unit And Route Tests

Add tests for:

- start route returns a redirect when Supabase provides an OAuth URL
- start route falls back to `/login` on OAuth URL failure
- callback route sets cookies and redirects to `/mind-map` on successful session exchange
- callback route clears cookies and redirects to `/login` on exchange failure
- login form renders the Google button without regressing the email/password controls
- login form shows a readable message when OAuth callback errors are present

### Regression Coverage

Existing email/password sign-in and sign-up should keep working exactly as they do now.

## Non-Goals

- Removing email/password authentication
- Adding popup-based OAuth
- Supporting arbitrary post-login external redirects
- Refactoring the whole auth stack to a different Supabase integration style

## Implementation Notes

- Follow the current server-side auth architecture rather than introducing a new client session layer.
- Prefer small, focused route handlers and reuse existing cookie/session utilities.
- Keep the provider-specific logic isolated so more OAuth providers can be added later without rewriting login state handling.
