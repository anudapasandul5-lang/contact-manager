import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks (vi.hoisted runs before vi.mock factories) ─────────────────
const { mockUpdateEq, mockUpdate, mockLt, mockIs, mockNot, mockSelect, mockFrom, mockNextInstance } =
  vi.hoisted(() => {
    const mockUpdateEq = vi.fn();
    const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
    const mockLt = vi.fn();
    const mockIs = vi.fn(() => ({ lt: mockLt }));
    const mockNot = vi.fn(() => ({ is: mockIs }));
    const mockSelect = vi.fn(() => ({ not: mockNot }));
    const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }));
    const mockNextInstance = vi.fn();
    return { mockUpdateEq, mockUpdate, mockLt, mockIs, mockNot, mockSelect, mockFrom, mockNextInstance };
  });

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/recurrence/engine", () => ({
  nextInstance: mockNextInstance,
}));

import { POST } from "./route";

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeRequest(authHeader?: string): NextRequest {
  return new NextRequest("http://localhost/api/crons/task-recurrence", {
    method: "POST",
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

describe("POST /api/crons/task-recurrence", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    mockLt.mockResolvedValue({ data: [], error: null });
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("1. no Authorization header → 401", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("2. wrong secret → 401", async () => {
    const res = await POST(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("3. correct auth, no eligible tasks → { updated: 0 }", async () => {
    mockLt.mockResolvedValue({ data: [], error: null });
    const res = await POST(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ updated: 0 });
  });

  it("4. 2 eligible tasks → updates both, returns { updated: 2 }", async () => {
    const task1 = { id: "t1", recurrence_rule: "RRULE:FREQ=DAILY", due_date: "2026-05-01T09:00:00Z" };
    const task2 = { id: "t2", recurrence_rule: "RRULE:FREQ=WEEKLY", due_date: "2026-05-01T09:00:00Z" };
    mockLt.mockResolvedValue({ data: [task1, task2], error: null });

    const next1 = new Date("2026-05-30T09:00:00Z");
    const next2 = new Date("2026-06-05T09:00:00Z");
    mockNextInstance.mockReturnValueOnce(next1).mockReturnValueOnce(next2);
    mockUpdateEq.mockResolvedValue({ error: null });

    const res = await POST(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ updated: 2 });
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect((mockUpdate.mock.calls[0] as unknown as [{ due_date: string }])[0].due_date).toBe(next1.toISOString());
    expect((mockUpdate.mock.calls[1] as unknown as [{ due_date: string }])[0].due_date).toBe(next2.toISOString());
  });

  it("5. nextInstance returns null → skipped, { updated: 0 }", async () => {
    mockLt.mockResolvedValue({
      data: [{ id: "t-exhausted", recurrence_rule: "RRULE:FREQ=DAILY;COUNT=1;DTSTART=20000101T000000Z", due_date: "2000-01-01T00:00:00Z" }],
      error: null,
    });
    mockNextInstance.mockReturnValue(null);

    const res = await POST(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ updated: 0 });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("6. malformed rule throws → caught silently, { updated: 0 }", async () => {
    mockLt.mockResolvedValue({
      data: [{ id: "t-bad", recurrence_rule: "garbage", due_date: "2026-05-01T00:00:00Z" }],
      error: null,
    });
    mockNextInstance.mockImplementation(() => { throw new Error("malformed"); });

    const res = await POST(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ updated: 0 });
  });

  it("7. supabase SELECT error → 500", async () => {
    mockLt.mockResolvedValue({ data: null, error: { message: "DB error" } });

    const res = await POST(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("DB error");
  });
});
