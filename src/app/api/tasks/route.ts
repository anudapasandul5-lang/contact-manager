import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { normalizeCapture } from "@/lib/capture/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const businessId = searchParams.get("businessId");
    const parentTaskId = searchParams.get("parentTaskId");
    const completed = searchParams.get("completed");

    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);
    let query = supabase.from("tasks").select("*").eq("user_id", auth.user.id);

    if (projectId === "null") {
      query = query.is("project_id", null);
    } else if (projectId !== null) {
      query = query.eq("project_id", projectId);
    }

    if (businessId !== null) {
      query = query.eq("business_id", businessId);
    }

    if (parentTaskId === "null") {
      query = query.is("parent_task_id", null);
    } else if (parentTaskId !== null) {
      query = query.eq("parent_task_id", parentTaskId);
    }

    if (completed === "false") {
      query = query.is("completed_at", null);
    } else if (completed === "true") {
      query = query.not("completed_at", "is", null);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const response = NextResponse.json(data ?? []);
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    console.error("[api/tasks GET]", error);
    const message = error instanceof Error ? error.message : "Failed to list tasks";
    const response = NextResponse.json({ error: message }, { status: 500 });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      const response = NextResponse.json({ error: "title is required" }, { status: 400 });
      applySessionCookies(response, auth.resolved);
      return response;
    }

    const payload = {
      title: (body.title as string).trim(),
      notes: typeof body.notes === "string" ? body.notes : undefined,
      dueDate: typeof body.dueDate === "string" ? new Date(body.dueDate) : undefined,
      projectId: typeof body.projectId === "string" ? body.projectId : undefined,
      businessId: typeof body.businessId === "string" ? body.businessId : undefined,
      contactId: typeof body.contactId === "string" ? body.contactId : undefined,
      companyId: typeof body.companyId === "string" ? body.companyId : undefined,
    };

    const supabase = getSupabaseServer(auth.resolved.accessToken ?? undefined);

    if (payload.projectId) {
      const { data: proj } = await supabase
        .from("projects")
        .select("id")
        .eq("id", payload.projectId)
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (!proj) {
        const response = NextResponse.json({ error: "projectId not found" }, { status: 400 });
        applySessionCookies(response, auth.resolved);
        return response;
      }
    }

    const input = normalizeCapture({ source: "cmd-k", payload });
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        id: crypto.randomUUID(),
        user_id: auth.user.id,
        title: input.title,
        notes: input.notes ?? null,
        project_id: input.projectId ?? null,
        contact_id: input.contactId ?? null,
        company_id: input.companyId ?? null,
        business_id: input.businessId ?? null,
        defer_date: input.deferDate?.toISOString() ?? null,
        due_date: input.dueDate?.toISOString() ?? null,
        parent_task_id: input.parentTaskId ?? null,
        recurrence_rule: input.recurrenceRule ?? null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const response = NextResponse.json(data, { status: 201 });
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    console.error("[api/tasks POST]", error);
    const message = error instanceof Error ? error.message : "Failed to create task";
    const status = message.includes("empty") || message.includes("required") ? 400 : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
