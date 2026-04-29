DO $$ BEGIN
  -- Convert user_id from text to uuid if column is still text type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'user_id' AND data_type = 'text'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
  END IF;

  -- Add created_at if missing (baseline migration didn't include it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;

  -- Add FK to auth.users if no FK constraint exists yet
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'user_profiles'
      AND c.conname = 'user_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_owner_select ON user_profiles;
DROP POLICY IF EXISTS user_profiles_owner_insert ON user_profiles;
DROP POLICY IF EXISTS user_profiles_owner_update ON user_profiles;
DROP POLICY IF EXISTS user_profiles_owner_delete ON user_profiles;

CREATE POLICY user_profiles_owner_select
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_profiles_owner_insert
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_owner_update
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_owner_delete
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
