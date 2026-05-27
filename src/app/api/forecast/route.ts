import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { bucketize } from "@/lib/forecast/buckets";
import type { Task } from "@/lib/repositories/tasks";

export const runtime = "nodejs";

function toDate(v: string | null): Date | null {
  return v ? new Date(v) : null;
}

function normalizeTask(row: Record<string, unknown>): Task {
  return {
    ...(row as Task),
    defer_date: toDate(row.defer_date as string | null),
    due_date: toDate(row.due_date as string | null),
    completed_at: toDate(row.completed_at as string | null),
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  };
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const tz = searchParams.get("tz") ?? "UTC";

    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);

    const [tasksResult, businessesResult] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", auth.user.id)
        .is("completed_at", null),
      supabase
        .from("businesses")
        .select("id, name, color")
        .eq("user_id", auth.user.id),
    ]);

    if (tasksResult.error) throw new Error(tasksResult.error.message);
    if (businessesResult.error) throw new Error(businessesResult.error.message);

    const tasks = (tasksResult.data ?? []).map(normalizeTask);
    const businesses = businessesResult.data ?? [];

    let buckets;
    try {
      buckets = bucketize(tasks, new Date(), tz);
    } catch {
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
