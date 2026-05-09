-- Personal Ops Hub Phase 1: businesses, tasks, junction tables
-- Adds business layer on top of existing contact/company/vendor graph

-- businesses table
CREATE TABLE IF NOT EXISTS "businesses" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "color" text DEFAULT '#6b7280' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "businesses_user_id_idx" ON "businesses" ("user_id");

-- tasks table
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "title" text NOT NULL,
  "notes" text,
  "project_id" text,
  "contact_id" text,
  "company_id" text,
  "business_id" text,
  "defer_date" timestamp with time zone,
  "due_date" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "parent_task_id" text,
  "recurrence_rule" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tasks_user_id_idx" ON "tasks" ("user_id");
CREATE INDEX IF NOT EXISTS "tasks_user_due_date_idx" ON "tasks" ("user_id", "due_date");
CREATE INDEX IF NOT EXISTS "tasks_user_defer_date_idx" ON "tasks" ("user_id", "defer_date");
CREATE INDEX IF NOT EXISTS "tasks_parent_task_id_idx" ON "tasks" ("parent_task_id");

-- Foreign key constraints on tasks
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;

-- junction tables
CREATE TABLE IF NOT EXISTS "contact_businesses" (
  "contact_id" text NOT NULL,
  "business_id" text NOT NULL,
  CONSTRAINT "contact_businesses_pkey" PRIMARY KEY ("contact_id", "business_id")
);

CREATE INDEX IF NOT EXISTS "contact_businesses_business_id_idx" ON "contact_businesses" ("business_id");

ALTER TABLE "contact_businesses" ADD CONSTRAINT "contact_businesses_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contact_businesses" ADD CONSTRAINT "contact_businesses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;

CREATE TABLE IF NOT EXISTS "company_businesses" (
  "company_id" text NOT NULL,
  "business_id" text NOT NULL,
  CONSTRAINT "company_businesses_pkey" PRIMARY KEY ("company_id", "business_id")
);

CREATE INDEX IF NOT EXISTS "company_businesses_business_id_idx" ON "company_businesses" ("business_id");

ALTER TABLE "company_businesses" ADD CONSTRAINT "company_businesses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "company_businesses" ADD CONSTRAINT "company_businesses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;

CREATE TABLE IF NOT EXISTS "vendor_businesses" (
  "vendor_id" text NOT NULL,
  "business_id" text NOT NULL,
  CONSTRAINT "vendor_businesses_pkey" PRIMARY KEY ("vendor_id", "business_id")
);

CREATE INDEX IF NOT EXISTS "vendor_businesses_business_id_idx" ON "vendor_businesses" ("business_id");

ALTER TABLE "vendor_businesses" ADD CONSTRAINT "vendor_businesses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vendor_businesses" ADD CONSTRAINT "vendor_businesses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;

-- Add business_id to existing tables (nullable, no backfill needed)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "business_id" text;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "business_id" text;

ALTER TABLE "projects" ADD CONSTRAINT "projects_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
