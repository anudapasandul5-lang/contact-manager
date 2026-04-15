import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(process.cwd(), "drizzle", "migrations", "20260331_vendor_domain.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf8");

const vendorTables = ["vendors", "vendor_people", "vendor_companies", "vendor_projects"] as const;

test("vendor domain migration enables RLS on every vendor table", () => {
  for (const table of vendorTables) {
    assert.match(
      migrationSql,
      new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`, "i"),
      `Expected RLS enablement for ${table}`,
    );
  }
});

test("vendor domain migration creates authenticated CRUD policies for every vendor table", () => {
  for (const table of vendorTables) {
    assert.match(
      migrationSql,
      new RegExp(`CREATE POLICY ${table}_authenticated_select[\\s\\S]*?ON ${table}[\\s\\S]*?FOR SELECT`, "i"),
      `Expected SELECT policy for ${table}`,
    );
    assert.match(
      migrationSql,
      new RegExp(`CREATE POLICY ${table}_authenticated_insert[\\s\\S]*?ON ${table}[\\s\\S]*?FOR INSERT`, "i"),
      `Expected INSERT policy for ${table}`,
    );
    assert.match(
      migrationSql,
      new RegExp(`CREATE POLICY ${table}_authenticated_update[\\s\\S]*?ON ${table}[\\s\\S]*?FOR UPDATE`, "i"),
      `Expected UPDATE policy for ${table}`,
    );
    assert.match(
      migrationSql,
      new RegExp(`CREATE POLICY ${table}_authenticated_delete[\\s\\S]*?ON ${table}[\\s\\S]*?FOR DELETE`, "i"),
      `Expected DELETE policy for ${table}`,
    );
  }
});
