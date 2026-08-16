DROP POLICY IF EXISTS "users upload own item photos" ON storage.objects;
CREATE POLICY "users upload own item photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'item-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp')
  AND (
    metadata IS NULL
    OR (
      coalesce(metadata->>'mimetype', 'image/jpeg') IN ('image/jpeg','image/png','image/webp')
      AND coalesce((metadata->>'size')::bigint, 0) <= 5242880
    )
  )
);

DROP POLICY IF EXISTS "users update own item photos" ON storage.objects;
CREATE POLICY "users update own item photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'item-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'item-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp')
  AND (
    metadata IS NULL
    OR (
      coalesce(metadata->>'mimetype', 'image/jpeg') IN ('image/jpeg','image/png','image/webp')
      AND coalesce((metadata->>'size')::bigint, 0) <= 5242880
    )
  )
);