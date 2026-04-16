-- Fix: contact_companies.company_id FK had ON DELETE NO ACTION (constraint: fk_cc_company),
-- which blocks deletion of any company that has linked contacts.
-- Replace with CASCADE so contact_companies rows are removed automatically.

ALTER TABLE contact_companies DROP CONSTRAINT IF EXISTS fk_cc_company;

ALTER TABLE contact_companies
  ADD CONSTRAINT contact_companies_company_id_fkey
  FOREIGN KEY (company_id)
  REFERENCES companies (id)
  ON DELETE CASCADE;
