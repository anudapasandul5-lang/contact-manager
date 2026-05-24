import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { createTask, listTasks } from "@/lib/repositories/tasks";
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

    const db = getDb();
    const tasks = await listTasks(db, auth.user.id, {
      projectId: projectId === "null" ? null : (projectId ?? undefined),
      businessId: businessId ?? undefined,
      parentTaskId: parentTaskId === "null" ? null : (parentTaskId ?? undefined),
      completed:
        completed === "true" ? true : completed === "false" ? false : undefined,
    });

    const response = NextResponse.json(tasks);
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

    const db = getDb();

    // FK ownership check: projectId must belong to this user
    if (payload.projectId) {
      const rows = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.id, payload.projectId),
            eq(schema.projects.user_id, auth.user.id),
          ),
        )
        .limit(1);
      if (rows.length === 0) {
        const response = NextResponse.json({ error: "projectId not found" }, { status: 400 });
        applySessionCookies(response, auth.resolved);
        return response;
      }
    }

    const input = normalizeCapture({ source: "cmd-k", payload });
    const task = await createTask(db, auth.user.id, input);

    const response = NextResponse.json(task, { status: 201 });
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
