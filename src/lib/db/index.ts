import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

export function getDb() {
  if (globalThis.__db) return globalThis.__db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is not set");
  const client = postgres(url, {
    ssl: url.includes("localhost") ? false : "require",
    prepare: false,
  });
  globalThis.__db = drizzle(client, { schema });
  return globalThis.__db;
}
