import "server-only";

import { and, eq, isNull, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Db type — matches what createTestDb() and production drizzle() return */
type Db = ReturnType<typeof drizzle<typeof schema>>;

export type Task = typeof schema.tasks.$inferSelect;

export type TaskFilters = {
  /** null = inbox tasks (project_id IS NULL); string = filter by that projectId */
  projectId?: string | null;
  contactId?: string;
  companyId?: string;
  businessId?: string;
  /** false = open tasks only; true = completed only; undefined = both */
  completed?: boolean;
  /** due_date <= dueBefore */
  dueBefore?: Date;
  /** defer_date IS NULL OR defer_date <= deferredBefore */
  deferredBefore?: Date;
  /** null = top-level only (parent_task_id IS NULL); string = filter by parentTaskId */
  parentTaskId?: string | null;
};

export type CreateTaskInput = {
  title: string;
  notes?: string;
  projectId?: string;
  contactId?: string;
  companyId?: string;
  businessId?: string;
  deferDate?: Date;
  dueDate?: Date;
  parentTaskId?: string;
  recurrenceRule?: string;
};

export type UpdateTaskInput = Partial<CreateTaskInput>;

// ─── Validation helpers ────────────────────────────────────────────────────────

function assertTitle(title: string): void {
  if (!title || title.trim().length === 0) {
    throw new Error("title cannot be empty");
  }
}

async function assertParentOwnership(db: Db, userId: string, parentTaskId: string): Promise<void> {
  const rows = await db
    .select({ id: schema.tasks.id })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.id, parentTaskId), eq(schema.tasks.user_id, userId)))
    .limit(1);
  if (rows.length === 0) {
    throw new Error("parent_task_id not found or not owned by user");
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function listTasks(db: Db, userId: string, filters?: TaskFilters): Promise<Task[]> {
  const conditions = [eq(schema.tasks.user_id, userId)];

  if (filters) {
    // projectId: null → IS NULL; string → eq
    if (filters.projectId === null) {
      conditions.push(isNull(schema.tasks.project_id));
    } else if (filters.projectId !== undefined) {
      conditions.push(eq(schema.tasks.project_id, filters.projectId));
    }

    if (filters.contactId !== undefined) {
      conditions.push(eq(schema.tasks.contact_id, filters.contactId));
    }

    if (filters.companyId !== undefined) {
      conditions.push(eq(schema.tasks.company_id, filters.companyId));
    }

    if (filters.businessId !== undefined) {
      conditions.push(eq(schema.tasks.business_id, filters.businessId));
    }

    if (filters.completed === false) {
      conditions.push(isNull(schema.tasks.completed_at));
    } else if (filters.completed === true) {
      // completed_at IS NOT NULL — use lte with epoch as workaround isn't needed;
      // drizzle has isNotNull
      const { isNotNull } = await import("drizzle-orm");
      conditions.push(isNotNull(schema.tasks.completed_at));
    }

    if (filters.dueBefore !== undefined) {
      conditions.push(lte(schema.tasks.due_date, filters.dueBefore));
    }

    if (filters.deferredBefore !== undefined) {
      // defer_date IS NULL OR defer_date <= deferredBefore
      conditions.push(
        or(isNull(schema.tasks.defer_date), lte(schema.tasks.defer_date, filters.deferredBefore))!
      );
    }

    // parentTaskId: null → IS NULL; string → eq
    if (filters.parentTaskId === null) {
      conditions.push(isNull(schema.tasks.parent_task_id));
    } else if (filters.parentTaskId !== undefined) {
      conditions.push(eq(schema.tasks.parent_task_id, filters.parentTaskId));
    }
  }

  return db
    .select()
    .from(schema.tasks)
    .where(and(...conditions));
}

export async function getTask(db: Db, userId: string, id: string): Promise<Task | null> {
  const rows = await db
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.user_id, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createTask(db: Db, userId: string, input: CreateTaskInput): Promise<Task> {
  assertTitle(input.title);

  if (input.parentTaskId) {
    await assertParentOwnership(db, userId, input.parentTaskId);
  }

  const id = crypto.randomUUID();
  const now = new Date();

  const rows = await db
    .insert(schema.tasks)
    .values({
      id,
      user_id: userId,
      title: input.title.trim(),
      notes: input.notes ?? null,
      project_id: input.projectId ?? null,
      contact_id: input.contactId ?? null,
      company_id: input.companyId ?? null,
      business_id: input.businessId ?? null,
      defer_date: input.deferDate ?? null,
      due_date: input.dueDate ?? null,
      parent_task_id: input.parentTaskId ?? null,
      recurrence_rule: input.recurrenceRule ?? null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    })
    .returning();

  return rows[0];
}

export async function updateTask(
  db: Db,
  userId: string,
  id: string,
  patch: UpdateTaskInput
): Promise<Task | null> {
  // Check title if provided
  if (patch.title !== undefined) {
    assertTitle(patch.title);
  }

  // Check parent ownership if provided
  if (patch.parentTaskId !== undefined && patch.parentTaskId !== null) {
    await assertParentOwnership(db, userId, patch.parentTaskId);
  }

  const existing = await getTask(db, userId, id);
  if (!existing) return null;

  const updateFields: Partial<typeof schema.tasks.$inferInsert> = {
    updated_at: new Date(),
  };

  if (patch.title !== undefined) updateFields.title = patch.title.trim();
  if (patch.notes !== undefined) updateFields.notes = patch.notes;
  if (patch.projectId !== undefined) updateFields.project_id = patch.projectId;
  if (patch.contactId !== undefined) updateFields.contact_id = patch.contactId;
  if (patch.companyId !== undefined) updateFields.company_id = patch.companyId;
  if (patch.businessId !== undefined) updateFields.business_id = patch.businessId;
  if (patch.deferDate !== undefined) updateFields.defer_date = patch.deferDate;
  if (patch.dueDate !== undefined) updateFields.due_date = patch.dueDate;
  if (patch.parentTaskId !== undefined) updateFields.parent_task_id = patch.parentTaskId;
  if (patch.recurrenceRule !== undefined) updateFields.recurrence_rule = patch.recurrenceRule;

  const rows = await db
    .update(schema.tasks)
    .set(updateFields)
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.user_id, userId)))
    .returning();

  return rows[0] ?? null;
}

