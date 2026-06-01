import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { validateRrule, nextInstance } from "@/lib/recurrence/engine";

export const runtime = "nodejs";

const patchBodySchema = z.object({
  recurrenceRule: z.string().nullable().optional(),
});

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
    const hasRecurrenceRule = "recurrenceRule" in body;

    let task = null;

    if (hasCompleted) {
      const { data: existing } = await supabase
        .from("tasks")
        .select("*")
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

        // Spawn next instance if recurring
        if (existing.recurrence_rule) {
          try {
            const nextDate = nextInstance(existing.recurrence_rule as string, new Date());
            if (nextDate !== null) {
              const spawnNow = new Date().toISOString();
              await supabase.from("tasks").insert({
                id: crypto.randomUUID(),
                user_id: auth.user.id,
                title: existing.title as string,
                notes: (existing.notes as string | null) ?? null,
                project_id: (existing.project_id as string | null) ?? null,
                contact_id: (existing.contact_id as string | null) ?? null,
                company_id: (existing.company_id as string | null) ?? null,
                business_id: (existing.business_id as string | null) ?? null,
                recurrence_rule: existing.recurrence_rule as string,
                due_date: nextDate.toISOString(),
                defer_date: null,
                completed_at: null,
                parent_task_id: null,
                created_at: spawnNow,
                updated_at: spawnNow,
              });
            }
          } catch (err) {
            console.error("[spawn-on-completion]", err);
          }
        }
      }
    } else {
      // General edit branch: handle any combination of editable fields
      const hasTitle = "title" in body;
      const hasNotes = "notes" in body;
      const hasProjectId = "projectId" in body;
      const hasBusinessId = "businessId" in body;
      const hasContactId = "contactId" in body;

      if (!hasDueDate && !hasTitle && !hasNotes && !hasProjectId && !hasBusinessId && !hasContactId && !hasRecurrenceRule) {
        const response = NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        applySessionCookies(response, auth.resolved);
        return response;
      }

      const updateFields: Record<string, unknown> = {};

      if (hasTitle) {
        if (typeof body.title !== "string" || body.title.trim() === "") {
          const response = NextResponse.json({ error: "title must be a non-empty string" }, { status: 400 });
          applySessionCookies(response, auth.resolved);
          return response;
        }
        updateFields.title = body.title.trim();
      }

      if (hasNotes) {
        updateFields.notes = body.notes === null ? null : String(body.notes);
      }

      if (hasDueDate) {
        const dueDate = body.dueDate;
        if (dueDate === null) {
          updateFields.due_date = null;
        } else if (typeof dueDate === "string") {
          const d = new Date(dueDate);
          if (isNaN(d.getTime())) {
            const response = NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
            applySessionCookies(response, auth.resolved);
            return response;
          }
          updateFields.due_date = d.toISOString();
        } else {
          const response = NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
          applySessionCookies(response, auth.resolved);
          return response;
        }
      }

      if (hasProjectId) {
        updateFields.project_id = body.projectId === null ? null : String(body.projectId);
      }

      if (hasBusinessId) {
        updateFields.business_id = body.businessId === null ? null : String(body.businessId);
      }

      if (hasContactId) {
        updateFields.contact_id = body.contactId === null ? null : String(body.contactId);
      }

      if (hasRecurrenceRule) {
        const recurrenceRuleRaw = body.recurrenceRule;
        const recurrenceRule =
          recurrenceRuleRaw === null || (typeof recurrenceRuleRaw === "string" && recurrenceRuleRaw.trim() === "")
            ? null
            : recurrenceRuleRaw;

        if (recurrenceRule !== null) {
          if (typeof recurrenceRule !== "string") {
            const response = NextResponse.json({ error: "Invalid recurrenceRule" }, { status: 400 });
            applySessionCookies(response, auth.resolved);
            return response;
          }
          const validation = validateRrule(recurrenceRule);
          if (!validation.ok) {
            const response = NextResponse.json({ error: validation.error }, { status: 400 });
            applySessionCookies(response, auth.resolved);
            return response;
          }
        }
        updateFields.recurrence_rule = recurrenceRule;
      }

      updateFields.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("tasks")
        .update(updateFields)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.user) return auth.response;

  try {
    const { id } = await params;
    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);

    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select()
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (data === null) {
      const response = NextResponse.json({ error: "Task not found" }, { status: 404 });
      applySessionCookies(response, auth.resolved);
      return response;
    }

    const response = NextResponse.json({ ok: true });
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    console.error("[api/tasks/[id] DELETE]", error);
    const message = error instanceof Error ? error.message : "Failed to delete task";
    const response = NextResponse.json({ error: message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
