CREATE TABLE IF NOT EXISTS follow_ups (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id text NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id text REFERENCES companies(id) ON DELETE SET NULL,
  project_id text REFERENCES projects(id) ON DELETE SET NULL,
  objective text NOT NULL,
  notes text,
  scheduled_for timestamptz NOT NULL,
  completed_at timestamptz,
  completion_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS follow_ups_one_open_per_contact_idx
  ON follow_ups (user_id, contact_id)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS follow_ups_user_scheduled_idx
  ON follow_ups (user_id, scheduled_for);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS follow_ups_owner_select ON follow_ups;
DROP POLICY IF EXISTS follow_ups_owner_insert ON follow_ups;
DROP POLICY IF EXISTS follow_ups_owner_update ON follow_ups;
DROP POLICY IF EXISTS follow_ups_owner_delete ON follow_ups;

CREATE POLICY follow_ups_owner_select
  ON follow_ups
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY follow_ups_owner_insert
  ON follow_ups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY follow_ups_owner_update
  ON follow_ups
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY follow_ups_owner_delete
  ON follow_ups
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE TRIGGER follow_ups_updated_at
  BEFORE UPDATE ON follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION complete_follow_up_with_optional_next(
  p_follow_up_id text,
  p_user_id uuid,
  p_completion_note text DEFAULT NULL,
  p_next_follow_up jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_row jsonb;
  v_next_row jsonb;
BEGIN
  UPDATE follow_ups
     SET completed_at = now(),
         completion_note = p_completion_note
   WHERE id = p_follow_up_id
     AND user_id = p_user_id
     AND completed_at IS NULL
  RETURNING to_jsonb(follow_ups.*) INTO v_completed_row;

  IF v_completed_row IS NULL THEN
    RAISE EXCEPTION 'follow-up not found or already completed';
  END IF;

  IF p_next_follow_up IS NOT NULL THEN
    INSERT INTO follow_ups (
      id,
      user_id,
      contact_id,
      company_id,
      project_id,
      objective,
      notes,
      scheduled_for
    )
    VALUES (
      gen_random_uuid()::text,
      p_user_id,
      p_next_follow_up->>'contact_id',
      NULLIF(p_next_follow_up->>'company_id', ''),
      NULLIF(p_next_follow_up->>'project_id', ''),
      p_next_follow_up->>'objective',
      NULLIF(p_next_follow_up->>'notes', ''),
      (p_next_follow_up->>'scheduled_for')::timestamptz
    )
    RETURNING to_jsonb(follow_ups.*) INTO v_next_row;
  END IF;

  RETURN jsonb_build_object(
    'completed', v_completed_row,
    'next', v_next_row
  );
END;
$$;
