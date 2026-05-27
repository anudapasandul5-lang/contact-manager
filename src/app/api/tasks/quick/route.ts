import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeCapture } from "@/lib/capture/service";

export const runtime = "nodejs";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase service config missing");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

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

    const input = normalizeCapture({
      source: "ios-shortcut",
      payload: {
        title: body.title,
        notes: typeof body.notes === "string" ? body.notes : undefined,
      },
    });

    const supabase = getServiceClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        title: input.title,
        notes: input.notes ?? null,
        project_id: null,
        contact_id: null,
        company_id: null,
        business_id: null,
        defer_date: null,
        due_date: null,
        parent_task_id: null,
        recurrence_rule: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[api/tasks/quick POST]", error);
    const message = error instanceof Error ? error.message : "Failed to create task";
    const status = message.includes("empty") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
