// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAuthModeConfig, parseAuthCredentials } from "@/lib/auth/form";

it("parseAuthCredentials trims email and keeps password", () => {
  assert.deepEqual(
    parseAuthCredentials({
      email: "  person@example.com  ",
      password: "secret-password",
    }),
    {
      email: "person@example.com",
      password: "secret-password",
    },
  );
});

it("parseAuthCredentials rejects missing fields", () => {
  assert.throws(
    () =>
      parseAuthCredentials({
        email: "   ",
        password: "",
      }),
    /Email and password are required\./,
  );
});

it("getAuthModeConfig returns create-account labels", () => {
  assert.deepEqual(getAuthModeConfig("sign-up"), {
    endpoint: "/api/auth/sign-up",
    idleLabel: "Create Account",
    pendingLabel: "Creating Account...",
    successLabel: "Account created. You can finish sign-in from your inbox if email confirmation is enabled.",
  });
});
