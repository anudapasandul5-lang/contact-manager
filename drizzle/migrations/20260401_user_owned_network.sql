DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id
  INTO admin_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot backfill ownership without at least one auth.users row.';
  END IF;

  ALTER TABLE companies ADD COLUMN IF NOT EXISTS user_id uuid;
  ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id uuid;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id uuid;
  ALTER TABLE person_relationships ADD COLUMN IF NOT EXISTS user_id uuid;
  ALTER TABLE intro_requests ADD COLUMN IF NOT EXISTS user_id uuid;
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS user_id uuid;

  UPDATE companies SET user_id = admin_user_id WHERE user_id IS NULL;
  UPDATE contacts SET user_id = admin_user_id WHERE user_id IS NULL;
  UPDATE projects SET user_id = admin_user_id WHERE user_id IS NULL;
  UPDATE person_relationships SET user_id = admin_user_id WHERE user_id IS NULL;
  UPDATE intro_requests SET user_id = admin_user_id WHERE user_id IS NULL;
  UPDATE vendors SET user_id = admin_user_id WHERE user_id IS NULL;
END $$;

ALTER TABLE companies ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE person_relationships ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE intro_requests ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE vendors ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE companies ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE contacts ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE projects ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE person_relationships ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE intro_requests ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE vendors ALTER COLUMN user_id SET DEFAULT auth.uid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_user_id_fkey'
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT companies_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contacts_user_id_fkey'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_user_id_fkey'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'person_relationships_user_id_fkey'
  ) THEN
    ALTER TABLE person_relationships
      ADD CONSTRAINT person_relationships_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'intro_requests_user_id_fkey'
  ) THEN
    ALTER TABLE intro_requests
      ADD CONSTRAINT intro_requests_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vendors_user_id_fkey'
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT vendors_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS companies_user_id_idx ON companies (user_id);
CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts (user_id);
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects (user_id);
CREATE INDEX IF NOT EXISTS person_relationships_user_id_idx ON person_relationships (user_id);
CREATE INDEX IF NOT EXISTS intro_requests_user_id_idx ON intro_requests (user_id);
CREATE INDEX IF NOT EXISTS vendors_user_id_idx ON vendors (user_id);

ALTER TABLE person_relationships DROP CONSTRAINT IF EXISTS person_relationships_pair_unique;
CREATE UNIQUE INDEX IF NOT EXISTS person_relationships_user_pair_unique
  ON person_relationships (user_id, source_contact_id, target_contact_id);

DROP POLICY IF EXISTS companies_authenticated_access ON companies;
DROP POLICY IF EXISTS contacts_authenticated_access ON contacts;
DROP POLICY IF EXISTS projects_authenticated_access ON projects;
DROP POLICY IF EXISTS person_relationships_authenticated_access ON person_relationships;
DROP POLICY IF EXISTS intro_requests_authenticated_access ON intro_requests;
DROP POLICY IF EXISTS contact_companies_authenticated_access ON contact_companies;
DROP POLICY IF EXISTS contact_projects_authenticated_access ON contact_projects;

DROP POLICY IF EXISTS vendors_authenticated_select ON vendors;
DROP POLICY IF EXISTS vendors_authenticated_insert ON vendors;
DROP POLICY IF EXISTS vendors_authenticated_update ON vendors;
DROP POLICY IF EXISTS vendors_authenticated_delete ON vendors;
DROP POLICY IF EXISTS vendor_people_authenticated_select ON vendor_people;
DROP POLICY IF EXISTS vendor_people_authenticated_insert ON vendor_people;
DROP POLICY IF EXISTS vendor_people_authenticated_update ON vendor_people;
DROP POLICY IF EXISTS vendor_people_authenticated_delete ON vendor_people;
DROP POLICY IF EXISTS vendor_companies_authenticated_select ON vendor_companies;
DROP POLICY IF EXISTS vendor_companies_authenticated_insert ON vendor_companies;
DROP POLICY IF EXISTS vendor_companies_authenticated_update ON vendor_companies;
DROP POLICY IF EXISTS vendor_companies_authenticated_delete ON vendor_companies;
DROP POLICY IF EXISTS vendor_projects_authenticated_select ON vendor_projects;
DROP POLICY IF EXISTS vendor_projects_authenticated_insert ON vendor_projects;
DROP POLICY IF EXISTS vendor_projects_authenticated_update ON vendor_projects;
DROP POLICY IF EXISTS vendor_projects_authenticated_delete ON vendor_projects;

CREATE POLICY companies_owner_select
  ON companies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY companies_owner_insert
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY companies_owner_update
  ON companies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY companies_owner_delete
  ON companies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY contacts_owner_select
  ON contacts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY contacts_owner_insert
  ON contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY contacts_owner_update
  ON contacts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY contacts_owner_delete
  ON contacts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY projects_owner_select
  ON projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY projects_owner_insert
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      company_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM companies
        WHERE companies.id = projects.company_id
          AND companies.user_id = auth.uid()
      )
    )
  );

CREATE POLICY projects_owner_update
  ON projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      company_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM companies
        WHERE companies.id = projects.company_id
          AND companies.user_id = auth.uid()
      )
    )
  );

