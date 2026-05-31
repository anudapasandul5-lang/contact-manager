import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateCompany } from "./useUpdateCompany";

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("updateCompany — PUT body contract", () => {
  it("sends name, industry, color, is_owned", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    await updateCompany({ id: "co1", name: "Acme", industry: "Tech", color: "#3b82f6", is_owned: true });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body.name).toBe("Acme");
    expect(body.industry).toBe("Tech");
    expect(body.color).toBe("#3b82f6");
    expect(body.is_owned).toBe(true);
  });

  it("rejects with server error message on 400 response", async () => {
    const fetchMock = makeFetchMock(400, { error: "Name and industry are required." });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateCompany({ id: "co1", name: "", industry: "" })
    ).rejects.toThrow("Name and industry are required.");
  });
});
