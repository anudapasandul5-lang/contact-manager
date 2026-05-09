import "server-only";

import * as schema from "@/lib/db/schema";
import { drizzle } from "drizzle-orm/postgres-js";

type Db = ReturnType<typeof drizzle<typeof schema>>;

export type Business = typeof schema.businesses.$inferSelect;
export type EntityType = "contact" | "company" | "vendor";

export type CreateBusinessInput = {
  name: string;
  color?: string;
};

export type UpdateBusinessInput = Partial<CreateBusinessInput>;

export async function listBusinesses(db: Db, userId: string): Promise<Business[]> {
  throw new Error("not implemented");
}

export async function getBusiness(db: Db, userId: string, id: string): Promise<Business | null> {
  throw new Error("not implemented");
}

export async function createBusiness(db: Db, userId: string, input: CreateBusinessInput): Promise<Business> {
  throw new Error("not implemented");
}

export async function updateBusiness(db: Db, userId: string, id: string, patch: UpdateBusinessInput): Promise<Business | null> {
  throw new Error("not implemented");
}

export async function deleteBusiness(db: Db, userId: string, id: string): Promise<boolean> {
  throw new Error("not implemented");
}

export async function attachEntityToBusiness(
  db: Db, userId: string, entityType: EntityType, entityId: string, businessId: string
): Promise<void> {
  throw new Error("not implemented");
}

export async function detachEntityFromBusiness(
  db: Db, userId: string, entityType: EntityType, entityId: string, businessId: string
): Promise<void> {
  throw new Error("not implemented");
}

export async function listBusinessesForEntity(
  db: Db, userId: string, entityType: EntityType, entityId: string
): Promise<Business[]> {
  throw new Error("not implemented");
}

export async function listEntitiesForBusiness(
  db: Db, userId: string, businessId: string, entityType: EntityType
): Promise<Array<{ id: string; name: string }>> {
  throw new Error("not implemented");
}
