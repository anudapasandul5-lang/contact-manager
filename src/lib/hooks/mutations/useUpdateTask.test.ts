import { describe, it, expect, vi, beforeEach } from "vitest";
import { patchTask } from "./useUpdateTask";

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("patchTask — selective field updates", () => {
  it("only sends keys that are present in input", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    await patchTask({
      id: "task-1",
      title: "Updated title",
      notes: "Updated notes",
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body).toHaveProperty("title", "Updated title");
    expect(body).toHaveProperty("notes", "Updated notes");
    expect(body).not.toHaveProperty("dueDate");
    expect(body).not.toHaveProperty("projectId");
  });

  it("omits undefined fields from request body", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    await patchTask({
      id: "task-1",
      title: "New title",
      notes: undefined,
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body).toHaveProperty("title");
    expect(body).not.toHaveProperty("notes");
  });

  it("sends dueDate as ISO string when provided", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    const date = new Date("2026-06-15");
    await patchTask({
      id: "task-1",
      dueDate: date,
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body.dueDate).toBe(date.toISOString());
  });

  it("sends dueDate as null when set to null", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    await patchTask({
      id: "task-1",
      dueDate: null,
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body).toHaveProperty("dueDate", null);
  });

  it("sends projectId when provided", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    await patchTask({
      id: "task-1",
      projectId: "proj-123",
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body).toHaveProperty("projectId", "proj-123");
  });

  it("sends businessId when provided", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    await patchTask({
      id: "task-1",
      businessId: "biz-456",
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body).toHaveProperty("businessId", "biz-456");
  });

  it("sends contactId when provided", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    await patchTask({
      id: "task-1",
      contactId: "contact-789",
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body).toHaveProperty("contactId", "contact-789");
  });

  it("sends recurrenceRule when provided", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    await patchTask({
      id: "task-1",
      recurrenceRule: "RRULE:FREQ=DAILY",
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body).toHaveProperty("recurrenceRule", "RRULE:FREQ=DAILY");
  });

  it("rejects with server error message on non-ok response", async () => {
    const fetchMock = makeFetchMock(400, { error: "Task not found" });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      patchTask({ id: "task-1", title: "Bad update" })
    ).rejects.toThrow("Task not found");
  });

  it("uses default error message when server returns no error field", async () => {
    const fetchMock = makeFetchMock(500, {});
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      patchTask({ id: "task-1", title: "Server error" })
    ).rejects.toThrow("Failed to update task");
  });
});
