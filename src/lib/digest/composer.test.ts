import { describe, it, expect } from "vitest";
import { composeDigest } from "./composer";
import type { DigestTask, DigestBuckets } from "./composer";

const NOW = new Date("2026-05-23T07:00:00Z"); // 7am UTC
const TZ = "Asia/Muscat"; // UTC+4

function makeTask(overrides: Partial<DigestTask> = {}): DigestTask {
  return {
    id: "task-1",
    title: "Test task",
    due_date: new Date("2026-05-23T00:00:00Z"),
    notes: null,
    ...overrides,
  };
}

function emptyBuckets(): DigestBuckets {
  return { overdue: [], today: [], tomorrow: [] };
}

describe("composeDigest", () => {
  it("full: all 3 buckets populated — html and subject match snapshot", async () => {
    const buckets: DigestBuckets = {
      overdue: [makeTask({ id: "o1", title: "Overdue task", due_date: new Date("2026-05-20T00:00:00Z") })],
      today: [makeTask({ id: "t1", title: "Today task" })],
      tomorrow: [makeTask({ id: "tm1", title: "Tomorrow task", due_date: new Date("2026-05-24T00:00:00Z") })],
    };
    const result = await composeDigest(buckets, NOW, TZ);
    expect(result.subject).toMatchSnapshot();
    expect(result.html).toMatchSnapshot();
  });

  it("today-only: overdue and tomorrow empty — html and subject match snapshot", async () => {
    const buckets: DigestBuckets = {
      overdue: [],
      today: [makeTask({ id: "t1", title: "Today only" })],
      tomorrow: [],
    };
    const result = await composeDigest(buckets, NOW, TZ);
    expect(result.subject).toMatchSnapshot();
    expect(result.html).toMatchSnapshot();
  });

  it("all-clear: all buckets empty — shows all-clear message", async () => {
    const result = await composeDigest(emptyBuckets(), NOW, TZ);
    expect(result.subject).toMatchSnapshot();
    expect(result.html).toMatchSnapshot();
  });

  it("rich-task: task with all 4 entity names — html matches snapshot", async () => {
    const buckets: DigestBuckets = {
      overdue: [],
      today: [makeTask({
        id: "rich",
        title: "Rich task",
        notes: "Some notes here",
        businessName: "Acme Inc",
        projectName: "Website Redesign",
        contactName: "John Doe",
        companyName: "Acme Corp",
      })],
      tomorrow: [],
    };
    const result = await composeDigest(buckets, NOW, TZ);
    expect(result.html).toMatchSnapshot();
  });

  it("no-notes: tasks without notes or entity links — html matches snapshot", async () => {
    const buckets: DigestBuckets = {
      overdue: [],
      today: [makeTask({ id: "bare", title: "Bare task", notes: null })],
      tomorrow: [],
    };
    const result = await composeDigest(buckets, NOW, TZ);
    expect(result.html).toMatchSnapshot();
  });

  it("tz-invalid: throws RangeError for invalid timezone", async () => {
    await expect(composeDigest(emptyBuckets(), NOW, "Not/ATimezone")).rejects.toThrow(RangeError);
  });

  it("invalid-date: throws RangeError for invalid Date", async () => {
    await expect(
      composeDigest(emptyBuckets(), new Date("invalid"), TZ)
    ).rejects.toThrow(RangeError);
  });

  it("html-injection: escapes HTML in task title — no raw angle brackets in output", async () => {
    const buckets: DigestBuckets = {
      overdue: [],
      today: [makeTask({ title: '<script>alert("xss")</script>' })],
      tomorrow: [],
    };
    const result = await composeDigest(buckets, NOW, TZ);
    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).toMatchSnapshot();
  });

  it("subject-no-overdue: overdue empty, today has tasks — subject has no red dot", async () => {
    const buckets: DigestBuckets = {
      overdue: [],
      today: [makeTask({ id: "t1", title: "Today task" }), makeTask({ id: "t2", title: "Today task 2" })],
      tomorrow: [],
    };
    const result = await composeDigest(buckets, NOW, TZ);
    expect(result.subject).not.toContain("🔴");
    expect(result.subject).toMatchSnapshot();
  });

  it("cap: more than 20 tasks in today bucket — shows max 20 + extra count", async () => {
    const tasks = Array.from({ length: 25 }, (_, i) =>
      makeTask({ id: `t${i}`, title: `Task ${i + 1}` })
    );
    const buckets: DigestBuckets = { overdue: [], today: tasks, tomorrow: [] };
    const result = await composeDigest(buckets, NOW, TZ);
    expect(result.html).toContain("and 5 more");
    expect(result.html).toMatchSnapshot();
  });

  it("displayName: injects greeting when provided", async () => {
    const result = await composeDigest(emptyBuckets(), NOW, TZ, "Anuda");
    expect(result.html).toContain("Hi Anuda,");
  });

  it("displayName: no greeting when omitted", async () => {
    const result = await composeDigest(emptyBuckets(), NOW, TZ);
    expect(result.html).not.toContain("Hi ");
  });
});
