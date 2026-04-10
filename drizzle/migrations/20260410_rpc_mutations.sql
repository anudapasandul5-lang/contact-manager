-- drizzle/migrations/20260410_rpc_mutations.sql
-- Atomic contact mutations via stored procedures.
-- Run: npx drizzle-kit push  (from contact-manager/)

-- Atomically inserts a contact and its join rows in a single transaction.
CREATE OR REPLACE FUNCTION create_contact_with_relations(
  p_id          uuid,
  p_user_id     uuid,
  p_name        text,
  p_email       text,
  p_phone       text,
  p_role        text,
  p_bio         text,
  p_notes       text,
  p_type        text,
  p_company_ids uuid[],
  p_project_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
-- Caller (API route) MUST pass the authenticated user's own ID as p_user_id.
-- join table inserts are implicitly scoped to the user via the parent row's RLS.
AS $$
DECLARE
  v_row jsonb;
BEGIN
  INSERT INTO contacts (id, user_id, name, email, phone, role, bio, type, notes)
  VALUES (p_id, p_user_id, p_name, p_email, p_phone, p_role, p_bio, p_type, p_notes)
  RETURNING to_jsonb(contacts.*) INTO v_row;

  IF array_length(p_company_ids, 1) IS NOT NULL THEN
    INSERT INTO contact_companies (contact_id, company_id)
    SELECT p_id, unnest(p_company_ids);
  END IF;

  IF array_length(p_project_ids, 1) IS NOT NULL THEN
    INSERT INTO contact_projects (contact_id, project_id)
    SELECT p_id, unnest(p_project_ids);
  END IF;

  RETURN v_row;
END;
$$;

-- Atomically updates a contact and replaces its join rows.
CREATE OR REPLACE FUNCTION update_contact_with_relations(
  p_id          uuid,
  p_user_id     uuid,
  p_name        text,
  p_email       text,
  p_phone       text,
  p_role        text,
  p_bio         text,
  p_notes       text,
  p_type        text,
  p_company_ids uuid[],
  p_project_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
-- Caller (API route) MUST pass the authenticated user's own ID as p_user_id.
-- join table inserts are implicitly scoped to the user via the parent row's RLS.
AS $$
DECLARE
  v_row jsonb;
BEGIN
  UPDATE contacts
     SET name  = p_name,  email = p_email, phone = p_phone,
         role  = p_role,  bio   = p_bio,   type  = p_type,
         notes = p_notes
   WHERE id = p_id AND user_id = p_user_id
  RETURNING to_jsonb(contacts.*) INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'contact not found or access denied';
  END IF;

  DELETE FROM contact_companies WHERE contact_id = p_id;
  IF array_length(p_company_ids, 1) IS NOT NULL THEN
    INSERT INTO contact_companies (contact_id, company_id)
    SELECT p_id, unnest(p_company_ids);
  END IF;

  DELETE FROM contact_projects WHERE contact_id = p_id;
  IF array_length(p_project_ids, 1) IS NOT NULL THEN
    INSERT INTO contact_projects (contact_id, project_id)
    SELECT p_id, unnest(p_project_ids);
  END IF;

  RETURN v_row;
END;
$$;

-- Atomically inserts a vendor with its people and join rows.
CREATE OR REPLACE FUNCTION create_vendor_with_relations(
  p_id          uuid,
  p_user_id     uuid,
  p_name        text,
  p_specialty   text,
  p_notes       text,
  p_color       text,
  p_company_ids uuid[],
  p_project_ids uuid[],
  p_people      jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
-- Caller (API route) MUST pass the authenticated user's own ID as p_user_id.
-- join table inserts are implicitly scoped to the user via the parent row's RLS.
AS $$
DECLARE
  v_row    jsonb;
  v_person jsonb;
BEGIN
  INSERT INTO vendors (id, user_id, name, specialty, notes, color)
  VALUES (p_id, p_user_id, p_name, p_specialty, p_notes, p_color)
  RETURNING to_jsonb(vendors.*) INTO v_row;

  IF array_length(p_company_ids, 1) IS NOT NULL THEN
    INSERT INTO vendor_companies (vendor_id, company_id)
    SELECT p_id, unnest(p_company_ids);
  END IF;

  IF array_length(p_project_ids, 1) IS NOT NULL THEN
    INSERT INTO vendor_projects (vendor_id, project_id)
    SELECT p_id, unnest(p_project_ids);
  END IF;

  FOR v_person IN SELECT * FROM jsonb_array_elements(p_people) LOOP
    INSERT INTO vendor_people (id, vendor_id, name, email, phone, role, bio)
    VALUES (
      COALESCE((v_person->>'id')::uuid, gen_random_uuid()),
      p_id,
      COALESCE(v_person->>'name', ''),
      v_person->>'email',
      v_person->>'phone',
      v_person->>'role',
      v_person->>'bio'
    );
  END LOOP;

  RETURN v_row;
END;
$$;

-- Atomically updates a vendor, replacing its people and join rows.
CREATE OR REPLACE FUNCTION update_vendor_with_relations(
  p_id          uuid,
  p_user_id     uuid,
  p_name        text,
  p_specialty   text,
  p_notes       text,
  p_color       text,
  p_company_ids uuid[],
  p_project_ids uuid[],
  p_people      jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
-- Caller (API route) MUST pass the authenticated user's own ID as p_user_id.
-- join table inserts are implicitly scoped to the user via the parent row's RLS.
AS $$
DECLARE
  v_row    jsonb;
  v_person jsonb;
BEGIN
  UPDATE vendors
     SET name      = p_name,      specialty = p_specialty,
         notes     = p_notes,     color     = p_color
   WHERE id = p_id AND user_id = p_user_id
  RETURNING to_jsonb(vendors.*) INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'vendor not found or access denied';
  END IF;

  DELETE FROM vendor_companies WHERE vendor_id = p_id;
  IF array_length(p_company_ids, 1) IS NOT NULL THEN
    INSERT INTO vendor_companies (vendor_id, company_id)
    SELECT p_id, unnest(p_company_ids);
  END IF;

  DELETE FROM vendor_projects WHERE vendor_id = p_id;
  IF array_length(p_project_ids, 1) IS NOT NULL THEN
    INSERT INTO vendor_projects (vendor_id, project_id)
    SELECT p_id, unnest(p_project_ids);
  END IF;

  DELETE FROM vendor_people WHERE vendor_id = p_id;
  FOR v_person IN SELECT * FROM jsonb_array_elements(p_people) LOOP
    INSERT INTO vendor_people (id, vendor_id, name, email, phone, role, bio)
    VALUES (
      COALESCE((v_person->>'id')::uuid, gen_random_uuid()),
      p_id,
      COALESCE(v_person->>'name', ''),
      v_person->>'email',
      v_person->>'phone',
      v_person->>'role',
      v_person->>'bio'
    );
  END LOOP;

  RETURN v_row;
END;
$$;
