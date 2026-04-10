-- Security setup for Contact Manager
-- Run this in the Supabase SQL Editor before using the app in authenticated mode.
-- Seed data remains in `contact-manager/supabase/seed.sql`.

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE TYPE relationship_strength AS ENUM ('weak', 'warm', 'strong');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE relationship_evidence_type AS ENUM ('manual', 'shared_company', 'shared_project');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE intro_request_status AS ENUM ('draft', 'requested', 'accepted', 'declined', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS person_relationships (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source_contact_id text NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  target_contact_id text NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  strength relationship_strength NOT NULL DEFAULT 'weak',
  is_inferred boolean NOT NULL DEFAULT false,
  evidence_type relationship_evidence_type NOT NULL DEFAULT 'manual',
  evidence_company_id text REFERENCES companies(id) ON DELETE SET NULL,
  evidence_project_id text REFERENCES projects(id) ON DELETE SET NULL,
  last_confirmed_at timestamptz NULL,
  how_they_know_each_other text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_relationships_pair_unique UNIQUE (source_contact_id, target_contact_id),
  CONSTRAINT person_relationships_not_self CHECK (source_contact_id <> target_contact_id)
);

CREATE TABLE IF NOT EXISTS intro_requests (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  requester_contact_id text NULL REFERENCES contacts(id) ON DELETE SET NULL,
  connector_contact_id text NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  target_contact_id text NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status intro_request_status NOT NULL DEFAULT 'draft',
  message_draft text NULL,
  requested_at timestamptz NULL,
  resolved_at timestamptz NULL,
  outcome_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE person_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE intro_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_authenticated_access" ON companies;
DROP POLICY IF EXISTS "contacts_authenticated_access" ON contacts;
DROP POLICY IF EXISTS "projects_authenticated_access" ON projects;
DROP POLICY IF EXISTS "contact_companies_authenticated_access" ON contact_companies;
DROP POLICY IF EXISTS "contact_projects_authenticated_access" ON contact_projects;
DROP POLICY IF EXISTS "person_relationships_authenticated_access" ON person_relationships;
DROP POLICY IF EXISTS "intro_requests_authenticated_access" ON intro_requests;

CREATE POLICY "companies_authenticated_access"
ON companies
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "contacts_authenticated_access"
ON contacts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "projects_authenticated_access"
ON projects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "contact_companies_authenticated_access"
ON contact_companies
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "contact_projects_authenticated_access"
ON contact_projects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "person_relationships_authenticated_access"
ON person_relationships
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "intro_requests_authenticated_access"
ON intro_requests
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
