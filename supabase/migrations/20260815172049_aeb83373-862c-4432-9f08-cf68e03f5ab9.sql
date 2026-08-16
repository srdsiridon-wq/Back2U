CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION app.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

CREATE OR REPLACE FUNCTION app.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('staff','admin'));
$$;

CREATE OR REPLACE FUNCTION app.item_is_public(_item_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (
    select 1 from public.items
    where id = _item_id and moderation_state = 'approved' and status <> 'archived'
  );
$$;

CREATE OR REPLACE FUNCTION app.moderates_school(_school_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role in ('moderator','school_admin')
      and ur.school_id = _school_id
  );
$$;

CREATE OR REPLACE FUNCTION app.moderates_item(_item_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (
    select 1 from public.items i
    where i.id = _item_id and app.moderates_school(i.school_id, _user_id)
  );
$$;

CREATE OR REPLACE FUNCTION app.owns_item(_item_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.items where id = _item_id and reporter_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION app.my_school_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select school_id from public.profiles where id = auth.uid();
$$;

REVOKE ALL ON FUNCTION app.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.is_staff(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.item_is_public(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.moderates_school(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.moderates_item(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.owns_item(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.my_school_id() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.is_staff(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.item_is_public(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.moderates_school(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.moderates_item(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.owns_item(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.my_school_id() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "moderators read analytics" ON public.analytics_events;
CREATE POLICY "moderators read analytics" ON public.analytics_events
  FOR SELECT TO authenticated USING (app.moderates_school(school_id, auth.uid()));

DROP POLICY IF EXISTS "moderators read audit log" ON public.audit_log;
CREATE POLICY "moderators read audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (app.moderates_item(entity_id, auth.uid()) OR actor_id = auth.uid());

DROP POLICY IF EXISTS "admins manage buildings" ON public.buildings;
CREATE POLICY "admins manage buildings" ON public.buildings
  FOR ALL TO authenticated
  USING (app.has_role(auth.uid(), 'admin')) WITH CHECK (app.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage schools" ON public.schools;
CREATE POLICY "admins manage schools" ON public.schools
  FOR ALL TO authenticated
  USING (app.has_role(auth.uid(), 'admin')) WITH CHECK (app.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "claims readable by involved parties" ON public.claims;
CREATE POLICY "claims readable by involved parties" ON public.claims
  FOR SELECT TO authenticated
  USING (claimant_id = auth.uid() OR app.owns_item(item_id, auth.uid()) OR app.moderates_item(item_id, auth.uid()));

DROP POLICY IF EXISTS "images of public items" ON public.item_images;
CREATE POLICY "images of public items" ON public.item_images
  FOR SELECT TO anon, authenticated USING (is_approved AND app.item_is_public(item_id));

DROP POLICY IF EXISTS "owners add images" ON public.item_images;
CREATE POLICY "owners add images" ON public.item_images
  FOR INSERT TO authenticated WITH CHECK (app.owns_item(item_id, auth.uid()));

DROP POLICY IF EXISTS "owners delete images" ON public.item_images;
CREATE POLICY "owners delete images" ON public.item_images
  FOR DELETE TO authenticated
  USING (app.owns_item(item_id, auth.uid()) OR app.moderates_item(item_id, auth.uid()));

DROP POLICY IF EXISTS "owners manage images" ON public.item_images;
CREATE POLICY "owners manage images" ON public.item_images
  FOR UPDATE TO authenticated
  USING (app.owns_item(item_id, auth.uid()) OR app.moderates_item(item_id, auth.uid()))
  WITH CHECK (app.owns_item(item_id, auth.uid()) OR app.moderates_item(item_id, auth.uid()));

DROP POLICY IF EXISTS "owners read own images" ON public.item_images;
CREATE POLICY "owners read own images" ON public.item_images
  FOR SELECT TO authenticated
  USING (app.owns_item(item_id, auth.uid()) OR app.moderates_item(item_id, auth.uid()));

DROP POLICY IF EXISTS "moderators update school items" ON public.items;
CREATE POLICY "moderators update school items" ON public.items
  FOR UPDATE TO authenticated
  USING (app.moderates_school(school_id, auth.uid())) WITH CHECK (app.moderates_school(school_id, auth.uid()));

DROP POLICY IF EXISTS "owners delete own items" ON public.items;
CREATE POLICY "owners delete own items" ON public.items
  FOR DELETE TO authenticated
  USING (reporter_id = auth.uid() OR app.moderates_school(school_id, auth.uid()));

DROP POLICY IF EXISTS "owners read own items" ON public.items;
CREATE POLICY "owners read own items" ON public.items
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR app.moderates_school(school_id, auth.uid()));

DROP POLICY IF EXISTS "moderators update matches" ON public.matches;
CREATE POLICY "moderators update matches" ON public.matches
  FOR UPDATE TO authenticated
  USING (app.moderates_item(found_item_id, auth.uid())) WITH CHECK (app.moderates_item(found_item_id, auth.uid()));

DROP POLICY IF EXISTS "participants read matches" ON public.matches;
CREATE POLICY "participants read matches" ON public.matches
  FOR SELECT TO authenticated
  USING (
    app.owns_item(lost_item_id, auth.uid()) OR app.owns_item(found_item_id, auth.uid())
    OR app.moderates_item(lost_item_id, auth.uid()) OR app.moderates_item(found_item_id, auth.uid())
  );

DROP POLICY IF EXISTS "moderators read flags" ON public.moderation_reports;
CREATE POLICY "moderators read flags" ON public.moderation_reports
  FOR SELECT TO authenticated
  USING (reported_by = auth.uid() OR app.moderates_item(item_id, auth.uid()));

DROP POLICY IF EXISTS "own profile readable" ON public.profiles;
CREATE POLICY "own profile readable" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR app.moderates_school(school_id, auth.uid()));

DROP POLICY IF EXISTS "returns readable by involved parties" ON public.returns;
CREATE POLICY "returns readable by involved parties" ON public.returns
  FOR SELECT TO authenticated
  USING (
    app.owns_item(item_id, auth.uid()) OR app.moderates_item(item_id, auth.uid())
    OR EXISTS (select 1 from public.claims c where c.id = returns.claim_id and c.claimant_id = auth.uid())
  );

DROP POLICY IF EXISTS "own roles readable" ON public.user_roles;
CREATE POLICY "own roles readable" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR app.moderates_school(school_id, auth.uid()));

DROP POLICY IF EXISTS "users read own item photos" ON storage.objects;
CREATE POLICY "users read own item photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'item-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR app.is_staff(auth.uid())));

DROP POLICY IF EXISTS "users delete own item photos" ON storage.objects;
CREATE POLICY "users delete own item photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'item-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR app.is_staff(auth.uid())));

CREATE OR REPLACE FUNCTION public.moderate_item(_item_id uuid, _action text, _note text DEFAULT NULL::text)
RETURNS public.items LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _actor uuid := auth.uid(); _item public.items;
begin
  if _actor is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  select * into _item from public.items where id = _item_id for update;
  if _item is null then raise exception 'ไม่พบรายการนี้'; end if;
  if not app.moderates_school(_item.school_id, _actor) then raise exception 'ไม่มีสิทธิ์'; end if;

  if _action = 'hide' then
    update public.items set moderation_state = 'rejected' where id = _item_id returning * into _item;
  elsif _action = 'restore' then
    update public.items set moderation_state = 'approved' where id = _item_id returning * into _item;
  elsif _action = 'archive' then
    update public.items set status = 'archived' where id = _item_id returning * into _item;
  else
    raise exception 'ไม่รู้จักคำสั่ง %', _action;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, detail)
  values (_actor, 'item.' || _action, 'item', _item_id, jsonb_build_object('note', _note));
  return _item;
end; $$;

CREATE OR REPLACE FUNCTION public.review_claim(_claim_id uuid, _next public.claim_state, _note text DEFAULT NULL::text)
RETURNS public.claims LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  _actor uuid := auth.uid();
  _claim public.claims;
  _item public.items;
begin
  if _actor is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  select * into _claim from public.claims where id = _claim_id for update;
  if _claim is null then raise exception 'ไม่พบคำขอรับคืนนี้'; end if;
  select * into _item from public.items where id = _claim.item_id for update;
  if not app.moderates_school(_item.school_id, _actor) then
    raise exception 'คุณไม่มีสิทธิ์ดำเนินการกับคำขอนี้';
  end if;

  if not (
    (_claim.state = 'pending'  and _next in ('reviewing','approved','rejected')) or
    (_claim.state = 'reviewing' and _next in ('approved','rejected')) or
    (_claim.state = 'approved' and _next in ('returned','rejected'))
  ) then
    raise exception 'เปลี่ยนสถานะจาก % เป็น % ไม่ได้', _claim.state, _next;
  end if;

  if _next in ('approved','returned') and exists (
    select 1 from public.claims c
    where c.item_id = _claim.item_id and c.id <> _claim.id
      and c.state in ('approved','collected','returned')
  ) then
    raise exception 'รายการนี้มีคำขอที่อนุมัติแล้ว';
  end if;

  update public.claims
     set state = _next, reviewed_by = _actor, reviewed_at = now()
   where id = _claim_id
  returning * into _claim;

  if _next = 'approved' then
    update public.items set status = 'claimed' where id = _item.id;
  elsif _next = 'returned' then
    update public.items set status = 'returned' where id = _item.id;
    insert into public.returns (claim_id, item_id, handed_over_by, notes)
    values (_claim.id, _item.id, _actor, _note);
  elsif _next = 'rejected' and _item.status = 'claimed' then
    update public.items set status = 'open' where id = _item.id;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, detail)
  values (_actor, 'claim.' || _next::text, 'claim', _claim.id,
          jsonb_build_object('item_id', _item.id, 'note', _note));

  return _claim;
end; $$;

CREATE OR REPLACE FUNCTION public.resolve_moderation_report(_report_id uuid, _status text, _note text DEFAULT NULL::text)
RETURNS public.moderation_reports LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _actor uuid := auth.uid(); _report public.moderation_reports;
begin
  if _actor is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  if _status not in ('resolved','dismissed') then raise exception 'สถานะไม่ถูกต้อง'; end if;

  select * into _report from public.moderation_reports where id = _report_id for update;
  if _report is null then raise exception 'ไม่พบรายงานนี้'; end if;
  if _report.item_id is null or not app.moderates_item(_report.item_id, _actor) then
    raise exception 'คุณไม่มีสิทธิ์จัดการรายงานนี้';
  end if;

  update public.moderation_reports
     set status = _status,
         resolution = coalesce(_note, resolution),
         resolved_by = _actor,
         resolved_at = now()
   where id = _report_id
  returning * into _report;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, detail)
  values (_actor, 'report.' || _status, 'item', _report.item_id,
          jsonb_build_object('report_id', _report.id, 'note', _note));

  return _report;
end; $$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff(uuid);
DROP FUNCTION IF EXISTS public.item_is_public(uuid);
DROP FUNCTION IF EXISTS public.moderates_item(uuid, uuid);
DROP FUNCTION IF EXISTS public.moderates_school(uuid, uuid);
DROP FUNCTION IF EXISTS public.owns_item(uuid, uuid);
DROP FUNCTION IF EXISTS public.my_school_id();

DROP POLICY IF EXISTS "moderators resolve flags" ON public.moderation_reports;
CREATE POLICY "moderators resolve flags" ON public.moderation_reports
  FOR UPDATE TO authenticated
  USING (app.moderates_item(item_id, auth.uid()))
  WITH CHECK (app.moderates_item(item_id, auth.uid()));
GRANT UPDATE ON public.moderation_reports TO authenticated;

DROP POLICY IF EXISTS "service role manages embeddings" ON public.item_embeddings;
CREATE POLICY "service role manages embeddings" ON public.item_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON public.item_embeddings TO service_role;

DROP POLICY IF EXISTS "service role manages rate events" ON public.rate_events;
CREATE POLICY "service role manages rate events" ON public.rate_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON public.rate_events TO service_role;