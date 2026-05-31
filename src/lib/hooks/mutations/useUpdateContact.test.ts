import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateContact } from "./useUpdateContact";

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("updateContact — PUT body contract", () => {
  it("sends camelCase companyIds and projectIds (not snake_case)", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    await updateContact({
      id: "c1",
      name: "Alice",
      email: null,
      phone: null,
      role: null,
      bio: null,
      type: "employee",
      companyIds: ["co1"],
      projectIds: ["p1"],
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body.companyIds).toEqual(["co1"]);
    expect(body.projectIds).toEqual(["p1"]);
    expect(body).not.toHaveProperty("company_ids");
    expect(body).not.toHaveProperty("project_ids");
  });

  it("sends required type field", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    await updateContact({
      id: "c1",
      name: "Alice",
      email: null,
      phone: null,
      role: null,
      bio: null,
      type: "investor",
      companyIds: [],
      projectIds: [],
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body.type).toBe("investor");
  });

  it("rejects with server error message on 400 response", async () => {
    const fetchMock = makeFetchMock(400, { error: "Name is required." });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateContact({ id: "c1", name: "", email: null, phone: null, role: null, bio: null, type: "employee", companyIds: [], projectIds: [] })
    ).rejects.toThrow("Name is required.");
  });
});
