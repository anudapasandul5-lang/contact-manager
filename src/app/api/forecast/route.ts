import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { listTasks } from "@/lib/repositories/tasks";
import { bucketize } from "@/lib/forecast/buckets";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const tz = searchParams.get("tz") ?? "UTC";

    const db = getDb();

    const [tasks, businesses] = await Promise.all([
      listTasks(db, auth.user.id, { completed: false }),
      db
        .select({ id: schema.businesses.id, name: schema.businesses.name, color: schema.businesses.color })
        .from(schema.businesses)
        .where(eq(schema.businesses.user_id, auth.user.id)),
    ]);

    let buckets;
    try {
      buckets = bucketize(tasks, new Date(), tz);
    } catch {
      // Invalid tz — fall back to UTC
      buckets = bucketize(tasks, new Date(), "UTC");
    }

    const response = NextResponse.json({ buckets, businesses });
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    console.error("[api/forecast GET]", error);
    const message = error instanceof Error ? error.message : "Failed to fetch forecast";
    const response = NextResponse.json({ error: message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
