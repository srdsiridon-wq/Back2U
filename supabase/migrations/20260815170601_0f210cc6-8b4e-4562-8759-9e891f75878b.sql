-- 1. New reports start pending; new images start unapproved.
ALTER TABLE public.items ALTER COLUMN moderation_state SET DEFAULT 'pending'::moderation_state;
ALTER TABLE public.item_images ALTER COLUMN is_approved SET DEFAULT false;

-- Approving an item approves its images.
CREATE OR REPLACE FUNCTION public.sync_item_image_approval()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
begin
  if new.moderation_state = 'approved' and coalesce(old.moderation_state, 'pending') <> 'approved' then
    update public.item_images set is_approved = true where item_id = new.id;
  elsif new.moderation_state = 'rejected' and coalesce(old.moderation_state, 'pending') <> 'rejected' then
    update public.item_images set is_approved = false where item_id = new.id;
  end if;
  return new;
end; $$;

DROP TRIGGER IF EXISTS items_sync_image_approval ON public.items;
CREATE TRIGGER items_sync_image_approval
AFTER UPDATE OF moderation_state ON public.items
FOR EACH ROW EXECUTE FUNCTION public.sync_item_image_approval();

-- 2. Moderation reports lifecycle.
ALTER TABLE public.moderation_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

DO $$ BEGIN
  ALTER TABLE public.moderation_reports
    ADD CONSTRAINT moderation_reports_status_check
    CHECK (status IN ('open', 'resolved', 'dismissed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS moderation_reports_status_idx
  ON public.moderation_reports (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.resolve_moderation_report(
  _report_id uuid,
  _status text,
  _note text DEFAULT NULL
) RETURNS public.moderation_reports
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare _actor uuid := auth.uid(); _report public.moderation_reports;
begin
  if _actor is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  if _status not in ('resolved','dismissed') then raise exception 'สถานะไม่ถูกต้อง'; end if;

  select * into _report from public.moderation_reports where id = _report_id for update;
  if _report is null then raise exception 'ไม่พบรายงานนี้'; end if;
  if _report.item_id is null or not public.moderates_item(_report.item_id, _actor) then
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

-- 3. Protect claim / return history: no cascade deletes from items.
ALTER TABLE public.claims DROP CONSTRAINT IF EXISTS claims_item_id_fkey;
ALTER TABLE public.claims
  ADD CONSTRAINT claims_item_id_fkey FOREIGN KEY (item_id)
  REFERENCES public.items(id) ON DELETE RESTRICT;

ALTER TABLE public.returns DROP CONSTRAINT IF EXISTS returns_item_id_fkey;
ALTER TABLE public.returns
  ADD CONSTRAINT returns_item_id_fkey FOREIGN KEY (item_id)
  REFERENCES public.items(id) ON DELETE RESTRICT;

ALTER TABLE public.returns DROP CONSTRAINT IF EXISTS returns_claim_id_fkey;
ALTER TABLE public.returns
  ADD CONSTRAINT returns_claim_id_fkey FOREIGN KEY (claim_id)
  REFERENCES public.claims(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.guard_item_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
begin
  if exists (select 1 from public.claims where item_id = old.id)
     or exists (select 1 from public.returns where item_id = old.id) then
    raise exception 'รายการนี้มีประวัติคำขอรับคืนแล้ว ลบถาวรไม่ได้ กรุณาเก็บเข้าคลังแทน';
  end if;
  return old;
end; $$;

DROP TRIGGER IF EXISTS items_guard_delete ON public.items;
CREATE TRIGGER items_guard_delete
BEFORE DELETE ON public.items
FOR EACH ROW EXECUTE FUNCTION public.guard_item_delete();

-- 4. Stale matches: drop suggestions when matching inputs change or the item closes.
CREATE OR REPLACE FUNCTION public.invalidate_stale_matches()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
begin
  if new.category is distinct from old.category
     or new.color is distinct from old.color
     or new.description is distinct from old.description
     or new.title is distinct from old.title
     or new.building_code is distinct from old.building_code
     or new.floor is distinct from old.floor
     or new.room is distinct from old.room
     or new.occurred_at is distinct from old.occurred_at
     or (new.status in ('returned','archived') and old.status not in ('returned','archived'))
     or (new.moderation_state = 'rejected' and old.moderation_state <> 'rejected')
  then
    delete from public.matches where lost_item_id = new.id or found_item_id = new.id;
    delete from public.item_embeddings where item_id = new.id
      and (new.title is distinct from old.title or new.description is distinct from old.description
           or new.category is distinct from old.category or new.color is distinct from old.color);
  end if;
  return new;
end; $$;

DROP TRIGGER IF EXISTS items_invalidate_matches ON public.items;
CREATE TRIGGER items_invalidate_matches
AFTER UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION public.invalidate_stale_matches();

-- 5. Server-side abuse counters (admin-only table).
CREATE TABLE IF NOT EXISTS public.rate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rate_events TO service_role;
ALTER TABLE public.rate_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS rate_events_lookup_idx
  ON public.rate_events (bucket, subject, created_at DESC);

-- 6. Privilege tightening: anon may not execute privileged action RPCs.
REVOKE EXECUTE ON FUNCTION public.review_claim(uuid, claim_state, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_claim(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.moderate_item(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_moderation_report(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.moderates_school(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.moderates_item(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owns_item(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_school_id() FROM anon;

GRANT EXECUTE ON FUNCTION public.review_claim(uuid, claim_state, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_claim(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_item(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_moderation_report(uuid, text, text) TO authenticated;