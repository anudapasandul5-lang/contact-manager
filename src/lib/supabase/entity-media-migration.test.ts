import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(process.cwd(), "drizzle", "migrations", "20260410_entity_media.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf8");

test("entity media migration adds nullable media path columns", () => {
  assert.match(
    migrationSql,
    /ALTER TABLE contacts[\s\S]*ADD COLUMN IF NOT EXISTS photo_path text/i,
  );
  assert.match(
    migrationSql,
    /ALTER TABLE companies[\s\S]*ADD COLUMN IF NOT EXISTS logo_path text/i,
  );
  assert.match(
    migrationSql,
    /ALTER TABLE projects[\s\S]*ADD COLUMN IF NOT EXISTS logo_path text/i,
  );
});

test("entity media migration creates a private storage bucket for uploaded images", () => {
  assert.match(migrationSql, /INSERT INTO storage\.buckets/i);
  assert.match(migrationSql, /'network-media'/i);
  assert.match(migrationSql, /public[\s\S]*false/i);
  assert.match(migrationSql, /5242880/i);
});

test("entity media migration creates storage policies scoped to the authenticated user folder", () => {
  for (const action of ["select", "insert", "update", "delete"] as const) {
    assert.match(
      migrationSql,
      new RegExp(`CREATE POLICY media_owner_${action}[\\s\\S]*?ON storage\\.objects`, "i"),
    );
  }

  assert.match(
    migrationSql,
    /storage\.foldername\(name\)\)\[1\][\s\S]*auth\.uid\(\)::text/i,
  );
});
