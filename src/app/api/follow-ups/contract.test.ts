// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const projectRoot = process.cwd();
const schemaPath = path.join(projectRoot, "src", "lib", "db", "schema.ts");
const migrationPath = path.join(projectRoot, "drizzle", "migrations", "20260417_follow_ups.sql");

const schemaSource = fs.readFileSync(schemaPath, "utf8");
const migrationSource = fs.readFileSync(migrationPath, "utf8");

it("follow-up schema defines the expected owner-scoped table fields", () => {
  assert.match(schemaSource, /export const followUps = pgTable\("follow_ups"/);
  assert.match(schemaSource, /user_id:\s+text\("user_id"\)\.notNull\(\)/);
  assert.match(schemaSource, /contact_id:\s+text\("contact_id"\)\s*\.notNull\(\)/);
  assert.match(schemaSource, /company_id:\s+text\("company_id"\)/);
  assert.match(schemaSource, /project_id:\s+text\("project_id"\)/);
  assert.match(schemaSource, /objective:\s+text\("objective"\)\.notNull\(\)/);
  assert.match(schemaSource, /scheduled_for:\s+timestamp\("scheduled_for"/);
  assert.match(schemaSource, /completed_at:\s+timestamp\("completed_at"/);
  assert.match(schemaSource, /completion_note:\s+text\("completion_note"\)/);
});

it("follow-up migration enforces one open follow-up per user and contact", () => {
  assert.match(
    migrationSource,
    /create unique index if not exists follow_ups_one_open_per_contact_idx[\s\S]*on follow_ups\s*\(user_id,\s*contact_id\)[\s\S]*where completed_at is null/i,
  );
});

it("follow-up migration provides transactional completion with optional next scheduling", () => {
  assert.match(migrationSource, /create or replace function complete_follow_up_with_optional_next/i);
  assert.match(migrationSource, /update follow_ups[\s\S]*set completed_at = now\(\)/i);
  assert.match(migrationSource, /insert into follow_ups/i);
});
