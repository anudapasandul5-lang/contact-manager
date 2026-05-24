import { describe, it, expect } from "vitest";
import { resolveTaskNode } from "./nodeFocusBus";

describe("resolveTaskNode", () => {
  it("returns contact focus when contactId is set", () => {
    const result = resolveTaskNode({ contactId: "abc-123" });
    expect(result).toEqual({ kind: "contact", id: "abc-123" });
  });

  it("prefers contactId over companyId when both are set", () => {
    const result = resolveTaskNode({ contactId: "c1", companyId: "co1" });
    expect(result).toEqual({ kind: "contact", id: "c1" });
  });

  it("returns company focus when only companyId is set", () => {
    const result = resolveTaskNode({ companyId: "company-456" });
    expect(result).toEqual({ kind: "company", id: "company-456" });
  });

  it("returns project focus when only projectId is set", () => {
    const result = resolveTaskNode({ projectId: "proj-789" });
    expect(result).toEqual({ kind: "project", id: "proj-789" });
  });

  it("returns null when only undefined/null FKs are provided", () => {
    const result = resolveTaskNode({
      contactId: null,
      companyId: undefined,
      projectId: null,
    });
    expect(result).toBeNull();
  });

  it("returns null when all FKs are omitted", () => {
    const result = resolveTaskNode({});
    expect(result).toBeNull();
  });
});
