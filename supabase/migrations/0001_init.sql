-- =====================================================================
-- Welfin 재고관리 초기 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행하세요.
--
-- 핵심 원칙: "현재 재고" 숫자를 따로 저장하지 않는다.
-- 모든 입고/출고/이동/조정을 stock_movements 에 기록하고, 재고는 합산으로 계산한다.
-- → 언제든 "왜 이 숫자가 됐는지" 추적 가능 / 특정 날짜 기준 재고 조회 가능
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 사용자 (회원가입 없음: 관리자가 계정 발급)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null unique,
  role        text not null default 'staff' check (role in ('admin', 'staff')),
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 이름 → 로그인용 이메일 조회 (Supabase Auth 는 이메일 기반이라 이름을 이메일로 변환)
create or replace function public.login_email(p_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.name = p_name
  limit 1;
$$;

revoke all on function public.login_email(text) from public;
grant execute on function public.login_email(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. 기준 정보
-- ---------------------------------------------------------------------
create table public.warehouses (
  id          bigint generated always as identity primary key,
  code        text not null unique,
  name        text not null unique,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into public.warehouses (code, name, sort_order) values
  ('STARPACK', '스타팩', 1),
  ('COUPANG',  '쿠팡',   2);

create table public.partners (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  memo        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.products (
  id            bigint generated always as identity primary key,
  sku           text not null unique,
  name          text not null,
  safety_stock  int not null default 0 check (safety_stock >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. 입출고 기록
--   inbound  : 매입처 → 창고          (to 필수, partner 필수)
--   outbound : 창고 → 고객(하루 합계)  (from 필수)
--   transfer : 창고 → 창고            (from, to 필수 / 예: 스타팩 → 쿠팡, 쿠팡 반출 → 스타팩)
--   adjust   : 실사 차이 보정          (from 또는 to 중 하나만)
-- ---------------------------------------------------------------------
create type public.movement_type as enum ('inbound', 'outbound', 'transfer', 'adjust');

create table public.stock_movements (
  id                 bigint generated always as identity primary key,
  batch_id           uuid not null,
  type               public.movement_type not null,
  moved_on           date not null,
  product_id         bigint not null references public.products (id),
  quantity           int not null check (quantity > 0),
  from_warehouse_id  bigint references public.warehouses (id),
  to_warehouse_id    bigint references public.warehouses (id),
  partner_id         bigint references public.partners (id),
  memo               text,
  created_by         uuid not null default auth.uid() references public.profiles (id),
  created_at         timestamptz not null default now(),

  constraint movement_shape check (
    (type = 'inbound'
      and from_warehouse_id is null and to_warehouse_id is not null and partner_id is not null)
    or (type = 'outbound'
      and from_warehouse_id is not null and to_warehouse_id is null and partner_id is null)
    or (type = 'transfer'
      and from_warehouse_id is not null and to_warehouse_id is not null
      and from_warehouse_id <> to_warehouse_id and partner_id is null)
    or (type = 'adjust'
      and (from_warehouse_id is null) <> (to_warehouse_id is null) and partner_id is null)
  )
);

create index stock_movements_moved_on_idx on public.stock_movements (moved_on desc);
create index stock_movements_product_idx on public.stock_movements (product_id);
create index stock_movements_batch_idx on public.stock_movements (batch_id);

-- ---------------------------------------------------------------------
-- 4. 재고 조회: 기준일까지의 기록을 합산 (p_date 가 null 이면 전체)
-- ---------------------------------------------------------------------
create or replace function public.stock_as_of(p_date date default null)
returns table (product_id bigint, warehouse_id bigint, quantity int)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.product_id, x.warehouse_id, sum(x.delta)::int as quantity
  from public.stock_movements m
  cross join lateral (
    values (m.to_warehouse_id, m.quantity), (m.from_warehouse_id, -m.quantity)
  ) as x (warehouse_id, delta)
  where x.warehouse_id is not null
    and (p_date is null or m.moved_on <= p_date)
  group by m.product_id, x.warehouse_id;
$$;

-- ---------------------------------------------------------------------
-- 5. 입출고 등록 (여러 제품을 한 번에, 하나의 트랜잭션으로)
--    출고/이동/감소조정 후 재고가 마이너스가 되면 전체 취소
-- ---------------------------------------------------------------------
create or replace function public.create_movements(
  p_type               public.movement_type,
  p_moved_on           date,
  p_from_warehouse_id  bigint,
  p_to_warehouse_id    bigint,
  p_partner_id         bigint,
  p_memo               text,
  p_items              jsonb  -- [{ "product_id": 1, "quantity": 10 }, ...]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch_id uuid := gen_random_uuid();
  v_short    record;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception '등록할 제품이 없어요';
  end if;

  -- 같은 창고에서 동시에 빠지는 요청이 겹치지 않도록 창고 단위 잠금
  if p_from_warehouse_id is not null then
    perform pg_advisory_xact_lock(p_from_warehouse_id);
  end if;

  insert into public.stock_movements
    (batch_id, type, moved_on, product_id, quantity,
     from_warehouse_id, to_warehouse_id, partner_id, memo)
  select v_batch_id, p_type, p_moved_on,
         (item ->> 'product_id')::bigint,
         (item ->> 'quantity')::int,
         p_from_warehouse_id, p_to_warehouse_id, p_partner_id, nullif(trim(p_memo), '')
  from jsonb_array_elements(p_items) as item;

  if p_from_warehouse_id is not null then
    select p.name, s.quantity
      into v_short
    from public.stock_as_of(null) s
    join public.products p on p.id = s.product_id
    where s.warehouse_id = p_from_warehouse_id
      and s.quantity < 0
      and s.product_id in (
        select (item ->> 'product_id')::bigint from jsonb_array_elements(p_items) as item
      )
    limit 1;

    if found then
      raise exception '재고가 부족해요: % (부족 수량 %개)', v_short.name, -v_short.quantity
        using errcode = 'P0001';
    end if;
  end if;

  return v_batch_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. RLS (로그인한 회사 사람만 접근)
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.warehouses      enable row level security;
alter table public.partners        enable row level security;
alter table public.products        enable row level security;
alter table public.stock_movements enable row level security;

create policy "profiles: 로그인 사용자 조회" on public.profiles
  for select to authenticated using (true);

create policy "warehouses: 조회" on public.warehouses
  for select to authenticated using (true);
create policy "warehouses: 관리자 수정" on public.warehouses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "partners: 조회" on public.partners
  for select to authenticated using (true);
create policy "partners: 관리자 수정" on public.partners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "products: 조회" on public.products
  for select to authenticated using (true);
create policy "products: 관리자 수정" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "movements: 조회" on public.stock_movements
  for select to authenticated using (true);
create policy "movements: 본인 이름으로 등록" on public.stock_movements
  for insert to authenticated with check (created_by = auth.uid());
-- 수정/삭제는 막아둠: 잘못 입력한 건 '조정' 기록으로 바로잡아 이력을 남긴다.

revoke all on function public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb) from public, anon;
grant execute on function public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb) to authenticated;
revoke all on function public.stock_as_of(date) from public, anon;
grant execute on function public.stock_as_of(date) to authenticated;
