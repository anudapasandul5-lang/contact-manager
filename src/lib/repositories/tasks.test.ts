import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, teardownTestDb } from "@/lib/test/db-helper";
import * as schema from "@/lib/db/schema";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  deferTask,
  listSubtasks,
  listTasksByEntity,
} from "./tasks";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

describe("TaskRepository", () => {
  let db: TestDb["db"];
  let client: TestDb["client"];
  let userId: string;

  beforeEach(async () => {
    ({ db, client } = await createTestDb());
    userId = `test-user-${crypto.randomUUID()}`;
  });

  afterEach(async () => {
    // Clean up in FK order: tasks first (self-ref: set parent null first)
    await db
      .update(schema.tasks)
      .set({ parent_task_id: null })
      .where(eq(schema.tasks.user_id, userId));
    await db.delete(schema.tasks).where(eq(schema.tasks.user_id, userId));
    await db.delete(schema.businesses).where(eq(schema.businesses.user_id, userId));
    // contacts/companies/projects cascade via FK onDelete: set null on tasks, so delete tasks first
    // but contacts/companies/projects have user_id — clean them up too
    await db.delete(schema.contacts).where(eq(schema.contacts.user_id, userId));
    await db.delete(schema.companies).where(eq(schema.companies.user_id, userId));
    await db.delete(schema.projects).where(eq(schema.projects.user_id, userId));
    await teardownTestDb(client);
  });

  // ─── Batch 1: CRUD round-trip ──────────────────────────────────────────────

  it("1. createTask returns task with id and correct user_id, defaults applied", async () => {
    const task = await createTask(db, userId, { title: "Buy milk" });
    expect(task.id).toBeTruthy();
    expect(task.user_id).toBe(userId);
    expect(task.title).toBe("Buy milk");
    expect(task.completed_at).toBeNull();
    expect(task.project_id).toBeNull();
    expect(task.contact_id).toBeNull();
    expect(task.parent_task_id).toBeNull();
  });

  it("2. getTask returns the created task", async () => {
    const created = await createTask(db, userId, { title: "Read book" });
    const fetched = await getTask(db, userId, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.title).toBe("Read book");
  });

  it("3. getTask returns null for non-existent id", async () => {
    const result = await getTask(db, userId, crypto.randomUUID());
    expect(result).toBeNull();
  });

  it("4. getTask returns null when id exists but user_id doesn't match (cross-user isolation)", async () => {
    const task = await createTask(db, userId, { title: "Private task" });
    const otherUserId = `test-user-${crypto.randomUUID()}`;
    const result = await getTask(db, otherUserId, task.id);
    expect(result).toBeNull();
  });

  it("5. updateTask patches scalar fields and bumps updated_at", async () => {
    const task = await createTask(db, userId, { title: "Original" });
    const originalUpdatedAt = task.updated_at;
    // Small delay to ensure updated_at differs
    await new Promise((r) => setTimeout(r, 10));
    const updated = await updateTask(db, userId, task.id, { title: "Updated", notes: "Note" });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("Updated");
    expect(updated!.notes).toBe("Note");
    expect(updated!.updated_at.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
  });

  it("6. updateTask returns null when id doesn't exist for that user", async () => {
    const result = await updateTask(db, userId, crypto.randomUUID(), { title: "Ghost" });
    expect(result).toBeNull();
  });

  it("7. deleteTask removes the row and returns true; returns false if not found", async () => {
    const task = await createTask(db, userId, { title: "Delete me" });
    const deleted = await deleteTask(db, userId, task.id);
    expect(deleted).toBe(true);
    const fetched = await getTask(db, userId, task.id);
    expect(fetched).toBeNull();

    const deletedAgain = await deleteTask(db, userId, task.id);
    expect(deletedAgain).toBe(false);
  });

  it("8. listTasks with no filters returns all tasks for user_id", async () => {
    await createTask(db, userId, { title: "Task A" });
    await createTask(db, userId, { title: "Task B" });
    await createTask(db, userId, { title: "Task C" });
    const tasks = await listTasks(db, userId);
    expect(tasks.length).toBe(3);
    expect(tasks.every((t) => t.user_id === userId)).toBe(true);
  });

  // ─── Batch 2: Filters ─────────────────────────────────────────────────────

  it("9. listTasks completed: false excludes completed tasks", async () => {
    const open = await createTask(db, userId, { title: "Open" });
    const done = await createTask(db, userId, { title: "Done" });
    await completeTask(db, userId, done.id);
    const tasks = await listTasks(db, userId, { completed: false });
    expect(tasks.some((t) => t.id === open.id)).toBe(true);
    expect(tasks.some((t) => t.id === done.id)).toBe(false);
  });

  it("10. listTasks completed: true excludes open tasks", async () => {
    const open = await createTask(db, userId, { title: "Open" });
    const done = await createTask(db, userId, { title: "Done" });
    await completeTask(db, userId, done.id);
    const tasks = await listTasks(db, userId, { completed: true });
    expect(tasks.some((t) => t.id === done.id)).toBe(true);
    expect(tasks.some((t) => t.id === open.id)).toBe(false);
  });

  it("11. listTasks projectId: 'X' filters by project", async () => {
    const projectId = `proj-${crypto.randomUUID()}`;
    await db.insert(schema.projects).values({ id: projectId, name: "Proj", user_id: userId });
    const withProject = await createTask(db, userId, { title: "With project", projectId });
    await createTask(db, userId, { title: "Without project" });
    const tasks = await listTasks(db, userId, { projectId });
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(withProject.id);
  });

  it("12. listTasks projectId: null returns inbox (project_id IS NULL)", async () => {
    const projectId = `proj-${crypto.randomUUID()}`;
    await db.insert(schema.projects).values({ id: projectId, name: "Proj", user_id: userId });
    await createTask(db, userId, { title: "With project", projectId });
    const inbox = await createTask(db, userId, { title: "Inbox task" });
    const tasks = await listTasks(db, userId, { projectId: null });
    expect(tasks.some((t) => t.id === inbox.id)).toBe(true);
    expect(tasks.every((t) => t.project_id === null)).toBe(true);
  });

  it("13. listTasks businessId filter", async () => {
    const businessId = `biz-${crypto.randomUUID()}`;
    await db.insert(schema.businesses).values({ id: businessId, name: "Biz", user_id: userId });
    const withBiz = await createTask(db, userId, { title: "Biz task", businessId });
    await createTask(db, userId, { title: "No biz" });
    const tasks = await listTasks(db, userId, { businessId });
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(withBiz.id);
  });

  it("14. listTasks contactId filter", async () => {
    const contactId = `cont-${crypto.randomUUID()}`;
    await db.insert(schema.contacts).values({ id: contactId, name: "Alice", type: "employee", user_id: userId });
    const withContact = await createTask(db, userId, { title: "Contact task", contactId });
    await createTask(db, userId, { title: "No contact" });
    const tasks = await listTasks(db, userId, { contactId });
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(withContact.id);
  });

  it("15. listTasks companyId filter", async () => {
    const companyId = `comp-${crypto.randomUUID()}`;
    await db.insert(schema.companies).values({ id: companyId, name: "Acme", industry: "Tech", user_id: userId });
    const withCompany = await createTask(db, userId, { title: "Company task", companyId });
    await createTask(db, userId, { title: "No company" });
    const tasks = await listTasks(db, userId, { companyId });
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(withCompany.id);
  });

  it("16. listTasks dueBefore filter", async () => {
    const past = new Date("2020-01-01");
    const future = new Date("2099-01-01");
    const overdue = await createTask(db, userId, { title: "Overdue", dueDate: past });
    await createTask(db, userId, { title: "Future", dueDate: future });
    await createTask(db, userId, { title: "No due date" });
    const cutoff = new Date("2025-01-01");
    const tasks = await listTasks(db, userId, { dueBefore: cutoff });
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(overdue.id);
  });

  it("17. listTasks deferredBefore includes tasks where defer_date IS NULL", async () => {
    const nullDefer = await createTask(db, userId, { title: "No defer" });
    const pastDefer = await createTask(db, userId, { title: "Past defer", deferDate: new Date("2020-01-01") });
    const futureDefer = await createTask(db, userId, { title: "Future defer", deferDate: new Date("2099-01-01") });
    const cutoff = new Date("2025-01-01");
    const tasks = await listTasks(db, userId, { deferredBefore: cutoff });
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain(nullDefer.id);
    expect(ids).toContain(pastDefer.id);
    expect(ids).not.toContain(futureDefer.id);
  });

  it("18. listTasks parentTaskId: null returns only top-level tasks", async () => {
    const parent = await createTask(db, userId, { title: "Parent" });
    await createTask(db, userId, { title: "Child", parentTaskId: parent.id });
    const topLevel = await listTasks(db, userId, { parentTaskId: null });
    expect(topLevel.some((t) => t.id === parent.id)).toBe(true);
    expect(topLevel.every((t) => t.parent_task_id === null)).toBe(true);
  });

  // ─── Batch 3: Cross-user isolation ────────────────────────────────────────

  it("19. User A's tasks NOT in listTasks for User B", async () => {
    const userB = `test-user-${crypto.randomUUID()}`;
    await createTask(db, userId, { title: "User A task" });
    const tasksB = await listTasks(db, userB);
    expect(tasksB.length).toBe(0);
  });

  it("20. User A cannot updateTask on User B's task → returns null", async () => {
    const userB = `test-user-${crypto.randomUUID()}`;
    const taskB = await createTask(db, userB, { title: "User B task" });
    const result = await updateTask(db, userId, taskB.id, { title: "Hacked" });
    expect(result).toBeNull();
    // Cleanup userB task
    await db.delete(schema.tasks).where(eq(schema.tasks.id, taskB.id));
  });

  it("21. User A cannot deleteTask on User B's task → returns false", async () => {
    const userB = `test-user-${crypto.randomUUID()}`;
    const taskB = await createTask(db, userB, { title: "User B task" });
    const result = await deleteTask(db, userId, taskB.id);
    expect(result).toBe(false);
    // Confirm it still exists
    const stillThere = await getTask(db, userB, taskB.id);
    expect(stillThere).not.toBeNull();
    // Cleanup userB task
    await db.delete(schema.tasks).where(eq(schema.tasks.id, taskB.id));
  });

  // ─── Batch 4: Convenience ─────────────────────────────────────────────────

  it("22. completeTask sets completed_at", async () => {
    const task = await createTask(db, userId, { title: "Do it" });
    expect(task.completed_at).toBeNull();
    const completed = await completeTask(db, userId, task.id);
    expect(completed).not.toBeNull();
    expect(completed!.completed_at).toBeInstanceOf(Date);
  });

  it("23. completeTask is idempotent", async () => {
    const task = await createTask(db, userId, { title: "Do it" });
    const first = await completeTask(db, userId, task.id);
    const firstTime = first!.completed_at!.getTime();
    await new Promise((r) => setTimeout(r, 20));
    const second = await completeTask(db, userId, task.id);
    // completed_at must not change on second call
    expect(second!.completed_at!.getTime()).toBe(firstTime);
  });

  it("24. deferTask sets defer_date", async () => {
    const task = await createTask(db, userId, { title: "Not yet" });
    const deferDate = new Date("2099-12-31");
    const deferred = await deferTask(db, userId, task.id, deferDate);
    expect(deferred).not.toBeNull();
    expect(deferred!.defer_date).toBeInstanceOf(Date);
    expect(deferred!.defer_date!.getFullYear()).toBe(2099);
  });

  // ─── Batch 5: Tree + entity ───────────────────────────────────────────────

  it("25. listSubtasks returns children of parent", async () => {
    const parent = await createTask(db, userId, { title: "Parent" });
    const child1 = await createTask(db, userId, { title: "Child 1", parentTaskId: parent.id });
    const child2 = await createTask(db, userId, { title: "Child 2", parentTaskId: parent.id });
    await createTask(db, userId, { title: "Unrelated" });
    const subtasks = await listSubtasks(db, userId, parent.id);
    expect(subtasks.length).toBe(2);
    const ids = subtasks.map((t) => t.id);
    expect(ids).toContain(child1.id);
    expect(ids).toContain(child2.id);
  });

  it("26. listSubtasks returns empty for parent with no children", async () => {
    const parent = await createTask(db, userId, { title: "Lone parent" });
    const subtasks = await listSubtasks(db, userId, parent.id);
    expect(subtasks).toEqual([]);
  });

  it("27. listTasksByEntity('contact', id) returns tasks linked to that contact", async () => {
    const contactId = `cont-${crypto.randomUUID()}`;
    await db.insert(schema.contacts).values({ id: contactId, name: "Bob", type: "employee", user_id: userId });
    const linked = await createTask(db, userId, { title: "Contact task", contactId });
    await createTask(db, userId, { title: "Unlinked" });
    const tasks = await listTasksByEntity(db, userId, "contact", contactId);
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(linked.id);
  });

  it("28. listTasksByEntity('business', id) returns tasks linked to that business", async () => {
    const businessId = `biz-${crypto.randomUUID()}`;
    await db.insert(schema.businesses).values({ id: businessId, name: "MyBiz", user_id: userId });
    const linked = await createTask(db, userId, { title: "Biz task", businessId });
    await createTask(db, userId, { title: "Unlinked" });
    const tasks = await listTasksByEntity(db, userId, "business", businessId);
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(linked.id);
  });

  // ─── Batch 6: Cascade FK behavior ─────────────────────────────────────────

  it("29. Deleting linked project sets task.project_id to null (does not delete task)", async () => {
    const projectId = `proj-${crypto.randomUUID()}`;
    await db.insert(schema.projects).values({ id: projectId, name: "Doomed project", user_id: userId });
    const task = await createTask(db, userId, { title: "Task with project", projectId });
    expect(task.project_id).toBe(projectId);

    // Delete the project
    await db.delete(schema.projects).where(eq(schema.projects.id, projectId));

    const refetched = await getTask(db, userId, task.id);
    expect(refetched).not.toBeNull();
    expect(refetched!.project_id).toBeNull();
  });

  it("30. Deleting linked contact sets task.contact_id to null (does not delete task)", async () => {
    const contactId = `cont-${crypto.randomUUID()}`;
    await db.insert(schema.contacts).values({ id: contactId, name: "Eve", type: "employee", user_id: userId });
    const task = await createTask(db, userId, { title: "Task with contact", contactId });
    expect(task.contact_id).toBe(contactId);

    // Delete the contact
    await db.delete(schema.contacts).where(eq(schema.contacts.id, contactId));

    const refetched = await getTask(db, userId, task.id);
    expect(refetched).not.toBeNull();
    expect(refetched!.contact_id).toBeNull();
  });

  // ─── Batch 7: Validation + ownership ─────────────────────────────────────

  it("31. createTask rejects empty title", async () => {
    await expect(createTask(db, userId, { title: "" })).rejects.toThrow("title cannot be empty");
  });

  it("32. createTask rejects whitespace-only title", async () => {
    await expect(createTask(db, userId, { title: "   " })).rejects.toThrow("title cannot be empty");
  });

  it("33. updateTask rejects empty title patch", async () => {
    const task = await createTask(db, userId, { title: "Valid" });
    await expect(updateTask(db, userId, task.id, { title: "" })).rejects.toThrow("title cannot be empty");
  });

  it("34. createTask rejects parent_task_id from another user", async () => {
    const userB = `test-user-${crypto.randomUUID()}`;
    const taskB = await createTask(db, userB, { title: "User B's task" });
    await expect(
      createTask(db, userId, { title: "Hijack attempt", parentTaskId: taskB.id })
    ).rejects.toThrow("parent_task_id not found or not owned by user");
    // Cleanup userB task
    await db.delete(schema.tasks).where(eq(schema.tasks.id, taskB.id));
  });
});
