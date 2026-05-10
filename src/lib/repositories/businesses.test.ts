import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, teardownTestDb } from "@/lib/test/db-helper";
import * as schema from "@/lib/db/schema";
import {
  listBusinesses,
  getBusiness,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  attachEntityToBusiness,
  detachEntityFromBusiness,
  listBusinessesForEntity,
  listEntitiesForBusiness,
} from "./businesses";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

describe("BusinessRegistry", () => {
  let db: TestDb["db"];
  let client: TestDb["client"];
  let userId: string;

  beforeEach(async () => {
    ({ db, client } = await createTestDb());
    userId = `test-user-${crypto.randomUUID()}`;
  });

  afterEach(async () => {
    // Delete contacts/companies/vendors first — their deletion cascades junction rows via FK.
    // Then delete businesses (cascade removes any remaining junction rows).
    await db.delete(schema.contacts).where(eq(schema.contacts.user_id, userId));
    await db.delete(schema.companies).where(eq(schema.companies.user_id, userId));
    await db.delete(schema.vendors).where(eq(schema.vendors.user_id, userId));
    // Deleting businesses cascades to all 3 junction tables (ON DELETE CASCADE)
    await db.delete(schema.businesses).where(eq(schema.businesses.user_id, userId));
    await teardownTestDb(client);
  });

  // ─── Batch 1: CRUD round-trip ─────────────────────────────────────────────

  it("1. createBusiness returns business with id and default color applied", async () => {
    const biz = await createBusiness(db, userId, { name: "Acme Corp" });
    expect(biz.id).toBeTruthy();
    expect(biz.user_id).toBe(userId);
    expect(biz.name).toBe("Acme Corp");
    expect(biz.color).toBe("#6b7280");
  });

  it("2. createBusiness with explicit color uses that color", async () => {
    const biz = await createBusiness(db, userId, { name: "Bright Co", color: "#ff0000" });
    expect(biz.color).toBe("#ff0000");
  });

  it("3. createBusiness rejects empty name", async () => {
    await expect(createBusiness(db, userId, { name: "" })).rejects.toThrow("name cannot be empty");
  });

  it("4. createBusiness rejects whitespace-only name", async () => {
    await expect(createBusiness(db, userId, { name: "   " })).rejects.toThrow("name cannot be empty");
  });

  it("5. getBusiness returns the created business", async () => {
    const created = await createBusiness(db, userId, { name: "Fetch Me" });
    const fetched = await getBusiness(db, userId, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.name).toBe("Fetch Me");
  });

  it("6. getBusiness returns null for non-existent id", async () => {
    const result = await getBusiness(db, userId, crypto.randomUUID());
    expect(result).toBeNull();
  });

  it("7. getBusiness returns null for cross-user id", async () => {
    const biz = await createBusiness(db, userId, { name: "Private" });
    const otherUser = `test-user-${crypto.randomUUID()}`;
    const result = await getBusiness(db, otherUser, biz.id);
    expect(result).toBeNull();
  });

  it("8. updateBusiness patches name and/or color", async () => {
    const biz = await createBusiness(db, userId, { name: "Original" });
    const updated = await updateBusiness(db, userId, biz.id, { name: "Updated", color: "#00ff00" });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Updated");
    expect(updated!.color).toBe("#00ff00");
  });

  it("9. updateBusiness returns null for cross-user id", async () => {
    const biz = await createBusiness(db, userId, { name: "Mine" });
    const otherUser = `test-user-${crypto.randomUUID()}`;
    const result = await updateBusiness(db, otherUser, biz.id, { name: "Hacked" });
    expect(result).toBeNull();
  });

  it("10. updateBusiness rejects empty name patch", async () => {
    const biz = await createBusiness(db, userId, { name: "Valid" });
    await expect(updateBusiness(db, userId, biz.id, { name: "" })).rejects.toThrow("name cannot be empty");
  });

  it("11. deleteBusiness removes the row, returns true; false for non-existent", async () => {
    const biz = await createBusiness(db, userId, { name: "Delete Me" });
    const deleted = await deleteBusiness(db, userId, biz.id);
    expect(deleted).toBe(true);
    const fetched = await getBusiness(db, userId, biz.id);
    expect(fetched).toBeNull();

    const deletedAgain = await deleteBusiness(db, userId, biz.id);
    expect(deletedAgain).toBe(false);
  });

  it("12. deleteBusiness returns false for cross-user id", async () => {
    const biz = await createBusiness(db, userId, { name: "Mine" });
    const otherUser = `test-user-${crypto.randomUUID()}`;
    const result = await deleteBusiness(db, otherUser, biz.id);
    expect(result).toBe(false);
    // Original still exists
    expect(await getBusiness(db, userId, biz.id)).not.toBeNull();
  });

  it("13. listBusinesses returns all for userId with consistent ordering", async () => {
    await createBusiness(db, userId, { name: "Alpha" });
    await createBusiness(db, userId, { name: "Beta" });
    await createBusiness(db, userId, { name: "Gamma" });
    const list = await listBusinesses(db, userId);
    expect(list.length).toBe(3);
    expect(list.every((b) => b.user_id === userId)).toBe(true);
  });

  // ─── Batch 2: Junction — contact ─────────────────────────────────────────

  it("14. attach creates contact_businesses junction row", async () => {
    const contactId = `cont-${crypto.randomUUID()}`;
    await db.insert(schema.contacts).values({ id: contactId, name: "Alice", type: "employee", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Biz A" });

    await attachEntityToBusiness(db, userId, "contact", contactId, biz.id);

    const rows = await db.select().from(schema.contactBusinesses)
      .where(eq(schema.contactBusinesses.contact_id, contactId));
    expect(rows.length).toBe(1);
    expect(rows[0].business_id).toBe(biz.id);
  });

  it("15. attach contact is idempotent (second call does not throw)", async () => {
    const contactId = `cont-${crypto.randomUUID()}`;
    await db.insert(schema.contacts).values({ id: contactId, name: "Bob", type: "employee", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Biz B" });

    await attachEntityToBusiness(db, userId, "contact", contactId, biz.id);
    // Second call should not throw (idempotent via ON CONFLICT DO NOTHING)
    await attachEntityToBusiness(db, userId, "contact", contactId, biz.id);

    const rows = await db.select().from(schema.contactBusinesses)
      .where(eq(schema.contactBusinesses.contact_id, contactId));
    expect(rows.length).toBe(1);
  });

  it("16. attach rejects when contact belongs to different user", async () => {
    const otherUser = `test-user-${crypto.randomUUID()}`;
    const contactId = `cont-${crypto.randomUUID()}`;
    await db.insert(schema.contacts).values({ id: contactId, name: "Eve", type: "employee", user_id: otherUser });
    const biz = await createBusiness(db, userId, { name: "Biz C" });

    await expect(
      attachEntityToBusiness(db, userId, "contact", contactId, biz.id)
    ).rejects.toThrow("entity or business not found or not owned by user");

    // cleanup
    await db.delete(schema.contacts).where(eq(schema.contacts.id, contactId));
  });

  it("17. attach rejects when business belongs to different user", async () => {
    const contactId = `cont-${crypto.randomUUID()}`;
    await db.insert(schema.contacts).values({ id: contactId, name: "Carol", type: "employee", user_id: userId });
    const otherUser = `test-user-${crypto.randomUUID()}`;
    const otherBiz = await createBusiness(db, otherUser, { name: "Other Biz" });

    await expect(
      attachEntityToBusiness(db, userId, "contact", contactId, otherBiz.id)
    ).rejects.toThrow("entity or business not found or not owned by user");

    // cleanup
    await db.delete(schema.businesses).where(eq(schema.businesses.id, otherBiz.id));
  });

  it("18. detach contact removes junction row; idempotent on second call", async () => {
    const contactId = `cont-${crypto.randomUUID()}`;
    await db.insert(schema.contacts).values({ id: contactId, name: "Dan", type: "employee", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Biz D" });
    await attachEntityToBusiness(db, userId, "contact", contactId, biz.id);

    await detachEntityFromBusiness(db, userId, "contact", contactId, biz.id);

    const rows = await db.select().from(schema.contactBusinesses)
      .where(eq(schema.contactBusinesses.contact_id, contactId));
    expect(rows.length).toBe(0);

    // Idempotent: second detach should not throw
    await detachEntityFromBusiness(db, userId, "contact", contactId, biz.id);
  });

  // ─── Batch 3: Junction — company ─────────────────────────────────────────

  it("19. attach creates company_businesses junction row", async () => {
    const companyId = `comp-${crypto.randomUUID()}`;
    await db.insert(schema.companies).values({ id: companyId, name: "Acme", industry: "Tech", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Biz E" });

    await attachEntityToBusiness(db, userId, "company", companyId, biz.id);

    const rows = await db.select().from(schema.companyBusinesses)
      .where(eq(schema.companyBusinesses.company_id, companyId));
    expect(rows.length).toBe(1);
    expect(rows[0].business_id).toBe(biz.id);
  });

  it("20. attach company is idempotent", async () => {
    const companyId = `comp-${crypto.randomUUID()}`;
    await db.insert(schema.companies).values({ id: companyId, name: "Acme2", industry: "Tech", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Biz F" });

    await attachEntityToBusiness(db, userId, "company", companyId, biz.id);
    // Second call should not throw (idempotent)
    await attachEntityToBusiness(db, userId, "company", companyId, biz.id);

    const rows = await db.select().from(schema.companyBusinesses)
      .where(eq(schema.companyBusinesses.company_id, companyId));
    expect(rows.length).toBe(1);
  });

  it("21. attach rejects when company belongs to different user", async () => {
    const otherUser = `test-user-${crypto.randomUUID()}`;
    const companyId = `comp-${crypto.randomUUID()}`;
    await db.insert(schema.companies).values({ id: companyId, name: "OtherCo", industry: "Fin", user_id: otherUser });
    const biz = await createBusiness(db, userId, { name: "Biz G" });

    await expect(
      attachEntityToBusiness(db, userId, "company", companyId, biz.id)
    ).rejects.toThrow("entity or business not found or not owned by user");

    await db.delete(schema.companies).where(eq(schema.companies.id, companyId));
  });

  it("22. attach company rejects when business belongs to different user", async () => {
    const companyId = `comp-${crypto.randomUUID()}`;
    await db.insert(schema.companies).values({ id: companyId, name: "MyCo", industry: "Tech", user_id: userId });
    const otherUser = `test-user-${crypto.randomUUID()}`;
    const otherBiz = await createBusiness(db, otherUser, { name: "Other Biz" });

    await expect(
      attachEntityToBusiness(db, userId, "company", companyId, otherBiz.id)
    ).rejects.toThrow("entity or business not found or not owned by user");

    await db.delete(schema.businesses).where(eq(schema.businesses.id, otherBiz.id));
  });

  it("23. detach company removes junction row; idempotent", async () => {
    const companyId = `comp-${crypto.randomUUID()}`;
    await db.insert(schema.companies).values({ id: companyId, name: "Comp H", industry: "Tech", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Biz H" });
    await attachEntityToBusiness(db, userId, "company", companyId, biz.id);

    await detachEntityFromBusiness(db, userId, "company", companyId, biz.id);

    const rows = await db.select().from(schema.companyBusinesses)
      .where(eq(schema.companyBusinesses.company_id, companyId));
    expect(rows.length).toBe(0);

    await detachEntityFromBusiness(db, userId, "company", companyId, biz.id);
  });

  // ─── Batch 4: Junction — vendor ──────────────────────────────────────────

  it("24. attach creates vendor_businesses junction row", async () => {
    const vendorId = `vend-${crypto.randomUUID()}`;
    await db.insert(schema.vendors).values({ id: vendorId, name: "VendorX", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Biz I" });

    await attachEntityToBusiness(db, userId, "vendor", vendorId, biz.id);

    const rows = await db.select().from(schema.vendorBusinesses)
      .where(eq(schema.vendorBusinesses.vendor_id, vendorId));
    expect(rows.length).toBe(1);
    expect(rows[0].business_id).toBe(biz.id);
  });

  it("25. attach vendor is idempotent", async () => {
    const vendorId = `vend-${crypto.randomUUID()}`;
    await db.insert(schema.vendors).values({ id: vendorId, name: "VendorY", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Biz J" });

    await attachEntityToBusiness(db, userId, "vendor", vendorId, biz.id);
    // Second call should not throw (idempotent)
    await attachEntityToBusiness(db, userId, "vendor", vendorId, biz.id);

    const rows = await db.select().from(schema.vendorBusinesses)
      .where(eq(schema.vendorBusinesses.vendor_id, vendorId));
    expect(rows.length).toBe(1);
  });

  it("26. attach rejects when vendor belongs to different user", async () => {
    const otherUser = `test-user-${crypto.randomUUID()}`;
    const vendorId = `vend-${crypto.randomUUID()}`;
    await db.insert(schema.vendors).values({ id: vendorId, name: "OtherVend", user_id: otherUser });
    const biz = await createBusiness(db, userId, { name: "Biz K" });

    await expect(
      attachEntityToBusiness(db, userId, "vendor", vendorId, biz.id)
    ).rejects.toThrow("entity or business not found or not owned by user");

    await db.delete(schema.vendors).where(eq(schema.vendors.id, vendorId));
  });

  it("27. attach vendor rejects when business belongs to different user", async () => {
    const vendorId = `vend-${crypto.randomUUID()}`;
    await db.insert(schema.vendors).values({ id: vendorId, name: "MyVend", user_id: userId });
    const otherUser = `test-user-${crypto.randomUUID()}`;
    const otherBiz = await createBusiness(db, otherUser, { name: "Other Biz" });

    await expect(
      attachEntityToBusiness(db, userId, "vendor", vendorId, otherBiz.id)
    ).rejects.toThrow("entity or business not found or not owned by user");

    await db.delete(schema.businesses).where(eq(schema.businesses.id, otherBiz.id));
  });

  it("28. detach vendor removes junction row; idempotent", async () => {
    const vendorId = `vend-${crypto.randomUUID()}`;
    await db.insert(schema.vendors).values({ id: vendorId, name: "VendorZ", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Biz L" });
    await attachEntityToBusiness(db, userId, "vendor", vendorId, biz.id);

    await detachEntityFromBusiness(db, userId, "vendor", vendorId, biz.id);

    const rows = await db.select().from(schema.vendorBusinesses)
      .where(eq(schema.vendorBusinesses.vendor_id, vendorId));
    expect(rows.length).toBe(0);

    // Idempotent: second detach should not throw
    await detachEntityFromBusiness(db, userId, "vendor", vendorId, biz.id);
  });

  // ─── Batch 5: Listing ─────────────────────────────────────────────────────

  it("29. listBusinessesForEntity returns attached businesses for contact", async () => {
    const contactId = `cont-${crypto.randomUUID()}`;
    await db.insert(schema.contacts).values({ id: contactId, name: "Frank", type: "employee", user_id: userId });
    const biz1 = await createBusiness(db, userId, { name: "Biz M" });
    const biz2 = await createBusiness(db, userId, { name: "Biz N" });
    await attachEntityToBusiness(db, userId, "contact", contactId, biz1.id);
    await attachEntityToBusiness(db, userId, "contact", contactId, biz2.id);

    const result = await listBusinessesForEntity(db, userId, "contact", contactId);
    expect(result.length).toBe(2);
    expect(result.map((b) => b.id)).toContain(biz1.id);
    expect(result.map((b) => b.id)).toContain(biz2.id);
  });

  it("30. listEntitiesForBusiness returns contact names via JOIN", async () => {
    const contactId = `cont-${crypto.randomUUID()}`;
    await db.insert(schema.contacts).values({ id: contactId, name: "George", type: "employee", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Biz O" });
    await attachEntityToBusiness(db, userId, "contact", contactId, biz.id);

    const result = await listEntitiesForBusiness(db, userId, biz.id, "contact");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(contactId);
    expect(result[0].name).toBe("George");
  });

  it("31. listEntitiesForBusiness returns company names via JOIN", async () => {
    const companyId = `comp-${crypto.randomUUID()}`;
    await db.insert(schema.companies).values({ id: companyId, name: "Global Co", industry: "Tech", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Biz P" });
    await attachEntityToBusiness(db, userId, "company", companyId, biz.id);

    const result = await listEntitiesForBusiness(db, userId, biz.id, "company");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(companyId);
    expect(result[0].name).toBe("Global Co");
  });

  it("32. listEntitiesForBusiness returns vendor names via JOIN", async () => {
    const vendorId = `vend-${crypto.randomUUID()}`;
    await db.insert(schema.vendors).values({ id: vendorId, name: "VendorQ", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Biz Q" });
    await attachEntityToBusiness(db, userId, "vendor", vendorId, biz.id);

    const result = await listEntitiesForBusiness(db, userId, biz.id, "vendor");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(vendorId);
    expect(result[0].name).toBe("VendorQ");
  });

  // ─── Batch 6: Cascade behavior ────────────────────────────────────────────

  it("33. deleting a business cascades to all 3 junction tables", async () => {
    const contactId = `cont-${crypto.randomUUID()}`;
    const companyId = `comp-${crypto.randomUUID()}`;
    const vendorId = `vend-${crypto.randomUUID()}`;
    await db.insert(schema.contacts).values({ id: contactId, name: "H", type: "employee", user_id: userId });
    await db.insert(schema.companies).values({ id: companyId, name: "I", industry: "Tech", user_id: userId });
    await db.insert(schema.vendors).values({ id: vendorId, name: "J", user_id: userId });

    const biz = await createBusiness(db, userId, { name: "Cascade Biz" });
    await attachEntityToBusiness(db, userId, "contact", contactId, biz.id);
    await attachEntityToBusiness(db, userId, "company", companyId, biz.id);
    await attachEntityToBusiness(db, userId, "vendor", vendorId, biz.id);

    await deleteBusiness(db, userId, biz.id);

    const cb = await db.select().from(schema.contactBusinesses).where(eq(schema.contactBusinesses.business_id, biz.id));
    const compB = await db.select().from(schema.companyBusinesses).where(eq(schema.companyBusinesses.business_id, biz.id));
    const vb = await db.select().from(schema.vendorBusinesses).where(eq(schema.vendorBusinesses.business_id, biz.id));
    expect(cb.length).toBe(0);
    expect(compB.length).toBe(0);
    expect(vb.length).toBe(0);
  });

  it("34. deleting a contact cascades contact_businesses but NOT the business", async () => {
    const contactId = `cont-${crypto.randomUUID()}`;
    await db.insert(schema.contacts).values({ id: contactId, name: "K", type: "employee", user_id: userId });
    const biz = await createBusiness(db, userId, { name: "Survivor Biz" });
    await attachEntityToBusiness(db, userId, "contact", contactId, biz.id);

    await db.delete(schema.contacts).where(eq(schema.contacts.id, contactId));

    const cb = await db.select().from(schema.contactBusinesses).where(eq(schema.contactBusinesses.contact_id, contactId));
    expect(cb.length).toBe(0);

    // Business still exists
    const stillThere = await getBusiness(db, userId, biz.id);
    expect(stillThere).not.toBeNull();
  });
});
