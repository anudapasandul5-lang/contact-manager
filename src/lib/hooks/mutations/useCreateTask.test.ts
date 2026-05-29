import { describe, it, expect, vi, beforeEach } from "vitest";
import { postTask } from "./useCreateTask";

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("postTask — recurrenceRule serialization", () => {
  it("sends recurrenceRule in body when provided", async () => {
    const fetchMock = makeFetchMock(200, { id: "task-1" });
    vi.stubGlobal("fetch", fetchMock);

    await postTask({ title: "Daily standup", recurrenceRule: "RRULE:FREQ=DAILY" });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body.recurrenceRule).toBe("RRULE:FREQ=DAILY");
  });

  it("sends recurrenceRule as null when omitted", async () => {
    const fetchMock = makeFetchMock(200, { id: "task-2" });
    vi.stubGlobal("fetch", fetchMock);

    await postTask({ title: "One-off task" });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body.recurrenceRule).toBeNull();
  });

  it("sends recurrenceRule as null when explicitly null", async () => {
    const fetchMock = makeFetchMock(200, { id: "task-3" });
    vi.stubGlobal("fetch", fetchMock);

    await postTask({ title: "No rule", recurrenceRule: null });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body.recurrenceRule).toBeNull();
  });

  it("rejects with server error message on 400 response", async () => {
    const fetchMock = makeFetchMock(400, { error: "bad rrule" });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      postTask({ title: "Bad task", recurrenceRule: "RRULE:FREQ=INVALID" })
    ).rejects.toThrow("bad rrule");
  });
});
