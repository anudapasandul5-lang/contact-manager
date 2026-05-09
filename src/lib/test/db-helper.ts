import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";

// Test DB schema is operator-managed via Supabase MCP, NOT applied per-test.
// This project uses hand-written SQL migrations (see drizzle/migrations/) without
// a Drizzle journal file, so drizzle-orm/postgres-js/migrator can't be used here.
// When schema changes: apply the new migration to test project ref amfgmckgntsrovdrmojy
// via Supabase MCP, then bump this comment with the migration name.
export async function createTestDb() {
  if (!process.env.DATABASE_URL_TEST) {
    throw new Error(
      "DATABASE_URL_TEST is not set. Copy .env.test.example → .env.test.local. " +
      "Use a DEDICATED test database — NOT production."
    );
  }
  const connectionString = process.env.DATABASE_URL_TEST;
  const client = postgres(connectionString, {
    ssl: connectionString.includes("localhost") ? false : "require",
    // Transaction-mode pooler (Supabase port 6543) requires prepare: false.
    // Prepared statements are not supported across PgBouncer transaction boundaries.
    prepare: false,
  });
  const db = drizzle(client, { schema });

  return { db, client };
}

export async function teardownTestDb(client: ReturnType<typeof postgres>) {
  await client.end();
}
