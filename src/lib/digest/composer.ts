import "server-only";

// mjml v5 is async
import mjml2html from "mjml";

export type DigestTask = {
  id: string;
  title: string;
  due_date: Date | null;
  notes: string | null;
  businessName?: string;
  projectName?: string;
  contactName?: string;
  companyName?: string;
};

export type DigestBuckets = {
  overdue: DigestTask[];
  today: DigestTask[];
  tomorrow: DigestTask[];
};

function formatDate(now: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(now);
}

// HTML escape — applied to all user-supplied strings before MJML interpolation
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MAX_TASKS = 20;

function capBucket(tasks: DigestTask[]): { shown: DigestTask[]; extra: number } {
  return {
    shown: tasks.slice(0, MAX_TASKS),
    extra: Math.max(0, tasks.length - MAX_TASKS),
  };
}

function formatDueDate(date: Date, bucket: string): string {
  if (bucket === "overdue") return "Overdue";
  if (bucket === "today") return "Today";
  if (bucket === "tomorrow") return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function renderTask(task: DigestTask, dueDateLabel: string): string {
  const title = `<strong>${esc(task.title)}</strong>`;
  const dateHtml = `<span style="color:#6b7280;font-size:12px;"> · ${esc(dueDateLabel)}</span>`;
  const notesHtml = task.notes
    ? `<br/><em style="color:#6b7280;font-size:12px;">${esc(task.notes.slice(0, 200))}${task.notes.length > 200 ? "…" : ""}</em>`
    : "";
  const tags: string[] = [];
  if (task.businessName) tags.push(`<span style="background:#8b5cf6;color:#fff;border-radius:3px;padding:1px 5px;font-size:11px;">${esc(task.businessName)}</span>`);
  if (task.projectName) tags.push(`<span style="background:#0ea5e9;color:#fff;border-radius:3px;padding:1px 5px;font-size:11px;">${esc(task.projectName)}</span>`);
  if (task.contactName) tags.push(`<span style="background:#10b981;color:#fff;border-radius:3px;padding:1px 5px;font-size:11px;">${esc(task.contactName)}</span>`);
  if (task.companyName) tags.push(`<span style="background:#f59e0b;color:#fff;border-radius:3px;padding:1px 5px;font-size:11px;">${esc(task.companyName)}</span>`);
  const tagsHtml = tags.length > 0 ? `<br/><span style="display:inline-flex;gap:4px;margin-top:2px;">${tags.join(" ")}</span>` : "";
  return `${title}${dateHtml}${notesHtml}${tagsHtml}`;
}

function buildSection(
  tasks: DigestTask[],
  label: string,
  pillColor: string,
): string {
  if (tasks.length === 0) return "";

  const { shown, extra } = capBucket(tasks);
  const pilledLabel = `<span style="background:${pillColor};color:#fff;border-radius:4px;padding:2px 8px;font-size:12px;font-weight:600;">${esc(label.charAt(0).toUpperCase() + label.slice(1))}</span>`;

  const taskRows = shown.map((task) => {
    const dueDateLabel = task.due_date
      ? formatDueDate(task.due_date, label)
      : "No date";
    return `<mj-text padding="8px 24px" font-size="14px" color="#111827">
      <div style="border-bottom:1px solid #f3f4f6;padding-bottom:8px;">${renderTask(task, dueDateLabel)}</div>
    </mj-text>`;
  }).join("\n");

  const extraRow = extra > 0
    ? `<mj-text padding="6px 24px" font-size="12px" color="#9ca3af">…and ${extra} more</mj-text>`
    : "";

  return `<mj-text padding="16px 24px 4px" font-size="13px">${pilledLabel}</mj-text>
${taskRows}
${extraRow}`;
}

export async function composeDigest(
  buckets: DigestBuckets,
  now: Date,
  tz: string,
): Promise<{ subject: string; html: string }> {
  // Validate inputs
  if (isNaN(now.getTime())) throw new RangeError("now is invalid Date");

  // Validate tz — throws RangeError if invalid
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    throw new RangeError(`Invalid timezone: ${tz}`);
  }

  const dateStr = formatDate(now, tz);
  const isEmpty =
    buckets.overdue.length + buckets.today.length + buckets.tomorrow.length === 0;

  let subject: string;
  if (isEmpty) {
    subject = `✓ All clear — ${dateStr}`;
  } else {
    const parts: string[] = [];
    if (buckets.overdue.length > 0) {
      parts.push(`🔴 ${buckets.overdue.length} overdue`);
    }
    parts.push(`${buckets.today.length} due today`);
    subject = parts.join(" · ") + ` — ${dateStr}`;
  }

  // Build sections
  const overdueSection = buildSection(buckets.overdue, "overdue", "#ef4444");
  const todaySection = buildSection(buckets.today, "today", "#3b82f6");
  const tomorrowSection = buildSection(buckets.tomorrow, "tomorrow", "#6b7280");

  const bodyContent = isEmpty
    ? `<mj-text padding="32px 24px" align="center" color="#6b7280" font-size="14px">
        ✓ Nothing due — you have a clear runway today.
      </mj-text>`
    : `${overdueSection}${todaySection}${tomorrowSection}`;

  const template = `
<mjml>
  <mj-head>
    <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" />
    <mj-attributes>
      <mj-all font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f5">
    <mj-section background-color="#18181b" padding="16px 24px">
      <mj-column>
        <mj-text color="#ffffff" font-size="14px" font-weight="600">Daily Digest · ${esc(dateStr)}</mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#ffffff" padding="0">
      <mj-column>
        ${bodyContent}
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

  const result = await mjml2html(template);
  if (result.errors && result.errors.length > 0) {
    throw new Error(`MJML compile error: ${result.errors[0].formattedMessage}`);
  }

  return { subject, html: result.html };
}
