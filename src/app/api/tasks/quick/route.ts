import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { createTask } from "@/lib/repositories/tasks";
import { normalizeCapture } from "@/lib/capture/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("X-Api-Key");
  if (!apiKey || apiKey !== process.env.TASKS_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = process.env.TASKS_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: "Server misconfigured: TASKS_USER_ID not set" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const db = getDb();
    const input = normalizeCapture({
      source: "ios-shortcut",
      payload: {
        title: body.title,
        notes: typeof body.notes === "string" ? body.notes : undefined,
      },
    });
    const task = await createTask(db, userId, input);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("[api/tasks/quick POST]", error);
    const message = error instanceof Error ? error.message : "Failed to create task";
    const status = message.includes("empty") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
