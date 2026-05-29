import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const { mockMailSend, mockListUsers, mockFromState } = vi.hoisted(() => {
  const mockMailSend = vi.fn();
  const mockListUsers = vi.fn();
  const mockFromState = {
    chain: null as Record<string, unknown> | null,
  };
  return { mockMailSend, mockListUsers, mockFromState };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { admin: { listUsers: mockListUsers } },
    from: vi.fn(() => mockFromState.chain),
  })),
}));

// Resend mock: use a real constructor function (not vi.fn) to avoid Vitest spy wrapper issue
vi.mock("resend", () => {
  function Resend() {
    return { emails: { send: mockMailSend } };
  }
  return { Resend };
});

vi.mock("@/lib/digest/composer", () => ({
  composeDigest: vi.fn().mockResolvedValue({ subject: "Test Subject", html: "<html/>" }),
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { GET, buildDigestBuckets } from "./route";
import { NextRequest } from "next/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(secret = "test-secret"): NextRequest {
  return new NextRequest("http://localhost/api/crons/digest", {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });
}

const TODAY_START = new Date("2024-06-15T00:00:00Z");
const TOMORROW_START = new Date("2024-06-16T00:00:00Z");
const DAY_AFTER_START = new Date("2024-06-17T00:00:00Z");

function makeDigestTask(due_date: Date | null) {
  return { id: "t1", title: "Test task", due_date, notes: null };
}

const CONFIRMED_USER = {
  id: "user-1",
  email: "user@example.com",
  email_confirmed_at: "2024-01-01T00:00:00Z",
};

function makeQueryChain(data: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.not = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockResolvedValue({ data, error: null });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null });
  return chain;
}

function setTasks(data: unknown[]) {
  mockFromState.chain = makeQueryChain(data);
}

// ── buildDigestBuckets unit tests ─────────────────────────────────────────────

describe("buildDigestBuckets", () => {
  it("overdue — task with due_date before todayStart lands in overdue", () => {
    const task = makeDigestTask(new Date("2024-06-14T23:59:59Z"));
    const buckets = buildDigestBuckets([task], TODAY_START, TOMORROW_START, DAY_AFTER_START);
    expect(buckets.overdue).toHaveLength(1);
    expect(buckets.today).toHaveLength(0);
    expect(buckets.tomorrow).toHaveLength(0);
  });

  it("today — task with due_date between todayStart and tomorrowStart lands in today", () => {
    const task = makeDigestTask(new Date("2024-06-15T12:00:00Z"));
    const buckets = buildDigestBuckets([task], TODAY_START, TOMORROW_START, DAY_AFTER_START);
    expect(buckets.today).toHaveLength(1);
    expect(buckets.overdue).toHaveLength(0);
    expect(buckets.tomorrow).toHaveLength(0);
  });

  it("tomorrow — task with due_date between tomorrowStart and dayAfterStart lands in tomorrow", () => {
    const task = makeDigestTask(new Date("2024-06-16T08:00:00Z"));
    const buckets = buildDigestBuckets([task], TODAY_START, TOMORROW_START, DAY_AFTER_START);
    expect(buckets.tomorrow).toHaveLength(1);
    expect(buckets.overdue).toHaveLength(0);
    expect(buckets.today).toHaveLength(0);
  });

  it("null due_date — task not in any bucket", () => {
    const task = makeDigestTask(null);
    const buckets = buildDigestBuckets([task], TODAY_START, TOMORROW_START, DAY_AFTER_START);
    expect(buckets.overdue).toHaveLength(0);
    expect(buckets.today).toHaveLength(0);
    expect(buckets.tomorrow).toHaveLength(0);
  });
});

// ── Route integration tests ───────────────────────────────────────────────────

describe("GET /api/crons/digest", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("DIGEST_FROM_EMAIL", "digest@example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_key");

    setTasks([]);
    mockListUsers.mockResolvedValue({
      data: { users: [CONFIRMED_USER] },
      error: null,
    });
    mockMailSend.mockResolvedValue({ data: { id: "email-id" }, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("user with no tasks → skipped, Resend not called", async () => {
    const res = await GET(makeRequest());
    const json = await res.json();
    expect(json).toMatchObject({ sent: 0, skipped: 1, failed: 0 });
    expect(mockMailSend).not.toHaveBeenCalled();
  });

  it("user with tasks → Resend called with correct to and from", async () => {
    setTasks([
      {
        id: "t1",
        title: "Fix bug",
        due_date: new Date(Date.now() - 86400000).toISOString(),
        notes: null,
        projects: null,
        businesses: null,
        contacts: null,
        companies: null,
      },
    ]);

    const res = await GET(makeRequest());
    const json = await res.json();
    expect(json).toMatchObject({ sent: 1, skipped: 0, failed: 0 });
    expect(mockMailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        from: expect.stringContaining("digest@example.com"),
      }),
    );
  });

  it("Resend throws → failed incremented, loop continues (2 users)", async () => {
    const taskRow = {
      id: "t1",
      title: "Fix bug",
      due_date: new Date(Date.now() - 86400000).toISOString(),
      notes: null,
      projects: null,
      businesses: null,
      contacts: null,
      companies: null,
    };
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: "user-1", email: "user1@example.com", email_confirmed_at: "2024-01-01T00:00:00Z" },
          { id: "user-2", email: "user2@example.com", email_confirmed_at: "2024-01-01T00:00:00Z" },
        ],
      },
      error: null,
    });
    setTasks([taskRow]);
    mockMailSend
      .mockRejectedValueOnce(new Error("SMTP failure"))
      .mockResolvedValueOnce({ data: { id: "ok" }, error: null });

    const res = await GET(makeRequest());
    const json = await res.json();
    expect(json).toMatchObject({ sent: 1, failed: 1, skipped: 0 });
  });

  it("missing RESEND_API_KEY → 500", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    // Also delete so the guard triggers (empty string is falsy)
    process.env.RESEND_API_KEY = "";
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/RESEND_API_KEY/);
  });

  it("listUsers throws → 500", async () => {
    mockListUsers.mockResolvedValue({ data: null, error: { message: "DB error" } });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("DB error");
  });

  it("user with email_confirmed_at null → not sent", async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: "user-unconfirmed", email: "unconfirmed@example.com", email_confirmed_at: null },
        ],
      },
      error: null,
    });
    const res = await GET(makeRequest());
    const json = await res.json();
    expect(json).toMatchObject({ sent: 0, skipped: 0, failed: 0 });
    expect(mockMailSend).not.toHaveBeenCalled();
  });
});
