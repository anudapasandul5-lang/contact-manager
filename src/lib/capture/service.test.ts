import { describe, it, expect } from "vitest";
import { normalizeCapture } from "./service";

describe("normalizeCapture — cmd-k", () => {
  it("passes all fields through", () => {
    const due = new Date("2026-06-01");
    const result = normalizeCapture({
      source: "cmd-k",
      payload: { title: "Buy milk", notes: "oat", dueDate: due, projectId: "p1", businessId: "b1" },
    });
    expect(result).toEqual({ title: "Buy milk", notes: "oat", dueDate: due, projectId: "p1", businessId: "b1" });
  });

  it("throws on empty title", () => {
    expect(() =>
      normalizeCapture({ source: "cmd-k", payload: { title: "  " } })
    ).toThrow("title cannot be empty");
  });

  it("omits missing optional fields", () => {
    const result = normalizeCapture({ source: "cmd-k", payload: { title: "Task" } });
    expect(result.projectId).toBeUndefined();
    expect(result.dueDate).toBeUndefined();
    expect(result.notes).toBeUndefined();
    expect(result.businessId).toBeUndefined();
  });

  it("trims title whitespace", () => {
    const result = normalizeCapture({ source: "cmd-k", payload: { title: "  Trimmed  " } });
    expect(result.title).toBe("Trimmed");
  });

  it("passes contactId and companyId through", () => {
    const result = normalizeCapture({
      source: "cmd-k",
      payload: { title: "Call", contactId: "c1", companyId: "co1" },
    });
    expect(result.contactId).toBe("c1");
    expect(result.companyId).toBe("co1");
  });
});

describe("normalizeCapture — ios-shortcut", () => {
  it("always omits projectId and dueDate", () => {
    const result = normalizeCapture({
      source: "ios-shortcut",
      payload: { title: "Quick task", notes: "note" },
    });
    expect(result.projectId).toBeUndefined();
    expect(result.dueDate).toBeUndefined();
    expect(result.notes).toBe("note");
  });

  it("throws on empty title", () => {
    expect(() =>
      normalizeCapture({ source: "ios-shortcut", payload: { title: "" } })
    ).toThrow("title cannot be empty");
  });

  it("notes is optional", () => {
    const result = normalizeCapture({ source: "ios-shortcut", payload: { title: "Task" } });
    expect(result.notes).toBeUndefined();
  });
});

describe("normalizeCapture — right-click-graph", () => {
  it("contact entity sets contactId only", () => {
    const result = normalizeCapture({
      source: "right-click-graph",
      payload: { title: "Follow up", entityType: "contact", entityId: "c1" },
    });
    expect(result.contactId).toBe("c1");
    expect(result.companyId).toBeUndefined();
    expect(result.projectId).toBeUndefined();
  });

  it("company entity sets companyId only", () => {
    const result = normalizeCapture({
      source: "right-click-graph",
      payload: { title: "Meeting", entityType: "company", entityId: "co1" },
    });
    expect(result.companyId).toBe("co1");
    expect(result.contactId).toBeUndefined();
  });

  it("project entity sets projectId only", () => {
    const result = normalizeCapture({
      source: "right-click-graph",
      payload: { title: "Milestone", entityType: "project", entityId: "pr1" },
    });
    expect(result.projectId).toBe("pr1");
    expect(result.contactId).toBeUndefined();
  });

  it("throws on empty title", () => {
    expect(() =>
      normalizeCapture({
        source: "right-click-graph",
        payload: { title: "", entityType: "contact", entityId: "c1" },
      })
    ).toThrow("title cannot be empty");
  });
});
