/**
 * Unit tests for PATCH /api/tasks/[id] (full-edit branch + completed branch)
 * and DELETE /api/tasks/[id].
 *
 * All Supabase calls are mocked; no real DB required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Stable supabase mock we control per-test
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ maybeSingle: mockMaybeSingle, single: mockSingle }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockDelete = vi.fn(() => ({ eq: mockEq }));
const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
const mockFrom = vi.fn();

interface EqChain {
  eq: (_col: string, _val: unknown) => EqChain;
  select: typeof mockSelect;
  delete: typeof mockDelete;
}

function mockEq(_col: string, _val: unknown): EqChain {
  return { eq: mockEq, select: mockSelect, delete: mockDelete };
}

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock("@/lib/auth/session", () => ({
  authenticateRequest: vi.fn(),
  applySessionCookies: vi.fn(),
}));

vi.mock("@/lib/recurrence/engine", () => ({
  validateRrule: vi.fn(() => ({ ok: true })),
  nextInstance: vi.fn(() => null),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { PATCH, DELETE } from "./route";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { validateRrule } from "@/lib/recurrence/engine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, method = "PATCH"): NextRequest {
  return new NextRequest("http://localhost/api/tasks/task-123", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const fakeAuth = {
  user: { id: "user-abc" },
  response: null,
  resolved: { accessToken: "tok", cookies: [] },
};

function setupAuth() {
  vi.mocked(authenticateRequest).mockResolvedValue(fakeAuth as never);
}

const PARAMS = Promise.resolve({ id: "task-123" });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PATCH /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  // ── General edit branch ──────────────────────────────────────────────────

  it("updates title and businessId, returns 200 with updated row", async () => {
    const updatedTask = {
      id: "task-123",
      title: "updated",
      business_id: "biz-uuid",
      user_id: "user-abc",
    };

    // from("tasks").update(...).eq(...).eq(...).select().maybeSingle()
    mockFrom.mockReturnValue({
      update: vi.fn(() => ({
        eq: () => ({
          eq: () => ({
            select: () => ({ maybeSingle: async () => ({ data: updatedTask, error: null }) }),
          }),
        }),
      })),
    });

    const req = makeRequest({ title: "updated", businessId: "biz-uuid" });
    const res = await PATCH(req, { params: PARAMS });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe("updated");
    expect(json.business_id).toBe("biz-uuid");
  });

  it("updates dueDate alone (deferred path still works)", async () => {
    const updatedTask = {
      id: "task-123",
      due_date: "2026-06-10T00:00:00.000Z",
      user_id: "user-abc",
    };

    mockFrom.mockReturnValue({
      update: vi.fn(() => ({
        eq: () => ({
          eq: () => ({
            select: () => ({ maybeSingle: async () => ({ data: updatedTask, error: null }) }),
          }),
        }),
      })),
    });

    const req = makeRequest({ dueDate: "2026-06-10T00:00:00.000Z" });
    const res = await PATCH(req, { params: PARAMS });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.due_date).toBe("2026-06-10T00:00:00.000Z");
  });

  it("completed: true triggers complete+spawn path (not regressed)", async () => {
    const existingTask = {
      id: "task-123",
      user_id: "user-abc",
      title: "My task",
      notes: null,
      project_id: null,
      contact_id: null,
      company_id: null,
      business_id: null,
      recurrence_rule: null,
      due_date: null,
      defer_date: null,
      completed_at: null,
      parent_task_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    const completedTask = { ...existingTask, completed_at: "2026-06-01T00:00:00.000Z" };

    // First call: select existing. Second call: update completed_at.
    let fromCallCount = 0;
    mockFrom.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // select existing
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: existingTask, error: null }),
              }),
            }),
          }),
        };
      }
      // update completed_at
      return {
        update: vi.fn(() => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({ data: completedTask, error: null }),
              }),
            }),
          }),
        })),
      };
    });

    const req = makeRequest({ completed: true });
    const res = await PATCH(req, { params: PARAMS });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.completed_at).toBeTruthy();
  });

  it("returns 400 when no valid fields are present", async () => {
    const req = makeRequest({ bogus: "value" });
    const res = await PATCH(req, { params: PARAMS });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/no valid fields/i);
  });

  it("returns 400 when title is an empty string", async () => {
    const req = makeRequest({ title: "   " });
    const res = await PATCH(req, { params: PARAMS });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/title/i);
  });

  it("returns 404 when task not found (maybeSingle returns null)", async () => {
    mockFrom.mockReturnValue({
      update: vi.fn(() => ({
        eq: () => ({
          eq: () => ({
            select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
      })),
    });

    const req = makeRequest({ title: "ghost task" });
    const res = await PATCH(req, { params: PARAMS });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatch(/not found/i);
  });
});

describe("DELETE /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("returns 200 {ok:true} for owned task", async () => {
    const deletedTask = { id: "task-123", user_id: "user-abc" };

    mockFrom.mockReturnValue({
      delete: vi.fn(() => ({
        eq: () => ({
          eq: () => ({
            select: () => ({ maybeSingle: async () => ({ data: deletedTask, error: null }) }),
          }),
        }),
      })),
    });

    const req = makeRequest(null, "DELETE");
    const res = await DELETE(req, { params: PARAMS });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("returns 404 when task not found or not owned", async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn(() => ({
        eq: () => ({
          eq: () => ({
            select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
      })),
    });

    const req = makeRequest(null, "DELETE");
    const res = await DELETE(req, { params: PARAMS });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatch(/not found/i);
  });
});
