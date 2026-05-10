import "server-only";

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type Db = ReturnType<typeof drizzle<typeof schema>>;

export type Business = typeof schema.businesses.$inferSelect;
export type EntityType = "contact" | "company" | "vendor";

export type CreateBusinessInput = {
  name: string;
  color?: string;
};

export type UpdateBusinessInput = Partial<CreateBusinessInput>;

// ─── Validation helpers ───────────────────────────────────────────────────────

function assertName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("name cannot be empty");
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function listBusinesses(db: Db, userId: string): Promise<Business[]> {
  return db
    .select()
    .from(schema.businesses)
    .where(eq(schema.businesses.user_id, userId))
    .orderBy(schema.businesses.created_at);
}

export async function getBusiness(db: Db, userId: string, id: string): Promise<Business | null> {
  const rows = await db
    .select()
    .from(schema.businesses)
    .where(and(eq(schema.businesses.id, id), eq(schema.businesses.user_id, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createBusiness(db: Db, userId: string, input: CreateBusinessInput): Promise<Business> {
  assertName(input.name);

  const id = crypto.randomUUID();

  const values: typeof schema.businesses.$inferInsert = {
    id,
    user_id: userId,
    name: input.name.trim(),
  };

  if (input.color !== undefined) {
    values.color = input.color;
  }

  const rows = await db
    .insert(schema.businesses)
    .values(values)
    .returning();

  return rows[0];
}

export async function updateBusiness(
  db: Db,
  userId: string,
  id: string,
  patch: UpdateBusinessInput
): Promise<Business | null> {
  if (patch.name !== undefined) {
    assertName(patch.name);
  }

  const existing = await getBusiness(db, userId, id);
  if (!existing) return null;

  const updateFields: Partial<typeof schema.businesses.$inferInsert> = {};

  if (patch.name !== undefined) updateFields.name = patch.name.trim();
  if (patch.color !== undefined) updateFields.color = patch.color;

  const rows = await db
    .update(schema.businesses)
    .set(updateFields)
    .where(and(eq(schema.businesses.id, id), eq(schema.businesses.user_id, userId)))
    .returning();

  return rows[0] ?? null;
}

export async function deleteBusiness(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(schema.businesses)
    .where(and(eq(schema.businesses.id, id), eq(schema.businesses.user_id, userId)))
    .returning({ id: schema.businesses.id });
  return rows.length > 0;
}

// ─── Junction helpers ─────────────────────────────────────────────────────────

/**
 * Verifies that both the entity AND the business belong to userId.
 * NOTE: SELECT-verify + INSERT/DELETE = 2 queries, no transaction.
 * TOCTOU race is acceptable for a single-user app.
 */
async function assertEntityAndBusinessOwnership(
  db: Db,
  userId: string,
  entityType: EntityType,
  entityId: string,
  businessId: string
): Promise<void> {
  // Verify business ownership
  const bizRows = await db
    .select({ id: schema.businesses.id })
    .from(schema.businesses)
    .where(and(eq(schema.businesses.id, businessId), eq(schema.businesses.user_id, userId)))
    .limit(1);

  if (bizRows.length === 0) {
    throw new Error("entity or business not found or not owned by user");
  }

  // Verify entity ownership — dispatch on static schema names (no dynamic table interpolation)
  switch (entityType) {
    case "contact": {
      const rows = await db
        .select({ id: schema.contacts.id })
        .from(schema.contacts)
        .where(and(eq(schema.contacts.id, entityId), eq(schema.contacts.user_id, userId)))
        .limit(1);
      if (rows.length === 0) throw new Error("entity or business not found or not owned by user");
      break;
    }
    case "company": {
      const rows = await db
        .select({ id: schema.companies.id })
        .from(schema.companies)
        .where(and(eq(schema.companies.id, entityId), eq(schema.companies.user_id, userId)))
        .limit(1);
      if (rows.length === 0) throw new Error("entity or business not found or not owned by user");
      break;
    }
    case "vendor": {
      const rows = await db
        .select({ id: schema.vendors.id })
        .from(schema.vendors)
        .where(and(eq(schema.vendors.id, entityId), eq(schema.vendors.user_id, userId)))
        .limit(1);
      if (rows.length === 0) throw new Error("entity or business not found or not owned by user");
      break;
    }
    default: {
      const _exhaustive: never = entityType;
      throw new Error(`Unknown entityType: ${_exhaustive}`);
    }
  }
}

// ─── Junction operations ──────────────────────────────────────────────────────

/**
 * Attaches an entity to a business via the appropriate junction table.
 * Idempotent: composite PK uses ON CONFLICT DO NOTHING.
 * NOTE: TOCTOU — ownership check + insert are 2 queries, no transaction (acceptable for single-user app).
 */
export async function attachEntityToBusiness(
  db: Db,
  userId: string,
  entityType: EntityType,
  entityId: string,
  businessId: string
): Promise<void> {
  await assertEntityAndBusinessOwnership(db, userId, entityType, entityId, businessId);

  switch (entityType) {
    case "contact":
      await db
        .insert(schema.contactBusinesses)
        .values({ contact_id: entityId, business_id: businessId })
        .onConflictDoNothing();
      break;
    case "company":
      await db
        .insert(schema.companyBusinesses)
        .values({ company_id: entityId, business_id: businessId })
        .onConflictDoNothing();
      break;
    case "vendor":
      await db
        .insert(schema.vendorBusinesses)
        .values({ vendor_id: entityId, business_id: businessId })
        .onConflictDoNothing();
      break;
    default: {
      const _exhaustive: never = entityType;
      throw new Error(`Unknown entityType: ${_exhaustive}`);
    }
  }
}

/**
 * Detaches an entity from a business.
 * Idempotent: DELETE on non-existent row = no-op.
 * NOTE: TOCTOU — ownership check + delete are 2 queries, no transaction (acceptable for single-user app).
 */
export async function detachEntityFromBusiness(
  db: Db,
  userId: string,
  entityType: EntityType,
  entityId: string,
  businessId: string
): Promise<void> {
  await assertEntityAndBusinessOwnership(db, userId, entityType, entityId, businessId);

  switch (entityType) {
    case "contact":
      await db
        .delete(schema.contactBusinesses)
        .where(
          and(
            eq(schema.contactBusinesses.contact_id, entityId),
            eq(schema.contactBusinesses.business_id, businessId)
          )
        );
      break;
    case "company":
      await db
        .delete(schema.companyBusinesses)
        .where(
          and(
            eq(schema.companyBusinesses.company_id, entityId),
            eq(schema.companyBusinesses.business_id, businessId)
          )
        );
      break;
    case "vendor":
      await db
        .delete(schema.vendorBusinesses)
        .where(
          and(
            eq(schema.vendorBusinesses.vendor_id, entityId),
            eq(schema.vendorBusinesses.business_id, businessId)
          )
        );
      break;
    default: {
      const _exhaustive: never = entityType;
      throw new Error(`Unknown entityType: ${_exhaustive}`);
    }
  }
}

/** Returns all businesses attached to a given entity. */
export async function listBusinessesForEntity(
  db: Db,
  userId: string,
  entityType: EntityType,
  entityId: string
): Promise<Business[]> {
  switch (entityType) {
    case "contact":
      return db
        .select({ id: schema.businesses.id, user_id: schema.businesses.user_id, name: schema.businesses.name, color: schema.businesses.color, created_at: schema.businesses.created_at })
        .from(schema.contactBusinesses)
        .innerJoin(schema.businesses, eq(schema.contactBusinesses.business_id, schema.businesses.id))
        .where(
          and(
            eq(schema.contactBusinesses.contact_id, entityId),
            eq(schema.businesses.user_id, userId)
          )
        );
    case "company":
      return db
        .select({ id: schema.businesses.id, user_id: schema.businesses.user_id, name: schema.businesses.name, color: schema.businesses.color, created_at: schema.businesses.created_at })
        .from(schema.companyBusinesses)
        .innerJoin(schema.businesses, eq(schema.companyBusinesses.business_id, schema.businesses.id))
        .where(
          and(
            eq(schema.companyBusinesses.company_id, entityId),
            eq(schema.businesses.user_id, userId)
          )
        );
    case "vendor":
      return db
        .select({ id: schema.businesses.id, user_id: schema.businesses.user_id, name: schema.businesses.name, color: schema.businesses.color, created_at: schema.businesses.created_at })
        .from(schema.vendorBusinesses)
        .innerJoin(schema.businesses, eq(schema.vendorBusinesses.business_id, schema.businesses.id))
        .where(
          and(
            eq(schema.vendorBusinesses.vendor_id, entityId),
            eq(schema.businesses.user_id, userId)
          )
        );
    default: {
      const _exhaustive: never = entityType;
      throw new Error(`Unknown entityType: ${_exhaustive}`);
    }
  }
}

/**
 * Returns all entities of the given type attached to a business.
 * Uses a single JOIN query (junction → entity table) — NOT a loop.
 */
export async function listEntitiesForBusiness(
  db: Db,
  userId: string,
  businessId: string,
  entityType: EntityType
): Promise<Array<{ id: string; name: string }>> {
  switch (entityType) {
    case "contact":
      return db
        .select({ id: schema.contacts.id, name: schema.contacts.name })
        .from(schema.contactBusinesses)
        .innerJoin(schema.contacts, eq(schema.contactBusinesses.contact_id, schema.contacts.id))
        .where(
          and(
            eq(schema.contactBusinesses.business_id, businessId),
            eq(schema.contacts.user_id, userId)
          )
        );
    case "company":
      return db
        .select({ id: schema.companies.id, name: schema.companies.name })
        .from(schema.companyBusinesses)
        .innerJoin(schema.companies, eq(schema.companyBusinesses.company_id, schema.companies.id))
        .where(
          and(
            eq(schema.companyBusinesses.business_id, businessId),
            eq(schema.companies.user_id, userId)
          )
        );
    case "vendor":
      return db
        .select({ id: schema.vendors.id, name: schema.vendors.name })
        .from(schema.vendorBusinesses)
        .innerJoin(schema.vendors, eq(schema.vendorBusinesses.vendor_id, schema.vendors.id))
        .where(
          and(
            eq(schema.vendorBusinesses.business_id, businessId),
            eq(schema.vendors.user_id, userId)
          )
        );
    default: {
      const _exhaustive: never = entityType;
      throw new Error(`Unknown entityType: ${_exhaustive}`);
    }
  }
}
