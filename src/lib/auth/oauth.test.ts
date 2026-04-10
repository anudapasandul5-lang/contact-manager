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
  assert.equal(getOAuthErrorMessage("unrecognized"), null);
});
