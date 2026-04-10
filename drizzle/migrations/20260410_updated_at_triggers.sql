-- drizzle/migrations/20260410_updated_at_triggers.sql
-- Auto-updates the updated_at column on every UPDATE for tables that have it.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER person_relationships_updated_at
  BEFORE UPDATE ON person_relationships
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER intro_requests_updated_at
  BEFORE UPDATE ON intro_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
