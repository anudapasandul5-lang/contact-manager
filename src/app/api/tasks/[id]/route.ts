import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { updateTask, completeTask } from "@/lib/repositories/tasks";

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
    const db = getDb();

    let task = null;

    if (body.completed === true) {
      task = await completeTask(db, auth.user.id, id);
    } else if ("dueDate" in body) {
      const dueDate = body.dueDate;
      const patch: { dueDate?: Date } = {};
      if (typeof dueDate === "string") {
        patch.dueDate = new Date(dueDate);
      } else if (dueDate === null) {
        // Explicitly allow null to clear the due date by casting
        patch.dueDate = null as unknown as Date;
      }
      task = await updateTask(db, auth.user.id, id, patch);
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
