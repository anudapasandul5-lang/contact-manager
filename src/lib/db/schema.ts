import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, pgEnum, primaryKey, boolean, uniqueIndex, index, uuid, AnyPgColumn } from "drizzle-orm/pg-core";

export const contactTypeEnum = pgEnum("contact_type", [
  "employee",
  "vendor",
  "investor",
  "cofounder",
  "partner",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "completed",
]);

export const relationshipStrengthEnum = pgEnum("relationship_strength", [
  "weak",
  "warm",
  "strong",
]);

export const relationshipEvidenceTypeEnum = pgEnum("relationship_evidence_type", [
  "manual",
  "shared_company",
  "shared_project",
]);

export const introRequestStatusEnum = pgEnum("intro_request_status", [
  "draft",
  "requested",
  "accepted",
  "declined",
  "completed",
]);

export const companies = pgTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  color: text("color"),
  is_owned: boolean("is_owned").notNull().default(false),
  user_id: text("user_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const vendors = pgTable("vendors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty"),
  notes: text("notes"),
  color: text("color"),
  legacy_contact_id: text("legacy_contact_id").references(() => contacts.id, { onDelete: "set null" }),
  user_id: text("user_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  type: contactTypeEnum("type").notNull(),
  notes: text("notes"),
  bio: text("bio"),
  user_id: text("user_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const vendorPeople = pgTable("vendor_people", {
  id: text("id").primaryKey(),
  vendor_id: text("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  bio: text("bio"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const businesses = pgTable("businesses", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6b7280"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("businesses_user_id_idx").on(t.user_id),
]);

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: projectStatusEnum("status").notNull().default("planning"),
  company_id: text("company_id").references(() => companies.id, { onDelete: "set null" }),
  business_id: text("business_id").references(() => businesses.id, { onDelete: "set null" }),
  user_id: text("user_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const contactCompanies = pgTable("contact_companies", {
  contact_id: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  company_id: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.contact_id, t.company_id] })]);

export const contactProjects = pgTable("contact_projects", {
  contact_id: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  project_id: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.contact_id, t.project_id] })]);

export const vendorCompanies = pgTable("vendor_companies", {
  vendor_id: text("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  company_id: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.vendor_id, t.company_id] })]);

export const vendorProjects = pgTable("vendor_projects", {
  vendor_id: text("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  project_id: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.vendor_id, t.project_id] })]);

export const personRelationships = pgTable("person_relationships", {
  id: text("id").primaryKey(),
  source_contact_id: text("source_contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  target_contact_id: text("target_contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  strength: relationshipStrengthEnum("strength").notNull().default("weak"),
  is_inferred: boolean("is_inferred").notNull().default(false),
  evidence_type: relationshipEvidenceTypeEnum("evidence_type").notNull().default("manual"),
  evidence_company_id: text("evidence_company_id").references(() => companies.id, { onDelete: "set null" }),
  evidence_project_id: text("evidence_project_id").references(() => projects.id, { onDelete: "set null" }),
  last_confirmed_at: timestamp("last_confirmed_at"),
  how_they_know_each_other: text("how_they_know_each_other"),
  notes: text("notes"),
  user_id: text("user_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("person_relationships_pair_unique").on(t.source_contact_id, t.target_contact_id)]);

export const introRequests = pgTable("intro_requests", {
  id: text("id").primaryKey(),
  user_id: text("user_id"),
  requester_contact_id: text("requester_contact_id").references(() => contacts.id, { onDelete: "set null" }),
  connector_contact_id: text("connector_contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  target_contact_id: text("target_contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  status: introRequestStatusEnum("status").notNull().default("draft"),
  message_draft: text("message_draft"),
  requested_at: timestamp("requested_at"),
  resolved_at: timestamp("resolved_at"),
  outcome_notes: text("outcome_notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const followUps = pgTable("follow_ups", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  contact_id: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  company_id: text("company_id").references(() => companies.id, { onDelete: "set null" }),
  project_id: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  business_id: text("business_id").references(() => businesses.id, { onDelete: "set null" }),
  objective: text("objective").notNull(),
  notes: text("notes"),
  scheduled_for: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  completion_note: text("completion_note"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("follow_ups_one_open_per_contact_idx")
    .on(t.user_id, t.contact_id)
    .where(sql`${t.completed_at} IS NULL`),
  index("follow_ups_user_scheduled_idx").on(t.user_id, t.scheduled_for),
]);

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  project_id: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  contact_id: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  company_id: text("company_id").references(() => companies.id, { onDelete: "set null" }),
  business_id: text("business_id").references(() => businesses.id, { onDelete: "set null" }),
  defer_date: timestamp("defer_date", { withTimezone: true }),
  due_date: timestamp("due_date", { withTimezone: true }),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  parent_task_id: text("parent_task_id").references((): AnyPgColumn => tasks.id, { onDelete: "set null" }),
  recurrence_rule: text("recurrence_rule"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("tasks_user_id_idx").on(t.user_id),
  index("tasks_user_due_date_idx").on(t.user_id, t.due_date),
  index("tasks_user_defer_date_idx").on(t.user_id, t.defer_date),
  index("tasks_parent_task_id_idx").on(t.parent_task_id),
]);

export const contactBusinesses = pgTable("contact_businesses", {
  contact_id: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  business_id: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.contact_id, t.business_id] }),
  index("contact_businesses_business_id_idx").on(t.business_id),
]);

export const companyBusinesses = pgTable("company_businesses", {
  company_id: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  business_id: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.company_id, t.business_id] }),
  index("company_businesses_business_id_idx").on(t.business_id),
]);

export const vendorBusinesses = pgTable("vendor_businesses", {
  vendor_id: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  business_id: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.vendor_id, t.business_id] }),
  index("vendor_businesses_business_id_idx").on(t.business_id),
]);

export const userProfiles = pgTable("user_profiles", {
  user_id: uuid("user_id").primaryKey(),
  display_name: text("display_name"),
  avatar_path: text("avatar_path"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
