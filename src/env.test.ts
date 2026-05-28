import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateEnv } from "@/lib/validate-env";

const FULL_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

it("validateEnv returns typed object when all required vars are present", () => {
  const result = validateEnv(FULL_ENV);
  assert.equal(result.NEXT_PUBLIC_SUPABASE_URL, "https://abc.supabase.co");
  assert.equal(result.NEXT_PUBLIC_SUPABASE_ANON_KEY, "anon-key");
});

it("validateEnv throws when all required vars are missing", () => {
  assert.throws(
    () => validateEnv({}),
    /Missing required environment variables/,
  );
});

it("validateEnv names all missing vars in the error message", () => {
  assert.throws(
    () => validateEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co" }),
    (err: Error) => {
      assert.ok(err.message.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), "should mention anon key");
      return true;
    },
  );
});

it("validateEnv does not throw when all vars are set", () => {
  assert.doesNotThrow(() => validateEnv(FULL_ENV));
});
