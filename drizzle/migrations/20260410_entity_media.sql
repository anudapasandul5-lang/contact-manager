ALTER TABLE contacts ADD COLUMN IF NOT EXISTS photo_path text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_path text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS logo_path text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'network-media'
  ) THEN
    INSERT INTO storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    )
    VALUES (
      'network-media',
      'network-media',
      false,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    );
  END IF;
END $$;

DROP POLICY IF EXISTS media_owner_select ON storage.objects;
CREATE POLICY media_owner_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'network-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS media_owner_insert ON storage.objects;
CREATE POLICY media_owner_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'network-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS media_owner_update ON storage.objects;
CREATE POLICY media_owner_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'network-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'network-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS media_owner_delete ON storage.objects;
CREATE POLICY media_owner_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'network-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