export async function deleteTask(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(schema.tasks)
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.user_id, userId)))
    .returning({ id: schema.tasks.id });
  return rows.length > 0;
}

// ─── Convenience ──────────────────────────────────────────────────────────────

/**
 * Marks a task as complete by setting completed_at = now().
 * Idempotent: if already completed, completed_at is NOT updated.
 * Does NOT spawn recurrence instances (deferred to Phase 3).
 */
export async function completeTask(db: Db, userId: string, id: string): Promise<Task | null> {
  const existing = await getTask(db, userId, id);
  if (!existing) return null;

  // Idempotent: already completed → return as-is
  if (existing.completed_at !== null) return existing;

  const rows = await db
    .update(schema.tasks)
    .set({ completed_at: new Date(), updated_at: new Date() })
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.user_id, userId)))
    .returning();

  return rows[0] ?? null;
}

/** Sets defer_date on a task. Caller is responsible for business rule validation. */
export async function deferTask(
  db: Db,
  userId: string,
  id: string,
  deferDate: Date
): Promise<Task | null> {
  const existing = await getTask(db, userId, id);
  if (!existing) return null;

  const rows = await db
    .update(schema.tasks)
    .set({ defer_date: deferDate, updated_at: new Date() })
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.user_id, userId)))
    .returning();

  return rows[0] ?? null;
}

// ─── Tree + entity queries ────────────────────────────────────────────────────

export async function listSubtasks(
  db: Db,
  userId: string,
  parentTaskId: string
): Promise<Task[]> {
  return db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.user_id, userId),
        eq(schema.tasks.parent_task_id, parentTaskId)
      )
    );
}

export async function listTasksByEntity(
  db: Db,
  userId: string,
  entityType: "contact" | "company" | "project" | "business",
  entityId: string
): Promise<Task[]> {
  const columnMap = {
    contact: schema.tasks.contact_id,
    company: schema.tasks.company_id,
    project: schema.tasks.project_id,
    business: schema.tasks.business_id,
  } as const;

  const col = columnMap[entityType];
  return db
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.user_id, userId), eq(col, entityId)));
}
