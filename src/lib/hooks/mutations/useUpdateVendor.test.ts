import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateVendor } from "./useUpdateVendor";

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("updateVendor — PUT body contract", () => {
  it("sends companyIds, projectIds, and people array", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    await updateVendor({
      id: "v1",
      name: "ACME Printing",
      specialty: "Printing",
      notes: null,
      color: "#f97316",
      companyIds: ["co1"],
      projectIds: ["p1"],
      people: [{ id: "vp1", name: "Bob", role: "Manager", email: null, phone: null, bio: null }],
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body.companyIds).toEqual(["co1"]);
    expect(body.projectIds).toEqual(["p1"]);
    expect(Array.isArray(body.people)).toBe(true);
    expect((body.people as unknown[]).length).toBe(1);
  });

  it("rejects with server error message on 400 response", async () => {
    const fetchMock = makeFetchMock(400, { error: "Vendor name is required." });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateVendor({ id: "v1", name: "", specialty: null, notes: null, color: null, companyIds: [], projectIds: [], people: [] })
    ).rejects.toThrow("Vendor name is required.");
  });
});
