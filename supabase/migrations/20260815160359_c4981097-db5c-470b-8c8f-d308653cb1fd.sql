create type public.app_role as enum ('student','staff','admin');
create type public.item_kind as enum ('lost','found');
create type public.item_status as enum ('open','matched','claimed','returned','archived');
create type public.moderation_state as enum ('pending','approved','rejected');
create type public.match_state as enum ('suggested','confirmed','dismissed');
create type public.claim_state as enum ('pending','approved','rejected','collected');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.schools to anon, authenticated;
grant all on public.schools to service_role;
alter table public.schools enable row level security;

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  code text not null,
  name text not null,
  x numeric not null default 0,
  y numeric not null default 0,
  w numeric not null default 10,
  h numeric not null default 10,
  floor_plans jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (school_id, code)
);
grant select on public.buildings to anon, authenticated;
grant all on public.buildings to service_role;
alter table public.buildings enable row level security;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  display_name text not null default '',
  grade text,
  contact_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('staff','admin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'student')
  on conflict (user_id, role) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  kind public.item_kind not null,
  title text not null,
  description text not null default '',
  category text not null,
  color text not null,
  building_code text,
  floor text,
  room text,
  occurred_at timestamptz not null default now(),
  status public.item_status not null default 'open',
  moderation_state public.moderation_state not null default 'approved',
  handover_point text,
  reporter_label text,
  legacy_image_key text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_school_idx on public.items (school_id, kind, status);
create index items_public_idx on public.items (moderation_state, status, occurred_at desc);
create index items_category_idx on public.items (category);
create index items_color_idx on public.items (color);
create index items_building_idx on public.items (building_code);
create index items_reporter_idx on public.items (reporter_id);
create index items_search_idx on public.items using gin (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
);
grant select on public.items to anon;
grant select, insert, update, delete on public.items to authenticated;
grant all on public.items to service_role;
alter table public.items enable row level security;
create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

create or replace function public.owns_item(_item_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.items where id = _item_id and reporter_id = _user_id);
$$;

create or replace function public.item_is_public(_item_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.items
    where id = _item_id and moderation_state = 'approved' and status <> 'archived'
  );
$$;

create table public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  is_approved boolean not null default true,
  created_at timestamptz not null default now()
);
create index item_images_item_idx on public.item_images (item_id, sort_order);
grant select on public.item_images to anon;
grant select, insert, update, delete on public.item_images to authenticated;
grant all on public.item_images to service_role;
alter table public.item_images enable row level security;

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  lost_item_id uuid not null references public.items(id) on delete cascade,
  found_item_id uuid not null references public.items(id) on delete cascade,
  score int not null default 0,
  reasons jsonb not null default '[]'::jsonb,
  state public.match_state not null default 'suggested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lost_item_id, found_item_id)
);
create index matches_lost_idx on public.matches (lost_item_id, score desc);
create index matches_found_idx on public.matches (found_item_id, score desc);
grant select on public.matches to authenticated;
grant all on public.matches to service_role;
alter table public.matches enable row level security;
create trigger matches_updated_at before update on public.matches
  for each row execute function public.set_updated_at();

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  claimant_id uuid not null references auth.users(id) on delete cascade,
  message text not null default '',
  proof text,
  state public.claim_state not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index claims_item_idx on public.claims (item_id, state);
