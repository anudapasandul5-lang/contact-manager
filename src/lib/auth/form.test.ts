import assert from "node:assert/strict";
import test from "node:test";
import { getAuthModeConfig, parseAuthCredentials } from "@/lib/auth/form";

test("parseAuthCredentials trims email and keeps password", () => {
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

test("parseAuthCredentials rejects missing fields", () => {
  assert.throws(
    () =>
      parseAuthCredentials({
        email: "   ",
        password: "",
      }),
    /Email and password are required\./,
  );
});

test("getAuthModeConfig returns create-account labels", () => {
  assert.deepEqual(getAuthModeConfig("sign-up"), {
    endpoint: "/api/auth/sign-up",
    idleLabel: "Create Account",
    pendingLabel: "Creating Account...",
    successLabel: "Account created. You can finish sign-in from your inbox if email confirmation is enabled.",
  });
});
