import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(process.cwd(), "drizzle", "migrations", "20260401_user_owned_network.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf8");

test("ownership migration adds user_id columns to user-owned tables", () => {
  for (const table of ["companies", "contacts", "projects", "person_relationships", "intro_requests", "vendors"] as const) {
    assert.match(
      migrationSql,
      new RegExp(`ALTER TABLE ${table}[\\s\\S]*ADD COLUMN IF NOT EXISTS user_id uuid`, "i"),
      `Expected ${table} to gain a user_id column`,
    );
  }
});

test("ownership migration backfills existing records to the earliest auth user", () => {
  assert.match(
    migrationSql,
    /select\s+id[\s\S]*from\s+auth\.users[\s\S]*order by\s+created_at\s+asc[\s\S]*limit\s+1/i,
    "Expected migration to resolve the earliest auth user for backfill",
  );
});

test("ownership migration creates ownership-based policies for base tables", () => {
  for (const table of ["companies", "contacts", "projects", "person_relationships", "intro_requests", "vendors"] as const) {
    assert.match(
      migrationSql,
      new RegExp(`CREATE POLICY ${table}_owner_select[\\s\\S]*?ON ${table}[\\s\\S]*?FOR SELECT[\\s\\S]*?auth\\.uid\\(\\) = user_id`, "i"),
      `Expected ownership SELECT policy for ${table}`,
    );
    assert.match(
      migrationSql,
      new RegExp(`CREATE POLICY ${table}_owner_insert[\\s\\S]*?ON ${table}[\\s\\S]*?FOR INSERT[\\s\\S]*?auth\\.uid\\(\\) = user_id`, "i"),
      `Expected ownership INSERT policy for ${table}`,
    );
  }
});
