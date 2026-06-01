import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteTask } from "./useDeleteTask";

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("deleteTask — DELETE endpoint", () => {
  it("calls DELETE /api/tasks/:id with correct URL", async () => {
    const fetchMock = makeFetchMock(204, null);
    vi.stubGlobal("fetch", fetchMock);

    await deleteTask("task-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tasks/task-123",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("includes credentials in request", async () => {
    const fetchMock = makeFetchMock(204, null);
    vi.stubGlobal("fetch", fetchMock);

    await deleteTask("task-456");

    const callArgs = fetchMock.mock.calls[0] as unknown[];
    const options = callArgs[1] as RequestInit;
    expect(options.credentials).toBe("include");
  });

  it("resolves successfully on 204 response", async () => {
    const fetchMock = makeFetchMock(204, null);
    vi.stubGlobal("fetch", fetchMock);

    const result = await deleteTask("task-789");
    expect(result).toBeUndefined();
  });

  it("resolves successfully on 200 response", async () => {
    const fetchMock = makeFetchMock(200, {});
    vi.stubGlobal("fetch", fetchMock);

    const result = await deleteTask("task-200");
    expect(result).toBeUndefined();
  });

  it("rejects with server error message on non-ok response", async () => {
    const fetchMock = makeFetchMock(404, { error: "Task not found" });
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteTask("nonexistent")).rejects.toThrow("Task not found");
  });

  it("uses default error message when server returns no error field", async () => {
    const fetchMock = makeFetchMock(500, {});
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteTask("task-500")).rejects.toThrow("Failed to delete task");
  });

  it("handles unparseable JSON response gracefully", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteTask("task-bad-json")).rejects.toThrow("Failed to delete task");
  });
});