CREATE POLICY projects_owner_delete
  ON projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY person_relationships_owner_select
  ON person_relationships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY person_relationships_owner_insert
  ON person_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM contacts source_contact
      WHERE source_contact.id = person_relationships.source_contact_id
        AND source_contact.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM contacts target_contact
      WHERE target_contact.id = person_relationships.target_contact_id
        AND target_contact.user_id = auth.uid()
    )
    AND (
      evidence_company_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM companies
        WHERE companies.id = person_relationships.evidence_company_id
          AND companies.user_id = auth.uid()
      )
    )
    AND (
      evidence_project_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM projects
        WHERE projects.id = person_relationships.evidence_project_id
          AND projects.user_id = auth.uid()
      )
    )
  );

CREATE POLICY person_relationships_owner_update
  ON person_relationships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM contacts source_contact
      WHERE source_contact.id = person_relationships.source_contact_id
        AND source_contact.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM contacts target_contact
      WHERE target_contact.id = person_relationships.target_contact_id
        AND target_contact.user_id = auth.uid()
    )
    AND (
      evidence_company_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM companies
        WHERE companies.id = person_relationships.evidence_company_id
          AND companies.user_id = auth.uid()
      )
    )
    AND (
      evidence_project_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM projects
        WHERE projects.id = person_relationships.evidence_project_id
          AND projects.user_id = auth.uid()
      )
    )
  );

CREATE POLICY person_relationships_owner_delete
  ON person_relationships
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY intro_requests_owner_select
  ON intro_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY intro_requests_owner_insert
  ON intro_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      requester_contact_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM contacts requester_contact
        WHERE requester_contact.id = intro_requests.requester_contact_id
          AND requester_contact.user_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1
      FROM contacts connector_contact
      WHERE connector_contact.id = intro_requests.connector_contact_id
        AND connector_contact.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM contacts target_contact
      WHERE target_contact.id = intro_requests.target_contact_id
        AND target_contact.user_id = auth.uid()
    )
  );

CREATE POLICY intro_requests_owner_update
  ON intro_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      requester_contact_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM contacts requester_contact
        WHERE requester_contact.id = intro_requests.requester_contact_id
          AND requester_contact.user_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1
      FROM contacts connector_contact
      WHERE connector_contact.id = intro_requests.connector_contact_id
        AND connector_contact.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM contacts target_contact
      WHERE target_contact.id = intro_requests.target_contact_id
        AND target_contact.user_id = auth.uid()
    )
  );

CREATE POLICY intro_requests_owner_delete
  ON intro_requests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY vendors_owner_select
  ON vendors
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY vendors_owner_insert
  ON vendors
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY vendors_owner_update
  ON vendors
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY vendors_owner_delete
  ON vendors
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY contact_companies_owner_select
  ON contact_companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = contact_companies.contact_id
        AND contacts.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM companies
      WHERE companies.id = contact_companies.company_id
        AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY contact_companies_owner_insert
  ON contact_companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = contact_companies.contact_id
        AND contacts.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM companies
      WHERE companies.id = contact_companies.company_id
        AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY contact_companies_owner_update
  ON contact_companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = contact_companies.contact_id
        AND contacts.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM companies
      WHERE companies.id = contact_companies.company_id
        AND companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = contact_companies.contact_id
        AND contacts.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM companies
      WHERE companies.id = contact_companies.company_id
        AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY contact_companies_owner_delete
  ON contact_companies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = contact_companies.contact_id
        AND contacts.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM companies
      WHERE companies.id = contact_companies.company_id
        AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY contact_projects_owner_select
  ON contact_projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = contact_projects.contact_id
        AND contacts.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = contact_projects.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY contact_projects_owner_insert
  ON contact_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = contact_projects.contact_id
        AND contacts.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = contact_projects.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY contact_projects_owner_update
  ON contact_projects
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = contact_projects.contact_id
        AND contacts.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = contact_projects.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = contact_projects.contact_id
        AND contacts.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = contact_projects.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY contact_projects_owner_delete
  ON contact_projects
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM contacts
      WHERE contacts.id = contact_projects.contact_id
        AND contacts.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = contact_projects.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_people_owner_select
  ON vendor_people
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_people.vendor_id
        AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_people_owner_insert
  ON vendor_people
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_people.vendor_id
        AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_people_owner_update
  ON vendor_people
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_people.vendor_id
        AND vendors.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_people.vendor_id
        AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_people_owner_delete
  ON vendor_people
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_people.vendor_id
        AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_companies_owner_select
  ON vendor_companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_companies.vendor_id
        AND vendors.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM companies
      WHERE companies.id = vendor_companies.company_id
        AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_companies_owner_insert
  ON vendor_companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_companies.vendor_id
        AND vendors.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM companies
      WHERE companies.id = vendor_companies.company_id
        AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_companies_owner_update
  ON vendor_companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_companies.vendor_id
        AND vendors.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM companies
      WHERE companies.id = vendor_companies.company_id
        AND companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_companies.vendor_id
        AND vendors.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM companies
      WHERE companies.id = vendor_companies.company_id
        AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_companies_owner_delete
  ON vendor_companies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_companies.vendor_id
        AND vendors.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM companies
      WHERE companies.id = vendor_companies.company_id
        AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_projects_owner_select
  ON vendor_projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_projects.vendor_id
        AND vendors.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = vendor_projects.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_projects_owner_insert
  ON vendor_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_projects.vendor_id
        AND vendors.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = vendor_projects.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_projects_owner_update
  ON vendor_projects
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_projects.vendor_id
        AND vendors.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = vendor_projects.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_projects.vendor_id
        AND vendors.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = vendor_projects.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_projects_owner_delete
  ON vendor_projects
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_projects.vendor_id
        AND vendors.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = vendor_projects.project_id
        AND projects.user_id = auth.uid()
    )
  );
