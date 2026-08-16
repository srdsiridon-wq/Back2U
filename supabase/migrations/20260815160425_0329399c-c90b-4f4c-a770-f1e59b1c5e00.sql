revoke execute on function public.set_updated_at() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.is_staff(uuid) from anon;
revoke execute on function public.owns_item(uuid, uuid) from anon;