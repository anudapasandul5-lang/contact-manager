import { describe, it, expect } from "vitest";
import {
  buildTree,
  detectCycle,
  validateReparent,
  propagateCompletion,
} from "./tree";
import type { Task } from "@/lib/repositories/tasks";

function makeTask(id: string, parentId: string | null = null): Task {
  return {
    id,
    user_id: "user-1",
    title: id,
    notes: null,
    project_id: null,
    contact_id: null,
    company_id: null,
    business_id: null,
    parent_task_id: parentId,
    defer_date: null,
    due_date: null,
    completed_at: null,
    recurrence_rule: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as Task;
}

describe("SubtaskTree — buildTree", () => {
  it("empty input → []", () => {
    expect(buildTree([])).toEqual([]);
  });

  it("single root → 1 node, no children", () => {
    const out = buildTree([makeTask("a")]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("a");
    expect(out[0].children).toEqual([]);
  });

  it("1 root + 2 children → 1 node with 2 children", () => {
    const tasks = [makeTask("a"), makeTask("b", "a"), makeTask("c", "a")];
    const out = buildTree(tasks);
    expect(out).toHaveLength(1);
    expect(out[0].children).toHaveLength(2);
    const childIds = out[0].children.map((c) => c.id).sort();
    expect(childIds).toEqual(["b", "c"]);
  });

  it("3-level tree (gp → p → c) correctly nested", () => {
    const tasks = [
      makeTask("gp"),
      makeTask("p", "gp"),
      makeTask("c", "p"),
    ];
    const out = buildTree(tasks);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("gp");
    expect(out[0].children).toHaveLength(1);
    expect(out[0].children[0].id).toBe("p");
    expect(out[0].children[0].children).toHaveLength(1);
    expect(out[0].children[0].children[0].id).toBe("c");
  });

  it("orphan (parent missing) promoted to root", () => {
    const tasks = [makeTask("orphan", "missing-parent")];
    const out = buildTree(tasks);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("orphan");
  });
});

describe("SubtaskTree — detectCycle", () => {
  it("self-cycle (proposedParent == childId) → true", () => {
    const tasks = [makeTask("a")];
    expect(detectCycle(tasks, "a", "a")).toBe(true);
  });

  it("direct cycle A→B, propose parent(A)=B → true", () => {
    const tasks = [makeTask("a"), makeTask("b", "a")];
    expect(detectCycle(tasks, "b", "a")).toBe(true);
  });

  it("3-level cycle A→B→C, propose parent(A)=C → true", () => {
    const tasks = [makeTask("a"), makeTask("b", "a"), makeTask("c", "b")];
    expect(detectCycle(tasks, "c", "a")).toBe(true);
  });

  it("independent subtrees → false", () => {
    const tasks = [
      makeTask("a"),
      makeTask("b", "a"),
      makeTask("c"),
      makeTask("d", "c"),
    ];
    expect(detectCycle(tasks, "c", "b")).toBe(false);
  });
});

describe("SubtaskTree — validateReparent", () => {
  it("newParentId == null → ok (move to top level)", () => {
    const tasks = [makeTask("a"), makeTask("b", "a")];
    expect(validateReparent(tasks, "b", null)).toEqual({ ok: true });
  });

  it("self-parent → not ok", () => {
    const tasks = [makeTask("a")];
    const r = validateReparent(tasks, "a", "a");
    expect(r.ok).toBe(false);
  });

  it("parent under descendant → not ok (cycle)", () => {
    const tasks = [makeTask("a"), makeTask("b", "a")];
    // try to make A's parent = B (B is A's child)
    const r = validateReparent(tasks, "a", "b");
    expect(r.ok).toBe(false);
  });

  it("parent missing → not ok", () => {
    const tasks = [makeTask("a")];
    const r = validateReparent(tasks, "a", "ghost");
    expect(r.ok).toBe(false);
  });

  it("task missing → not ok", () => {
    const tasks = [makeTask("a")];
    const r = validateReparent(tasks, "ghost", "a");
    expect(r.ok).toBe(false);
  });

  it("valid reparent (sibling subtree) → ok", () => {
    const tasks = [
      makeTask("a"),
      makeTask("b", "a"),
      makeTask("c"),
    ];
    // Move c under a
    expect(validateReparent(tasks, "c", "a")).toEqual({ ok: true });
  });
});

describe("SubtaskTree — propagateCompletion", () => {
  it("no descendants → []", () => {
    const tasks = [makeTask("a")];
    expect(propagateCompletion(tasks, "a")).toEqual([]);
  });

  it("returns all descendants in DFS order", () => {
    const tasks = [
      makeTask("a"),
      makeTask("b", "a"),
      makeTask("c", "b"),
      makeTask("d", "a"),
    ];
    const out = propagateCompletion(tasks, "a");
    expect(out.sort()).toEqual(["b", "c", "d"]);
  });
});
