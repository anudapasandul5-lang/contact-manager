ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendors_authenticated_select ON vendors;
CREATE POLICY vendors_authenticated_select
  ON vendors
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS vendors_authenticated_insert ON vendors;
CREATE POLICY vendors_authenticated_insert
  ON vendors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS vendors_authenticated_update ON vendors;
CREATE POLICY vendors_authenticated_update
  ON vendors
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS vendors_authenticated_delete ON vendors;
CREATE POLICY vendors_authenticated_delete
  ON vendors
  FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS vendor_people_authenticated_select ON vendor_people;
CREATE POLICY vendor_people_authenticated_select
  ON vendor_people
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS vendor_people_authenticated_insert ON vendor_people;
CREATE POLICY vendor_people_authenticated_insert
  ON vendor_people
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS vendor_people_authenticated_update ON vendor_people;
CREATE POLICY vendor_people_authenticated_update
  ON vendor_people
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS vendor_people_authenticated_delete ON vendor_people;
CREATE POLICY vendor_people_authenticated_delete
  ON vendor_people
  FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS vendor_companies_authenticated_select ON vendor_companies;
CREATE POLICY vendor_companies_authenticated_select
  ON vendor_companies
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS vendor_companies_authenticated_insert ON vendor_companies;
CREATE POLICY vendor_companies_authenticated_insert
  ON vendor_companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS vendor_companies_authenticated_update ON vendor_companies;
CREATE POLICY vendor_companies_authenticated_update
  ON vendor_companies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS vendor_companies_authenticated_delete ON vendor_companies;
CREATE POLICY vendor_companies_authenticated_delete
  ON vendor_companies
  FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS vendor_projects_authenticated_select ON vendor_projects;
CREATE POLICY vendor_projects_authenticated_select
  ON vendor_projects
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS vendor_projects_authenticated_insert ON vendor_projects;
CREATE POLICY vendor_projects_authenticated_insert
  ON vendor_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS vendor_projects_authenticated_update ON vendor_projects;
CREATE POLICY vendor_projects_authenticated_update
  ON vendor_projects
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS vendor_projects_authenticated_delete ON vendor_projects;
CREATE POLICY vendor_projects_authenticated_delete
  ON vendor_projects
  FOR DELETE
  TO authenticated
  USING (true);
