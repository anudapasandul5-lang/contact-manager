-- Personal Ops Hub Phase 1: businesses, tasks, junction tables
-- Adds business layer on top of existing contact/company/vendor graph

-- businesses table
CREATE TABLE IF NOT EXISTS "businesses" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "color" text DEFAULT '#6b7280' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
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
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tasks_user_id_idx" ON "tasks" ("user_id");
CREATE INDEX IF NOT EXISTS "tasks_user_due_date_idx" ON "tasks" ("user_id", "due_date");
CREATE INDEX IF NOT EXISTS "tasks_user_defer_date_idx" ON "tasks" ("user_id", "defer_date");
CREATE INDEX IF NOT EXISTS "tasks_parent_task_id_idx" ON "tasks" ("parent_task_id");

-- Foreign key constraints on tasks (idempotency-guarded)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_project_id_projects_id_fk') THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_contact_id_contacts_id_fk') THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_company_id_companies_id_fk') THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_business_id_businesses_id_fk') THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_parent_task_id_tasks_id_fk') THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

-- junction tables
CREATE TABLE IF NOT EXISTS "contact_businesses" (
  "contact_id" text NOT NULL,
  "business_id" text NOT NULL,
  CONSTRAINT "contact_businesses_pkey" PRIMARY KEY ("contact_id", "business_id")
);

CREATE INDEX IF NOT EXISTS "contact_businesses_business_id_idx" ON "contact_businesses" ("business_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_businesses_contact_id_contacts_id_fk') THEN
    ALTER TABLE "contact_businesses" ADD CONSTRAINT "contact_businesses_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_businesses_business_id_businesses_id_fk') THEN
    ALTER TABLE "contact_businesses" ADD CONSTRAINT "contact_businesses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "company_businesses" (
  "company_id" text NOT NULL,
  "business_id" text NOT NULL,
  CONSTRAINT "company_businesses_pkey" PRIMARY KEY ("company_id", "business_id")
);

CREATE INDEX IF NOT EXISTS "company_businesses_business_id_idx" ON "company_businesses" ("business_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_businesses_company_id_companies_id_fk') THEN
    ALTER TABLE "company_businesses" ADD CONSTRAINT "company_businesses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_businesses_business_id_businesses_id_fk') THEN
    ALTER TABLE "company_businesses" ADD CONSTRAINT "company_businesses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "vendor_businesses" (
  "vendor_id" text NOT NULL,
  "business_id" text NOT NULL,
  CONSTRAINT "vendor_businesses_pkey" PRIMARY KEY ("vendor_id", "business_id")
);

CREATE INDEX IF NOT EXISTS "vendor_businesses_business_id_idx" ON "vendor_businesses" ("business_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_businesses_vendor_id_vendors_id_fk') THEN
    ALTER TABLE "vendor_businesses" ADD CONSTRAINT "vendor_businesses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_businesses_business_id_businesses_id_fk') THEN
    ALTER TABLE "vendor_businesses" ADD CONSTRAINT "vendor_businesses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

-- Add business_id to existing tables (nullable, no backfill needed)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "business_id" text;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "business_id" text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_business_id_businesses_id_fk') THEN
    ALTER TABLE "projects" ADD CONSTRAINT "projects_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follow_ups_business_id_businesses_id_fk') THEN
    ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

-- RLS: businesses
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS businesses_owner_select ON "businesses";
DROP POLICY IF EXISTS businesses_owner_insert ON "businesses";
DROP POLICY IF EXISTS businesses_owner_update ON "businesses";
DROP POLICY IF EXISTS businesses_owner_delete ON "businesses";

CREATE POLICY businesses_owner_select
  ON "businesses"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY businesses_owner_insert
  ON "businesses"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY businesses_owner_update
  ON "businesses"
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY businesses_owner_delete
  ON "businesses"
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- RLS: tasks
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_owner_select ON "tasks";
DROP POLICY IF EXISTS tasks_owner_insert ON "tasks";
DROP POLICY IF EXISTS tasks_owner_update ON "tasks";
DROP POLICY IF EXISTS tasks_owner_delete ON "tasks";

CREATE POLICY tasks_owner_select
  ON "tasks"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY tasks_owner_insert
  ON "tasks"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY tasks_owner_update
  ON "tasks"
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY tasks_owner_delete
  ON "tasks"
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- RLS: contact_businesses (joins through contacts)
ALTER TABLE "contact_businesses" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_businesses_select_own ON "contact_businesses";
DROP POLICY IF EXISTS contact_businesses_insert_own ON "contact_businesses";
DROP POLICY IF EXISTS contact_businesses_delete_own ON "contact_businesses";

CREATE POLICY contact_businesses_select_own
  ON "contact_businesses"
  FOR SELECT
  TO authenticated
  USING (contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid()));

CREATE POLICY contact_businesses_insert_own
  ON "contact_businesses"
  FOR INSERT
  TO authenticated
  WITH CHECK (contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid()));

CREATE POLICY contact_businesses_delete_own
  ON "contact_businesses"
  FOR DELETE
  TO authenticated
  USING (contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid()));

-- RLS: company_businesses (joins through companies)
ALTER TABLE "company_businesses" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_businesses_select_own ON "company_businesses";
DROP POLICY IF EXISTS company_businesses_insert_own ON "company_businesses";
DROP POLICY IF EXISTS company_businesses_delete_own ON "company_businesses";

CREATE POLICY company_businesses_select_own
  ON "company_businesses"
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY company_businesses_insert_own
  ON "company_businesses"
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY company_businesses_delete_own
  ON "company_businesses"
  FOR DELETE
  TO authenticated
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- RLS: vendor_businesses (joins through vendors)
ALTER TABLE "vendor_businesses" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendor_businesses_select_own ON "vendor_businesses";
DROP POLICY IF EXISTS vendor_businesses_insert_own ON "vendor_businesses";
DROP POLICY IF EXISTS vendor_businesses_delete_own ON "vendor_businesses";

CREATE POLICY vendor_businesses_select_own
  ON "vendor_businesses"
  FOR SELECT
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY vendor_businesses_insert_own
  ON "vendor_businesses"
  FOR INSERT
  TO authenticated
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY vendor_businesses_delete_own
  ON "vendor_businesses"
  FOR DELETE
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- updated_at trigger for tasks
CREATE OR REPLACE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
