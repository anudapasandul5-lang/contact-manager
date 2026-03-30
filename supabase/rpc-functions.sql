-- =============================================================================
-- Atomic Contact Mutations — Supabase RPC Functions
-- =============================================================================
-- Deploy: Paste this file into the Supabase SQL Editor and click Run.
-- Both functions use SECURITY INVOKER so Row-Level Security policies on the
-- underlying tables are enforced for the calling user's JWT.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- create_contact_with_relations
-- -----------------------------------------------------------------------------
-- Atomically inserts a contact row plus its company and project join records.
-- If any step fails the entire transaction is rolled back — no dangling rows.
--
-- Parameters:
--   p_name        TEXT        required — contact display name
--   p_email       TEXT        optional
--   p_phone       TEXT        optional
--   p_role        TEXT        optional
--   p_bio         TEXT        optional
--   p_type        TEXT        required — 'employee' | 'vendor' | 'service_provider'
--   p_company_ids TEXT[]      array of company IDs to link (empty array = none)
--   p_project_ids TEXT[]      array of project IDs to link (empty array = none)
--
-- Returns: the newly created contacts row as JSON
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_contact_with_relations(
  p_name        TEXT,
  p_email       TEXT        DEFAULT NULL,
  p_phone       TEXT        DEFAULT NULL,
  p_role        TEXT        DEFAULT NULL,
  p_bio         TEXT        DEFAULT NULL,
  p_type        TEXT        DEFAULT 'employee',
  p_company_ids TEXT[]      DEFAULT '{}',
  p_project_ids TEXT[]      DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_contact_id  TEXT;
  v_contact     JSON;
BEGIN
  -- Generate a new UUID for the contact
  v_contact_id := gen_random_uuid()::TEXT;

  -- Insert the contact row
  INSERT INTO contacts (id, name, email, phone, role, bio, type)
  VALUES (v_contact_id, p_name, p_email, p_phone, p_role, p_bio, p_type::contact_type);

  -- Insert company associations (if any)
  IF array_length(p_company_ids, 1) > 0 THEN
    INSERT INTO contact_companies (contact_id, company_id)
    SELECT v_contact_id, unnest(p_company_ids);
  END IF;

  -- Insert project associations (if any)
  IF array_length(p_project_ids, 1) > 0 THEN
    INSERT INTO contact_projects (contact_id, project_id)
    SELECT v_contact_id, unnest(p_project_ids);
  END IF;

  -- Return the full contact row as JSON
  SELECT row_to_json(c) INTO v_contact
  FROM contacts c
  WHERE c.id = v_contact_id;

  RETURN v_contact;
END;
$$;


-- -----------------------------------------------------------------------------
-- update_contact_with_relations
-- -----------------------------------------------------------------------------
-- Atomically updates a contact row, removes all existing company/project links,
-- and inserts the new set of links. If any step fails the entire transaction is
-- rolled back — old associations are fully preserved on error.
--
-- Parameters:
--   p_contact_id  TEXT        required — ID of the contact to update
--   p_name        TEXT        required — new display name
--   p_email       TEXT        optional
--   p_phone       TEXT        optional
--   p_role        TEXT        optional
--   p_bio         TEXT        optional
--   p_type        TEXT        required — 'employee' | 'vendor' | 'service_provider'
--   p_company_ids TEXT[]      new set of company IDs (replaces all existing)
--   p_project_ids TEXT[]      new set of project IDs (replaces all existing)
--
-- Returns: the updated contacts row as JSON
-- Raises:  P0002 (no_data_found) if the contact ID does not exist
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_contact_with_relations(
  p_contact_id  TEXT,
  p_name        TEXT,
  p_email       TEXT        DEFAULT NULL,
  p_phone       TEXT        DEFAULT NULL,
  p_role        TEXT        DEFAULT NULL,
  p_bio         TEXT        DEFAULT NULL,
  p_type        TEXT        DEFAULT 'employee',
  p_company_ids TEXT[]      DEFAULT '{}',
  p_project_ids TEXT[]      DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_contact JSON;
BEGIN
  -- Update the contact row; raise an exception if not found
  UPDATE contacts
  SET
    name  = p_name,
    email = p_email,
    phone = p_phone,
    role  = p_role,
    bio   = p_bio,
    type  = p_type::contact_type
  WHERE id = p_contact_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Remove all existing company associations for this contact
  DELETE FROM contact_companies WHERE contact_id = p_contact_id;

  -- Remove all existing project associations for this contact
  DELETE FROM contact_projects WHERE contact_id = p_contact_id;

  -- Insert the new company associations (if any)
  IF array_length(p_company_ids, 1) > 0 THEN
    INSERT INTO contact_companies (contact_id, company_id)
    SELECT p_contact_id, unnest(p_company_ids);
  END IF;

  -- Insert the new project associations (if any)
  IF array_length(p_project_ids, 1) > 0 THEN
    INSERT INTO contact_projects (contact_id, project_id)
    SELECT p_contact_id, unnest(p_project_ids);
  END IF;

  -- Return the updated contact row as JSON
  SELECT row_to_json(c) INTO v_contact
  FROM contacts c
  WHERE c.id = p_contact_id;

  RETURN v_contact;
END;
$$;
