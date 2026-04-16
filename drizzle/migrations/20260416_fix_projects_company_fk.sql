-- Fix: projects.company_id FK had no ON DELETE clause (defaults to RESTRICT),
-- which blocks deletion of any company that has linked projects.
-- Change to SET NULL so projects survive company deletion.

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_company_id_fkey;

ALTER TABLE projects
  ADD CONSTRAINT projects_company_id_fkey
  FOREIGN KEY (company_id)
  REFERENCES companies (id)
  ON DELETE SET NULL;