create index claims_claimant_idx on public.claims (claimant_id);
grant select, insert, update on public.claims to authenticated;
grant all on public.claims to service_role;
alter table public.claims enable row level security;
create trigger claims_updated_at before update on public.claims
  for each row execute function public.set_updated_at();

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null unique references public.claims(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  handed_over_by uuid references auth.users(id) on delete set null,
  collected_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert on public.returns to authenticated;
grant all on public.returns to service_role;
alter table public.returns enable row level security;

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete cascade,
  image_id uuid references public.item_images(id) on delete cascade,
  reported_by uuid references auth.users(id) on delete set null,
  reason text not null,
  resolution text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert on public.moderation_reports to authenticated;
grant all on public.moderation_reports to service_role;
alter table public.moderation_reports enable row level security;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;

create policy "schools readable by everyone" on public.schools for select to anon, authenticated using (true);
create policy "admins manage schools" on public.schools for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "buildings readable by everyone" on public.buildings for select to anon, authenticated using (true);
create policy "admins manage buildings" on public.buildings for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "own profile readable" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "own roles readable" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy "approved items are public" on public.items for select to anon, authenticated
  using (moderation_state = 'approved' and status <> 'archived');
create policy "owners read own items" on public.items for select to authenticated
  using (reporter_id = auth.uid() or public.is_staff(auth.uid()));
create policy "authenticated create own items" on public.items for insert to authenticated
  with check (reporter_id = auth.uid());
create policy "owners update own items" on public.items for update to authenticated
  using (reporter_id = auth.uid()) with check (reporter_id = auth.uid());
create policy "staff update items" on public.items for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "owners delete own items" on public.items for delete to authenticated
  using (reporter_id = auth.uid() or public.is_staff(auth.uid()));

create policy "images of public items" on public.item_images for select to anon, authenticated
  using (is_approved and public.item_is_public(item_id));
create policy "owners read own images" on public.item_images for select to authenticated
  using (public.owns_item(item_id, auth.uid()) or public.is_staff(auth.uid()));
create policy "owners add images" on public.item_images for insert to authenticated
  with check (public.owns_item(item_id, auth.uid()));
create policy "owners manage images" on public.item_images for update to authenticated
  using (public.owns_item(item_id, auth.uid()) or public.is_staff(auth.uid()))
  with check (public.owns_item(item_id, auth.uid()) or public.is_staff(auth.uid()));
create policy "owners delete images" on public.item_images for delete to authenticated
  using (public.owns_item(item_id, auth.uid()) or public.is_staff(auth.uid()));

create policy "participants read matches" on public.matches for select to authenticated
  using (
    public.owns_item(lost_item_id, auth.uid())
    or public.owns_item(found_item_id, auth.uid())
    or public.is_staff(auth.uid())
  );
create policy "staff update matches" on public.matches for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy "claims readable by involved parties" on public.claims for select to authenticated
  using (claimant_id = auth.uid() or public.owns_item(item_id, auth.uid()) or public.is_staff(auth.uid()));
create policy "create own claim" on public.claims for insert to authenticated
  with check (claimant_id = auth.uid());
create policy "claimant updates own pending claim" on public.claims for update to authenticated
  using (claimant_id = auth.uid() and state = 'pending') with check (claimant_id = auth.uid());
create policy "staff review claims" on public.claims for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy "returns readable by involved parties" on public.returns for select to authenticated
  using (public.owns_item(item_id, auth.uid()) or public.is_staff(auth.uid()));
create policy "staff record returns" on public.returns for insert to authenticated
  with check (public.is_staff(auth.uid()));

create policy "authenticated can flag" on public.moderation_reports for insert to authenticated
  with check (reported_by = auth.uid());
create policy "staff read flags" on public.moderation_reports for select to authenticated
  using (public.is_staff(auth.uid()) or reported_by = auth.uid());

create policy "admins read audit log" on public.audit_log for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

insert into public.schools (id, slug, name) values
  ('11111111-1111-4111-8111-111111111111','back2u-demo','โรงเรียนสาธิต Back2U');

insert into public.buildings (school_id, code, name, x, y, w, h, sort_order, floor_plans) values
  ('11111111-1111-4111-8111-111111111111','main','อาคารเรียนรวม',6,6,40,24,1,'[]'::jsonb),
  ('11111111-1111-4111-8111-111111111111','science','อาคารวิทยาศาสตร์',54,6,40,24,2,
    '[{"floor":"ชั้น 2","spaces":[{"label":"บันได","kind":"stairs","x":2,"y":4,"w":15,"h":34},{"label":"ห้อง 201","kind":"room","x":19,"y":4,"w":25,"h":34},{"label":"ห้อง 202","kind":"room","x":46,"y":4,"w":25,"h":34},{"label":"ห้อง 203","kind":"room","x":73,"y":4,"w":25,"h":34},{"label":"ทางเดิน","kind":"corridor","x":2,"y":40,"w":96,"h":14},{"label":"ห้อง 204","kind":"room","x":2,"y":56,"w":26,"h":38},{"label":"ห้อง 205","kind":"room","x":30,"y":56,"w":24,"h":38},{"label":"ห้อง 206","kind":"room","x":56,"y":56,"w":20,"h":38},{"label":"แล็บ 2B","kind":"special","x":78,"y":56,"w":20,"h":38}]}]'::jsonb),
  ('11111111-1111-4111-8111-111111111111','library','ห้องสมุด',6,38,28,24,3,'[]'::jsonb),
  ('11111111-1111-4111-8111-111111111111','cafeteria','โรงอาหาร',40,38,24,24,4,'[]'::jsonb),
  ('11111111-1111-4111-8111-111111111111','arts','อาคารศิลปะและดนตรี',70,38,24,24,5,'[]'::jsonb),
  ('11111111-1111-4111-8111-111111111111','gym','โรงยิม',6,70,32,24,6,'[]'::jsonb),
  ('11111111-1111-4111-8111-111111111111','field','สนามกีฬา',44,70,50,24,7,'[]'::jsonb);

insert into public.items
  (school_id, kind, title, description, category, color, building_code, floor, room, occurred_at, handover_point, reporter_label, legacy_image_key, is_demo)
values
  ('11111111-1111-4111-8111-111111111111','found','กระเป๋าดินสอสีน้ำเงิน','กระเป๋าดินสอสีน้ำเงิน มีสติกเกอร์รูปแมวเล็ก ๆ ติดอยู่ ปิดด้วยซิป ข้างในมีปากกาไม่กี่ด้าม','Stationery','Blue','science','ชั้น 2','ห้อง 204','2026-08-14T15:20:00+07','เคาน์เตอร์อาคารวิทยาศาสตร์','ครูอลิสา (เคมี)','pencilCase',true),
  ('11111111-1111-4111-8111-111111111111','lost','กระเป๋าดินสอ','กระเป๋าดินสอสีน้ำเงินของหนู มีสติกเกอร์แมวติดด้านหน้า หายหลังเรียนเคมี','Stationery','Blue','science','ชั้น 2',null,'2026-08-14T14:05:00+07',null,'มินา ม.4','pencilCase',true),
  ('11111111-1111-4111-8111-111111111111','found','หูฟังไร้สาย','หูฟังไร้สายสีขาว อยู่ในเคสชาร์จอันเล็ก ฝาเคสมีรอยขีดข่วน','Electronics','White','library','ชั้น 1','โซนอ่านเงียบ','2026-08-14T11:40:00+07','เคาน์เตอร์ห้องสมุด',null,'earbuds',true),
  ('11111111-1111-4111-8111-111111111111','found','ขวดน้ำสเตนเลส','ขวดน้ำเก็บอุณหภูมิสีเงิน มีรอยบุบใกล้ก้นขวด','Bottles','Silver','gym','ชั้น 1','สนาม A','2026-08-13T16:55:00+07','ห้องพักครูพลศึกษา',null,'waterBottle',true),
  ('11111111-1111-4111-8111-111111111111','found','กระเป๋าเป้สีดำ','กระเป๋าเป้สีดำเรียบ ๆ ซิปข้างเสีย ข้างในมีหนังสือคณิตศาสตร์','Bags','Black','main','ชั้น 1','ทางเดิน B','2026-08-13T08:30:00+07','ห้องธุรการ',null,'backpack',true),
  ('11111111-1111-4111-8111-111111111111','found','เสื้อฮู้ดสีเทา','เสื้อฮู้ดสวมหัวสีเทา ไซซ์ M ป้ายชื่อที่คอเสื้อจางแล้ว','Clothing','Grey','field',null,null,'2026-08-12T17:10:00+07','ห้องพักครูพลศึกษา',null,'hoodie',true),
  ('11111111-1111-4111-8111-111111111111','found','พวงกุญแจพร้อมบัตรนักเรียน','กุญแจสองดอกคล้องสายคล้องสีดำ มีบัตรนักเรียนสีขาวติดอยู่','Keys & Cards','Black','cafeteria','ชั้น 1',null,'2026-08-14T12:25:00+07','ห้องธุรการ',null,'keys',true),
  ('11111111-1111-4111-8111-111111111111','found','สมุดสีส้ม','สมุดสันห่วงสีส้ม ข้างในเต็มไปด้วยโน้ตและภาพวาดวิชาชีววิทยา','Books','Orange','science','ชั้น 1','ห้อง 108','2026-08-12T10:15:00+07','เคาน์เตอร์อาคารวิทยาศาสตร์',null,'stationery',true),
  ('11111111-1111-4111-8111-111111111111','found','เครื่องคิดเลขวิทยาศาสตร์','เครื่องคิดเลขวิทยาศาสตร์สีดำ เขียนชื่อย่อไว้ด้านหลังด้วยปากกาเมจิก','Electronics','Black','main','ชั้น 2','ห้อง 210','2026-08-11T13:45:00+07','ห้องธุรการ',null,'stationery',true),
  ('11111111-1111-4111-8111-111111111111','found','แว่นตาสีดำ','แว่นตากรอบเหลี่ยมสีดำ ไม่มีกล่อง วางลืมไว้บนโต๊ะอ่านหนังสือ','Other','Black','library','ชั้น 2',null,'2026-08-11T09:05:00+07','เคาน์เตอร์ห้องสมุด',null,'misc',true),
  ('11111111-1111-4111-8111-111111111111','found','ร่มพับ','ร่มพับขนาดเล็กสีดำ ก้านร่มงอเล็กน้อย','Other','Black','main','ชั้น 1','โถงทางเข้า','2026-08-10T08:20:00+07','ห้องธุรการ',null,'misc',true),
  ('11111111-1111-4111-8111-111111111111','found','ขวดน้ำสีชมพู','ขวดน้ำพลาสติกสีชมพู ติดสติกเกอร์หลายอัน มีหลอดแบบเปิด-ปิด','Bottles','Pink','cafeteria','ชั้น 1',null,'2026-08-13T12:50:00+07','เคาน์เตอร์โรงอาหาร',null,'waterBottle',true),
  ('11111111-1111-4111-8111-111111111111','found','ถุงผ้ากีฬาสีแดง','ถุงผ้าหูรูดสีแดงสำหรับวิชาพลศึกษา ข้างในมีรองเท้าผ้าใบและผ้าเช็ดตัว','Sports','Red','gym','ชั้น 1','ห้องเปลี่ยนชุด 2','2026-08-12T15:30:00+07','ห้องพักครูพลศึกษา',null,'backpack',true),
  ('11111111-1111-4111-8111-111111111111','found','แฟ้มโน้ตเพลง','แฟ้มห่วงสีดำ ข้างในมีโน้ตเพลงสำหรับคอนเสิร์ตของโรงเรียน','Books','Black','arts','ชั้น 1','ห้องซ้อม 3','2026-08-11T16:40:00+07','ห้องพักครูศิลปะ',null,'stationery',true),
  ('11111111-1111-4111-8111-111111111111','found','เสื้อไหมพรมโรงเรียนสีน้ำเงิน','เสื้อไหมพรมโรงเรียนสีน้ำเงินเข้ม ไซซ์ S ลืมไว้บนม้านั่งหลังพักกลางวัน','Clothing','Blue','cafeteria','ชั้น 1',null,'2026-08-14T13:10:00+07','เคาน์เตอร์โรงอาหาร',null,'hoodie',true),
  ('11111111-1111-4111-8111-111111111111','found','หูฟังครอบหู','หูฟังครอบหูสีเงิน พับได้ ไม่มีกล่องใส่','Electronics','Silver','library','ชั้น 1',null,'2026-08-10T14:00:00+07','เคาน์เตอร์ห้องสมุด',null,'earbuds',true),
  ('11111111-1111-4111-8111-111111111111','lost','ขวดน้ำสีเขียว','ขวดน้ำโลหะสีเขียว มีที่เกี่ยวแบบปีนเขา หายแถว ๆ สนาม','Bottles','Green','gym',null,null,'2026-08-13T17:20:00+07',null,'โจนาห์ ม.3','waterBottle',true),
  ('11111111-1111-4111-8111-111111111111','lost','หูฟังสีดำ','หูฟังสีดำอยู่ในเคสเล็ก ๆ หายตอนพักเช้า','Electronics','Black','main','ชั้น 1',null,'2026-08-12T10:45:00+07',null,'ปรียา ม.5','earbuds',true),
  ('11111111-1111-4111-8111-111111111111','lost','แฟ้มสีเหลือง','แฟ้มสีเหลือง ข้างในมีงานวิชาประวัติศาสตร์ หายหลังคาบสุดท้าย','Books','Yellow','main','ชั้น 2',null,'2026-08-11T15:50:00+07',null,'แซม ม.6','stationery',true),
  ('11111111-1111-4111-8111-111111111111','found','เนกไทโรงเรียน','เนกไทโรงเรียนลายทาง พับวางไว้บนชั้นวางของ','Clothing','Multicolour','arts','ชั้น 1',null,'2026-08-10T11:25:00+07','ห้องพักครูศิลปะ',null,'misc',true);