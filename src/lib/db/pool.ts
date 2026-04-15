import { Pool } from "pg";

let pool: InstanceType<typeof Pool> | null = null;

function normalizeSupabaseConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const isSupabasePooler = url.hostname.endsWith(".pooler.supabase.com");
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0]
      : null;

    if (isSupabasePooler && projectRef && url.username === "postgres") {
      url.username = `postgres.${projectRef}`;
      return url.toString();
    }
  } catch {
    return connectionString;
  }

  return connectionString;
}

export function getDbPool() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Missing DATABASE_URL.");
  }

  pool = new Pool({
    connectionString: normalizeSupabaseConnectionString(connectionString),
    ssl: { rejectUnauthorized: false },
  });

  return pool;
}
