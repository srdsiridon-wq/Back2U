create policy "users upload own item photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read own item photos" on storage.objects for select to authenticated
  using (bucket_id = 'item-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff(auth.uid())));
create policy "users update own item photos" on storage.objects for update to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own item photos" on storage.objects for delete to authenticated
  using (bucket_id = 'item-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff(auth.uid())));