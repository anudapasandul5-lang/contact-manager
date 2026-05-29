import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { composeDigest, type DigestTask, type DigestBuckets } from "@/lib/digest/composer";
import { startOfDay, addDaysWallClock } from "@/lib/forecast/buckets";

export const runtime = "nodejs";

// ── Pure helper (exported for unit tests) ─────────────────────────────────────

export function buildDigestBuckets(
  tasks: Array<{ due_date: Date | null; [key: string]: unknown }>,
  todayStart: Date,
  tomorrowStart: Date,
  dayAfterStart: Date,
): DigestBuckets {
  const buckets: DigestBuckets = { overdue: [], today: [], tomorrow: [] };

  for (const task of tasks) {
    const due = task.due_date;
    if (due == null) continue;

    const t = due.getTime();
    if (t < todayStart.getTime()) {
      buckets.overdue.push(task as DigestTask);
    } else if (t < tomorrowStart.getTime()) {
      buckets.today.push(task as DigestTask);
    } else if (t < dayAfterStart.getTime()) {
      buckets.tomorrow.push(task as DigestTask);
    }
  }

  return buckets;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth guard
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Env guards
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }
  if (!process.env.DIGEST_FROM_EMAIL) {
    return NextResponse.json({ error: "DIGEST_FROM_EMAIL not set" }, { status: 500 });
  }

  // Supabase service role client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Get all users
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // Filter: skip unconfirmed or missing emails
  const users = (usersData?.users ?? []).filter(
    (u) => u.email && u.email_confirmed_at != null,
  );

  // TZ-aware date boundaries
  const tz = process.env.DIGEST_TIMEZONE ?? "Asia/Muscat";
  const now = new Date();
  const todayStart = startOfDay(now, tz);
  const tomorrowStart = addDaysWallClock(todayStart, 1, tz);
  const dayAfterStart = addDaysWallClock(todayStart, 2, tz);

  // Resend client — instantiated once
  const resend = new Resend(process.env.RESEND_API_KEY);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      // Query tasks for this user
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(
          `id, title, notes, due_date, projects(name), businesses(name), contacts(name), companies(name)`,
        )
        .eq("user_id", user.id)
        .is("completed_at", null)
        .not("due_date", "is", null)
        .or(`defer_date.is.null,defer_date.lte.${now.toISOString()}`)
        .lt("due_date", dayAfterStart.toISOString());

      if (tasksError) throw new Error(tasksError.message);

      // Map raw tasks to DigestTask[]
      const digestTasks: DigestTask[] = (tasks ?? []).map((t) => ({
        id: t.id as string,
        title: t.title as string,
        due_date: t.due_date ? new Date(t.due_date as string) : null,
        notes: (t.notes as string | null) ?? null,
        projectName: (t.projects as unknown as { name: string } | null)?.name,
        businessName: (t.businesses as unknown as { name: string } | null)?.name,
        contactName: (t.contacts as unknown as { name: string } | null)?.name,
        companyName: (t.companies as unknown as { name: string } | null)?.name,
      }));

      // Build buckets and skip if nothing to send
      const buckets = buildDigestBuckets(digestTasks, todayStart, tomorrowStart, dayAfterStart);
      if (
        buckets.overdue.length === 0 &&
        buckets.today.length === 0 &&
        buckets.tomorrow.length === 0
      ) {
        skipped++;
        continue;
      }

      // Fetch display name from user_profiles
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const displayName = profile?.display_name ?? user.email!.split("@")[0];

      // Compose email
      const { subject, html } = await composeDigest(buckets, now, tz, displayName);

      // Send via Resend
      await resend.emails.send({
        from: `Daily Digest <${process.env.DIGEST_FROM_EMAIL}>`,
        to: user.email!,
        subject,
        html,
        headers: {
          "List-Unsubscribe": `<mailto:${process.env.DIGEST_FROM_EMAIL}>`,
        },
      });

      sent++;
    } catch (err) {
      console.error("[cron-digest] user failed", user.id, err);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, skipped });
}
