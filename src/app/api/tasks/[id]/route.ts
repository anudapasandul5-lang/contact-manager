import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.user) return auth.response;

  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);

    const hasCompleted = body.completed === true;
    const hasDueDate = "dueDate" in body;

    if (!hasCompleted && !hasDueDate) {
      const response = NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
      applySessionCookies(response, auth.resolved);
      return response;
    }

    let task = null;

    if (hasCompleted) {
      const { data: existing } = await supabase
        .from("tasks")
        .select("completed_at")
        .eq("id", id)
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (!existing) {
        const response = NextResponse.json({ error: "Task not found" }, { status: 404 });
        applySessionCookies(response, auth.resolved);
        return response;
      }

      if (existing.completed_at !== null) {
        // Already completed — idempotent, return full row
        const { data } = await supabase
          .from("tasks")
          .select("*")
          .eq("id", id)
          .eq("user_id", auth.user.id)
          .maybeSingle();
        task = data;
      } else {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("tasks")
          .update({ completed_at: now, updated_at: now })
          .eq("id", id)
          .eq("user_id", auth.user.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        task = data;
      }
    } else if (hasDueDate) {
      const dueDate = body.dueDate;
      let dueDateValue: string | null;

      if (dueDate === null) {
        dueDateValue = null;
      } else if (typeof dueDate === "string") {
        const d = new Date(dueDate);
        if (isNaN(d.getTime())) {
          const response = NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
          applySessionCookies(response, auth.resolved);
          return response;
        }
        dueDateValue = d.toISOString();
      } else {
        const response = NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
        applySessionCookies(response, auth.resolved);
        return response;
      }

      const { data, error } = await supabase
        .from("tasks")
        .update({ due_date: dueDateValue, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", auth.user.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      task = data;
    }

    if (task === null) {
      const response = NextResponse.json({ error: "Task not found" }, { status: 404 });
      applySessionCookies(response, auth.resolved);
      return response;
    }

    const response = NextResponse.json(task);
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    console.error("[api/tasks/[id] PATCH]", error);
    const message = error instanceof Error ? error.message : "Failed to update task";
    const response = NextResponse.json({ error: message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
