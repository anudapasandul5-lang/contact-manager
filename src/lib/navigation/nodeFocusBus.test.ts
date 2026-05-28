import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveTaskNode, emitTaskFocus, subscribeFocus } from "./nodeFocusBus";

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

  it("prefers companyId over projectId when contactId is absent", () => {
    const result = resolveTaskNode({ companyId: "co1", projectId: "p1" });
    expect(result).toEqual({ kind: "company", id: "co1" });
  });
});

describe("emitTaskFocus", () => {
  let eventTarget: EventTarget;

  beforeEach(() => {
    eventTarget = new EventTarget();
    vi.stubGlobal("window", {
      addEventListener: eventTarget.addEventListener.bind(eventTarget),
      removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
      dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls subscribeFocus listener with resolved contact focus request", () => {
    const listener = vi.fn();
    const unsub = subscribeFocus(listener);
    emitTaskFocus({ contactId: "c-001", companyId: "co-002", projectId: "p-003" });
    expect(listener).toHaveBeenCalledWith({ kind: "contact", id: "c-001" });
    unsub();
  });

  it("calls subscribeFocus listener with company focus when contactId absent", () => {
    const listener = vi.fn();
    const unsub = subscribeFocus(listener);
    emitTaskFocus({ companyId: "co-002", projectId: "p-003" });
    expect(listener).toHaveBeenCalledWith({ kind: "company", id: "co-002" });
    unsub();
  });

  it("does not invoke any listener when all FKs are null", () => {
    const listener = vi.fn();
    const unsub = subscribeFocus(listener);
    emitTaskFocus({ contactId: null, companyId: null, projectId: null });
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });
});
