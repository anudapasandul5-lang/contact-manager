-- Seed data for Contact Manager
-- Run this in the Supabase SQL Editor

-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE contact_type AS ENUM ('employee', 'vendor', 'service_provider');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- Companies
INSERT INTO companies (id, name, industry, color) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Alpha Corp', 'Technology', '#3b82f6'),
  ('a1000000-0000-0000-0000-000000000002', 'Beta Inc', 'Marketing', '#8b5cf6'),
  ('a1000000-0000-0000-0000-000000000003', 'Gamma LLC', 'Real Estate', '#f97316'),
  ('a1000000-0000-0000-0000-000000000004', 'Delta Group', 'Finance', '#22c55e'),
  ('a1000000-0000-0000-0000-000000000005', 'Epsilon Co', 'E-Commerce', '#ef4444');

-- Projects
INSERT INTO projects (id, name, status, company_id) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Brand Refresh', 'active', NULL),
  ('b1000000-0000-0000-0000-000000000002', 'E-Commerce Platform', 'planning', NULL);

-- Contacts - Employees
INSERT INTO contacts (id, name, email, phone, role, type) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Sarah Johnson', 'sarah.johnson@mycompany.com', '555-101-2020', 'Project Manager', 'employee'),
  ('c1000000-0000-0000-0000-000000000002', 'Marcus Davis', 'marcus.davis@mycompany.com', '555-101-2021', 'Lead Developer', 'employee'),
  ('c1000000-0000-0000-0000-000000000003', 'Elena Rodriguez', 'elena.rodriguez@mycompany.com', '555-101-2022', 'Marketing Manager', 'employee');

-- Contacts - Vendors
INSERT INTO contacts (id, name, email, phone, role, type) VALUES
  ('c1000000-0000-0000-0000-000000000004', 'Linda Xu', 'linda.xu@techparts.com', '555-201-3030', 'Sales Rep', 'vendor'),
  ('c1000000-0000-0000-0000-000000000005', 'CloudHost Services', 'support@cloudhost.com', '555-201-3031', 'IT Support', 'vendor'),
  ('c1000000-0000-0000-0000-000000000006', 'FastFix IT', 'help@fastfix.com', '555-201-3032', 'IT Support', 'vendor');

-- Contacts - Service Providers
INSERT INTO contacts (id, name, email, phone, role, type) VALUES
  ('c1000000-0000-0000-0000-000000000007', 'Priya Nair', 'priya.nair@lawfirm.com', '555-301-4040', 'Corporate Attorney', 'service_provider'),
  ('c1000000-0000-0000-0000-000000000008', 'James Carter', 'james.carter@design.co', '555-301-4041', 'Graphic Designer', 'service_provider'),
  ('c1000000-0000-0000-0000-000000000009', 'Apex Supply Co.', 'accounts@apexsupply.com', '555-301-4042', 'Account Manager', 'service_provider');

-- Contact-Company relationships
INSERT INTO contact_companies (contact_id, company_id) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000004');

-- Contact-Project relationships
INSERT INTO contact_projects (contact_id, project_id) VALUES
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000002'),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000002'),
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000002');

-- Warm intro relationships
INSERT INTO person_relationships (
  id,
  source_contact_id,
  target_contact_id,
  strength,
  is_inferred,
  evidence_type,
  evidence_company_id,
  evidence_project_id,
  last_confirmed_at,
  how_they_know_each_other,
  notes
) VALUES
  (
    'd1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000007',
    'strong',
    false,
    'manual',
    null,
    'b1000000-0000-0000-0000-000000000001',
    now() - interval '30 days',
    'Worked closely during the Brand Refresh project.',
    'Priya responds quickly to Sarah.'
  ),
  (
    'd1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000004',
    'warm',
    false,
    'manual',
    'a1000000-0000-0000-0000-000000000002',
    null,
    now() - interval '90 days',
    'Marcus and Linda worked together through Beta Inc.',
    'Good connector for procurement or partner conversations.'
  ),
  (
    'd1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000008',
    'weak',
    false,
    'manual',
    null,
    'b1000000-0000-0000-0000-000000000001',
    now() - interval '420 days',
    'Elena and James met on the brand project.',
    'Relationship may need reconfirmation before asking for an intro.'
  );

-- Intro workflow example
INSERT INTO intro_requests (
  id,
  requester_contact_id,
  connector_contact_id,
  target_contact_id,
  status,
  message_draft,
  requested_at,
  resolved_at,
  outcome_notes
) VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    null,
    'c1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000004',
    'requested',
    'Could you introduce me to Linda? We may want to explore a broader partnership.',
    now() - interval '2 days',
    null,
    'Waiting on Marcus to make the intro.'
  );
