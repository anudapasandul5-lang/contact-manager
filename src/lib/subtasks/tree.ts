import type { Task } from "@/lib/repositories/tasks";

export type TaskNode = Task & { children: TaskNode[] };
export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Build a forest of TaskNodes from a flat task array.
 * Tasks whose `parent_task_id` is null OR refers to a missing task become roots.
 */
export function buildTree(tasks: Task[]): TaskNode[] {
  const nodeMap = new Map<string, TaskNode>();
  for (const t of tasks) {
    nodeMap.set(t.id, { ...t, children: [] });
  }
  const roots: TaskNode[] = [];
  for (const t of tasks) {
    const node = nodeMap.get(t.id)!;
    if (t.parent_task_id == null) {
      roots.push(node);
      continue;
    }
    const parent = nodeMap.get(t.parent_task_id);
    if (parent == null) {
      // orphan — promote to root
      roots.push(node);
    } else {
      parent.children.push(node);
    }
  }
  return roots;
}

/**
 * Returns true if making `proposedParentId` the parent of `childId` would create a cycle.
 *
 * Walks the ancestor chain of proposedParentId. If childId appears in the chain
 * (or proposedParentId == childId), returns true.
 */
export function detectCycle(
  tasks: Task[],
  proposedParentId: string,
  childId: string,
): boolean {
  if (proposedParentId === childId) return true;
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  let cursor: string | null = proposedParentId;
  const visited = new Set<string>();
  while (cursor != null) {
    if (cursor === childId) return true;
    if (visited.has(cursor)) return false; // existing cycle in data, not caused by our move
    visited.add(cursor);
    const next = taskMap.get(cursor);
    cursor = next?.parent_task_id ?? null;
  }
  return false;
}

/**
 * Validate a reparent operation. Pure check — does not mutate.
 *
 * Rejects:
 *   - taskId not in `tasks`
 *   - newParentId not in `tasks` (when not null)
 *   - newParentId == taskId (self-parent)
 *   - moving taskId under one of its own descendants (cycle)
 */
export function validateReparent(
  tasks: Task[],
  taskId: string,
  newParentId: string | null,
): ValidationResult {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  if (!taskMap.has(taskId)) {
    return { ok: false, error: "task not found" };
  }
  if (newParentId == null) {
    return { ok: true };
  }
  if (newParentId === taskId) {
    return { ok: false, error: "cannot parent task to itself" };
  }
  if (!taskMap.has(newParentId)) {
    return { ok: false, error: "parent not found" };
  }
  if (detectCycle(tasks, newParentId, taskId)) {
    return { ok: false, error: "cycle detected" };
  }
  return { ok: true };
}

/**
 * Returns all descendant task IDs of `parentId`, in DFS order.
 * Excludes parentId itself.
 */
export function propagateCompletion(tasks: Task[], parentId: string): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const t of tasks) {
    if (t.parent_task_id == null) continue;
    const arr = childrenByParent.get(t.parent_task_id) ?? [];
    arr.push(t.id);
    childrenByParent.set(t.parent_task_id, arr);
  }
  const out: string[] = [];
  const stack: string[] = [...(childrenByParent.get(parentId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    out.push(id);
    const grandkids = childrenByParent.get(id) ?? [];
    for (const g of grandkids) stack.push(g);
  }
  return out;
}
