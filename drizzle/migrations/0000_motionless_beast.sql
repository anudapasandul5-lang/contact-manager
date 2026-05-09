CREATE TYPE "public"."contact_type" AS ENUM('employee', 'vendor', 'investor', 'cofounder', 'partner');--> statement-breakpoint
CREATE TYPE "public"."intro_request_status" AS ENUM('draft', 'requested', 'accepted', 'declined', 'completed');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planning', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."relationship_evidence_type" AS ENUM('manual', 'shared_company', 'shared_project');--> statement-breakpoint
CREATE TYPE "public"."relationship_strength" AS ENUM('weak', 'warm', 'strong');--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"industry" text NOT NULL,
	"color" text,
	"is_owned" boolean DEFAULT false NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_businesses" (
	"company_id" text NOT NULL,
	"business_id" text NOT NULL,
	CONSTRAINT "company_businesses_company_id_business_id_pk" PRIMARY KEY("company_id","business_id")
);
--> statement-breakpoint
CREATE TABLE "contact_businesses" (
	"contact_id" text NOT NULL,
	"business_id" text NOT NULL,
	CONSTRAINT "contact_businesses_contact_id_business_id_pk" PRIMARY KEY("contact_id","business_id")
);
--> statement-breakpoint
CREATE TABLE "contact_companies" (
	"contact_id" text NOT NULL,
	"company_id" text NOT NULL,
	CONSTRAINT "contact_companies_contact_id_company_id_pk" PRIMARY KEY("contact_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "contact_projects" (
	"contact_id" text NOT NULL,
	"project_id" text NOT NULL,
	CONSTRAINT "contact_projects_contact_id_project_id_pk" PRIMARY KEY("contact_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" text,
	"type" "contact_type" NOT NULL,
	"notes" text,
	"bio" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"company_id" text,
	"project_id" text,
	"business_id" text,
	"objective" text NOT NULL,
	"notes" text,
	"scheduled_for" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"completion_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intro_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"requester_contact_id" text,
	"connector_contact_id" text NOT NULL,
	"target_contact_id" text NOT NULL,
	"status" "intro_request_status" DEFAULT 'draft' NOT NULL,
	"message_draft" text,
	"requested_at" timestamp,
	"resolved_at" timestamp,
	"outcome_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"source_contact_id" text NOT NULL,
	"target_contact_id" text NOT NULL,
	"strength" "relationship_strength" DEFAULT 'weak' NOT NULL,
	"is_inferred" boolean DEFAULT false NOT NULL,
	"evidence_type" "relationship_evidence_type" DEFAULT 'manual' NOT NULL,
	"evidence_company_id" text,
	"evidence_project_id" text,
	"last_confirmed_at" timestamp,
	"how_they_know_each_other" text,
	"notes" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" "project_status" DEFAULT 'planning' NOT NULL,
	"company_id" text,
	"business_id" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
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
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"avatar_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_businesses" (
	"vendor_id" text NOT NULL,
	"business_id" text NOT NULL,
	CONSTRAINT "vendor_businesses_vendor_id_business_id_pk" PRIMARY KEY("vendor_id","business_id")
);
--> statement-breakpoint
CREATE TABLE "vendor_companies" (
	"vendor_id" text NOT NULL,
	"company_id" text NOT NULL,
	CONSTRAINT "vendor_companies_vendor_id_company_id_pk" PRIMARY KEY("vendor_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "vendor_people" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" text,
	"bio" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_projects" (
	"vendor_id" text NOT NULL,
	"project_id" text NOT NULL,
	CONSTRAINT "vendor_projects_vendor_id_project_id_pk" PRIMARY KEY("vendor_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"specialty" text,
	"notes" text,
	"color" text,
	"legacy_contact_id" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_businesses" ADD CONSTRAINT "company_businesses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_businesses" ADD CONSTRAINT "company_businesses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_businesses" ADD CONSTRAINT "contact_businesses_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_businesses" ADD CONSTRAINT "contact_businesses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_companies" ADD CONSTRAINT "contact_companies_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_companies" ADD CONSTRAINT "contact_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_projects" ADD CONSTRAINT "contact_projects_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_projects" ADD CONSTRAINT "contact_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intro_requests" ADD CONSTRAINT "intro_requests_requester_contact_id_contacts_id_fk" FOREIGN KEY ("requester_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intro_requests" ADD CONSTRAINT "intro_requests_connector_contact_id_contacts_id_fk" FOREIGN KEY ("connector_contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intro_requests" ADD CONSTRAINT "intro_requests_target_contact_id_contacts_id_fk" FOREIGN KEY ("target_contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_relationships" ADD CONSTRAINT "person_relationships_source_contact_id_contacts_id_fk" FOREIGN KEY ("source_contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_relationships" ADD CONSTRAINT "person_relationships_target_contact_id_contacts_id_fk" FOREIGN KEY ("target_contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_relationships" ADD CONSTRAINT "person_relationships_evidence_company_id_companies_id_fk" FOREIGN KEY ("evidence_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_relationships" ADD CONSTRAINT "person_relationships_evidence_project_id_projects_id_fk" FOREIGN KEY ("evidence_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_businesses" ADD CONSTRAINT "vendor_businesses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_businesses" ADD CONSTRAINT "vendor_businesses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_companies" ADD CONSTRAINT "vendor_companies_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_companies" ADD CONSTRAINT "vendor_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_people" ADD CONSTRAINT "vendor_people_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_projects" ADD CONSTRAINT "vendor_projects_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_projects" ADD CONSTRAINT "vendor_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_legacy_contact_id_contacts_id_fk" FOREIGN KEY ("legacy_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "businesses_user_id_idx" ON "businesses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "company_businesses_business_id_idx" ON "company_businesses" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "contact_businesses_business_id_idx" ON "contact_businesses" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "follow_ups_one_open_per_contact_idx" ON "follow_ups" USING btree ("user_id","contact_id") WHERE "follow_ups"."completed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "follow_ups_user_scheduled_idx" ON "follow_ups" USING btree ("user_id","scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "person_relationships_pair_unique" ON "person_relationships" USING btree ("source_contact_id","target_contact_id");--> statement-breakpoint
CREATE INDEX "tasks_user_id_idx" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_user_due_date_idx" ON "tasks" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "tasks_user_defer_date_idx" ON "tasks" USING btree ("user_id","defer_date");--> statement-breakpoint
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX "vendor_businesses_business_id_idx" ON "vendor_businesses" USING btree ("business_id");