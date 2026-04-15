export type OAuthLoginError = "google_start_failed" | "google_callback_failed" | "google_session_missing";

const OAUTH_ERROR_MESSAGES: Record<OAuthLoginError, string> = {
  google_start_failed: "Unable to start Google sign-in. Please try again.",
  google_callback_failed: "Google sign-in was not completed. Please try again.",
  google_session_missing: "We could not create a secure session. Please sign in again.",
};

export function buildGoogleCallbackUrl(requestUrl: string): string {
  return new URL("/api/auth/google/callback", requestUrl).toString();
}

export function buildLoginErrorRedirectUrl(requestUrl: string, error: OAuthLoginError): URL {
  const url = new URL("/login", requestUrl);
  url.searchParams.set("error", error);
  return url;
}

export function getOAuthErrorMessage(error: string | null): string | null {
  if (!error) {
    return null;
  }

  const message = OAUTH_ERROR_MESSAGES[error as keyof typeof OAUTH_ERROR_MESSAGES];

  return typeof message === "string" ? message : null;
}
