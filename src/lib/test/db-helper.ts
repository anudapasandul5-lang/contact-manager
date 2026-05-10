import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "../db/schema";

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
  });
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder: "drizzle/migrations" });

  return { db, client };
}

export async function teardownTestDb(client: ReturnType<typeof postgres>) {
  await client.end();
}
