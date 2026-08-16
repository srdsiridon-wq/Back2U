-- ============ 1. School binding for elevated roles ============
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS user_roles_user_idx ON public.user_roles(user_id);

CREATE OR REPLACE FUNCTION public.moderates_school(_school_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT exists (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('moderator','school_admin')
      AND ur.school_id = _school_id
  );
$$;

CREATE OR REPLACE FUNCTION public.moderates_item(_item_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT exists (
    SELECT 1 FROM public.items i
    WHERE i.id = _item_id AND public.moderates_school(i.school_id, _user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.my_school_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============ 2. Profiles always belong to a school ============
UPDATE public.profiles SET school_id = '11111111-1111-4111-8111-111111111111'::uuid WHERE school_id IS NULL;
ALTER TABLE public.profiles ALTER COLUMN school_id SET DEFAULT '11111111-1111-4111-8111-111111111111'::uuid;
ALTER TABLE public.profiles ALTER COLUMN school_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into public.profiles (id, display_name, school_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    '11111111-1111-4111-8111-111111111111'::uuid
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role, school_id)
  values (new.id, 'student', '11111111-1111-4111-8111-111111111111'::uuid)
  on conflict (user_id, role) do nothing;
  return new;
end; $$;

-- ============ 3. Replace generic staff checks with school-scoped ones ============
DROP POLICY IF EXISTS "owners read own items" ON public.items;
CREATE POLICY "owners read own items" ON public.items FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.moderates_school(school_id, auth.uid()));
DROP POLICY IF EXISTS "staff update items" ON public.items;
CREATE POLICY "moderators update school items" ON public.items FOR UPDATE TO authenticated
  USING (public.moderates_school(school_id, auth.uid()))
  WITH CHECK (public.moderates_school(school_id, auth.uid()));
DROP POLICY IF EXISTS "owners delete own items" ON public.items;
CREATE POLICY "owners delete own items" ON public.items FOR DELETE TO authenticated
  USING (reporter_id = auth.uid() OR public.moderates_school(school_id, auth.uid()));

DROP POLICY IF EXISTS "owners read own images" ON public.item_images;
CREATE POLICY "owners read own images" ON public.item_images FOR SELECT TO authenticated
  USING (public.owns_item(item_id, auth.uid()) OR public.moderates_item(item_id, auth.uid()));
DROP POLICY IF EXISTS "owners manage images" ON public.item_images;
CREATE POLICY "owners manage images" ON public.item_images FOR UPDATE TO authenticated
  USING (public.owns_item(item_id, auth.uid()) OR public.moderates_item(item_id, auth.uid()))
  WITH CHECK (public.owns_item(item_id, auth.uid()) OR public.moderates_item(item_id, auth.uid()));
DROP POLICY IF EXISTS "owners delete images" ON public.item_images;
CREATE POLICY "owners delete images" ON public.item_images FOR DELETE TO authenticated
  USING (public.owns_item(item_id, auth.uid()) OR public.moderates_item(item_id, auth.uid()));

DROP POLICY IF EXISTS "claims readable by involved parties" ON public.claims;
CREATE POLICY "claims readable by involved parties" ON public.claims FOR SELECT TO authenticated
  USING (claimant_id = auth.uid() OR public.owns_item(item_id, auth.uid()) OR public.moderates_item(item_id, auth.uid()));
DROP POLICY IF EXISTS "staff review claims" ON public.claims;
DROP POLICY IF EXISTS "claimant updates own pending claim" ON public.claims;
CREATE POLICY "claimant edits own pending claim" ON public.claims FOR UPDATE TO authenticated
  USING (claimant_id = auth.uid() AND state IN ('pending','reviewing'))
  WITH CHECK (claimant_id = auth.uid() AND state IN ('pending','reviewing','cancelled'));

DROP POLICY IF EXISTS "participants read matches" ON public.matches;
CREATE POLICY "participants read matches" ON public.matches FOR SELECT TO authenticated
  USING (public.owns_item(lost_item_id, auth.uid()) OR public.owns_item(found_item_id, auth.uid())
         OR public.moderates_item(lost_item_id, auth.uid()) OR public.moderates_item(found_item_id, auth.uid()));
DROP POLICY IF EXISTS "staff update matches" ON public.matches;
CREATE POLICY "moderators update matches" ON public.matches FOR UPDATE TO authenticated
  USING (public.moderates_item(found_item_id, auth.uid()))
  WITH CHECK (public.moderates_item(found_item_id, auth.uid()));

DROP POLICY IF EXISTS "staff read flags" ON public.moderation_reports;
CREATE POLICY "moderators read flags" ON public.moderation_reports FOR SELECT TO authenticated
  USING (reported_by = auth.uid() OR public.moderates_item(item_id, auth.uid()));

DROP POLICY IF EXISTS "returns readable by involved parties" ON public.returns;
CREATE POLICY "returns readable by involved parties" ON public.returns FOR SELECT TO authenticated
  USING (public.owns_item(item_id, auth.uid()) OR public.moderates_item(item_id, auth.uid())
         OR exists (SELECT 1 FROM public.claims c WHERE c.id = claim_id AND c.claimant_id = auth.uid()));
DROP POLICY IF EXISTS "staff record returns" ON public.returns;

DROP POLICY IF EXISTS "own profile readable" ON public.profiles;
CREATE POLICY "own profile readable" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.moderates_school(school_id, auth.uid()));

DROP POLICY IF EXISTS "own roles readable" ON public.user_roles;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.moderates_school(school_id, auth.uid()));

DROP POLICY IF EXISTS "admins read audit log" ON public.audit_log;
CREATE POLICY "moderators read audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.moderates_item(entity_id, auth.uid()) OR actor_id = auth.uid());

-- ============ 4. Indexes and integrity ============
CREATE INDEX IF NOT EXISTS items_feed_idx ON public.items(school_id, kind, status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS items_reporter_idx ON public.items(reporter_id);
CREATE INDEX IF NOT EXISTS items_category_idx ON public.items(school_id, category);
CREATE INDEX IF NOT EXISTS claims_item_idx ON public.claims(item_id);
CREATE INDEX IF NOT EXISTS claims_claimant_idx ON public.claims(claimant_id);
CREATE INDEX IF NOT EXISTS matches_lost_idx ON public.matches(lost_item_id);
CREATE INDEX IF NOT EXISTS matches_found_idx ON public.matches(found_item_id);
CREATE INDEX IF NOT EXISTS item_images_item_idx ON public.item_images(item_id);
CREATE UNIQUE INDEX IF NOT EXISTS claims_one_settled_per_item ON public.claims(item_id)
  WHERE state IN ('approved','collected','returned');

-- ============ 5. Claim lifecycle (transactional, moderator only) ============
CREATE OR REPLACE FUNCTION public.review_claim(_claim_id uuid, _next claim_state, _note text DEFAULT NULL)
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
  if not public.moderates_school(_item.school_id, _actor) then
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

CREATE OR REPLACE FUNCTION public.cancel_claim(_claim_id uuid)
RETURNS public.claims LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _actor uuid := auth.uid(); _claim public.claims;
begin
  if _actor is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  select * into _claim from public.claims where id = _claim_id for update;
  if _claim is null or _claim.claimant_id <> _actor then raise exception 'ไม่พบคำขอของคุณ'; end if;
  if _claim.state not in ('pending','reviewing') then raise exception 'ยกเลิกคำขอนี้ไม่ได้แล้ว'; end if;
  update public.claims set state = 'cancelled' where id = _claim_id returning * into _claim;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, detail)
  values (_actor, 'claim.cancelled', 'claim', _claim.id, jsonb_build_object('item_id', _claim.item_id));
  return _claim;
end; $$;

CREATE OR REPLACE FUNCTION public.moderate_item(_item_id uuid, _action text, _note text DEFAULT NULL)
RETURNS public.items LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _actor uuid := auth.uid(); _item public.items;
begin
  if _actor is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  select * into _item from public.items where id = _item_id for update;
  if _item is null then raise exception 'ไม่พบรายการนี้'; end if;
  if not public.moderates_school(_item.school_id, _actor) then raise exception 'ไม่มีสิทธิ์'; end if;

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

REVOKE ALL ON FUNCTION public.review_claim(uuid, public.claim_state, text) FROM anon;
REVOKE ALL ON FUNCTION public.cancel_claim(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.moderate_item(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.moderates_school(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.moderates_item(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.my_school_id() FROM anon;

-- ============ 6. Semantic embeddings cache ============
CREATE TABLE IF NOT EXISTS public.item_embeddings (
  item_id uuid PRIMARY KEY REFERENCES public.items(id) ON DELETE CASCADE,
  source_hash text NOT NULL,
  model text NOT NULL,
  embedding jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.item_embeddings TO service_role;
ALTER TABLE public.item_embeddings ENABLE ROW LEVEL SECURITY;
-- no policies: only the server (service role) touches embeddings

-- ============ 7. Analytics events ============
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  event text NOT NULL,
  item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  claim_id uuid REFERENCES public.claims(id) ON DELETE SET NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_school_idx ON public.analytics_events(school_id, event, created_at DESC);
GRANT ALL ON public.analytics_events TO service_role;
GRANT SELECT ON public.analytics_events TO authenticated;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderators read analytics" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.moderates_school(school_id, auth.uid()));