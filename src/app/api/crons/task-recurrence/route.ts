import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nextInstance } from "@/lib/recurrence/engine";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, recurrence_rule, due_date")
    .not("recurrence_rule", "is", null)
    .is("completed_at", null)
    .lt("due_date", now.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  for (const task of tasks ?? []) {
    if (!task.recurrence_rule) continue;
    try {
      const next = nextInstance(task.recurrence_rule as string, now);
      if (next === null) continue;
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ due_date: next.toISOString(), updated_at: now.toISOString() })
        .eq("id", task.id);
      if (!updateError) updated++;
    } catch (err) {
      console.error("[cron-task-recurrence] skipping malformed rule", task.id, err);
    }
  }

  return NextResponse.json({ updated });
}
