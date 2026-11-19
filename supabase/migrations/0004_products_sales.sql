-- =====================================================================
-- 0004: 제품 단가·구분 + 매출 기록 + 기존 엑셀 제품/재고 이관
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--   - 제품은 SKU 기준으로 있으면 이름/단가/구분만 갱신
--   - 초기 재고는 그 제품에 입출고 기록이 하나도 없을 때만 넣음
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 제품: 입고단가, 시즌 구분, 매출 화면 표시 순서
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists unit_cost    int not null default 0 check (unit_cost >= 0),
  add column if not exists category     text not null default 'etc' check (category in ('winter', 'summer', 'etc')),
  add column if not exists report_order smallint;

-- 안전재고 기본값 15개 (재고가 15개 이하이면 '미달')
alter table public.products alter column safety_stock set default 15;

comment on column public.products.unit_cost is '입고단가(원). 재고금액 = 수량 × 입고단가';
comment on column public.products.category is 'winter=겨울, summer=여름, etc=나머지';
comment on column public.products.report_order is '매출 탭 "주요 제품 재고"에 보일 순서. null 이면 안 보임';

-- ---------------------------------------------------------------------
-- 2. 일일 매출 (창고/판매채널별 하루 1줄)
-- ---------------------------------------------------------------------
create table if not exists public.daily_sales (
  id            bigint generated always as identity primary key,
  sales_on      date not null,
  warehouse_id  bigint not null references public.warehouses (id),
  amount        bigint not null default 0 check (amount >= 0),
  quantity      int not null default 0 check (quantity >= 0),
  memo          text,
  updated_by    uuid default auth.uid() references public.profiles (id),
  updated_at    timestamptz not null default now(),
  unique (sales_on, warehouse_id)
);

create index if not exists daily_sales_sales_on_idx on public.daily_sales (sales_on desc);

-- 목표: period 는 '2026'(연간) 또는 '2026-11'(월간)
create table if not exists public.sales_targets (
  period      text primary key check (period ~ '^\d{4}(-\d{2})?$'),
  amount      bigint not null check (amount >= 0),
  updated_at  timestamptz not null default now()
);

alter table public.daily_sales   enable row level security;
alter table public.sales_targets enable row level security;

drop policy if exists "daily_sales: 조회" on public.daily_sales;
drop policy if exists "daily_sales: 입력" on public.daily_sales;
drop policy if exists "daily_sales: 수정" on public.daily_sales;
drop policy if exists "daily_sales: 삭제" on public.daily_sales;
create policy "daily_sales: 조회" on public.daily_sales for select to authenticated using (true);
create policy "daily_sales: 입력" on public.daily_sales for insert to authenticated with check (true);
create policy "daily_sales: 수정" on public.daily_sales for update to authenticated using (true) with check (true);
create policy "daily_sales: 삭제" on public.daily_sales for delete to authenticated using (true);

drop policy if exists "sales_targets: 조회" on public.sales_targets;
drop policy if exists "sales_targets: 관리자 수정" on public.sales_targets;
create policy "sales_targets: 조회" on public.sales_targets for select to authenticated using (true);
create policy "sales_targets: 관리자 수정" on public.sales_targets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 일일 보관비 (팔레트 / 경량랙, 부가세 포함 단가)
create table if not exists public.storage_fees (
  id          bigint generated always as identity primary key,
  stored_on   date not null,
  kind        text not null check (kind in ('pallet', 'rack')),
  quantity    int not null default 0 check (quantity >= 0),
  unit_price  int not null default 0 check (unit_price >= 0),
  updated_at  timestamptz not null default now(),
  unique (stored_on, kind)
);

alter table public.storage_fees enable row level security;
drop policy if exists "storage_fees: 조회" on public.storage_fees;
drop policy if exists "storage_fees: 입력" on public.storage_fees;
drop policy if exists "storage_fees: 수정" on public.storage_fees;
create policy "storage_fees: 조회" on public.storage_fees for select to authenticated using (true);
create policy "storage_fees: 입력" on public.storage_fees for insert to authenticated with check (true);
create policy "storage_fees: 수정" on public.storage_fees for update to authenticated using (true) with check (true);

-- 엑셀 일일업무보고의 목표값
insert into public.sales_targets (period, amount) values
  ('2026', 15000000000),
  ('2026-11', 2400000000)
on conflict (period) do nothing;

-- ---------------------------------------------------------------------
-- 3. 제품 등록 + 초기 재고 (2026-11-19 엑셀 기준)
--    stock_starpack = 스타팩 재고, stock_rg = 쿠팡 RG 재고
-- ---------------------------------------------------------------------
drop table if exists seed_products;
create temporary table seed_products (
  sku            text,
  name           text,
  unit_cost      int,
  category       text,
  report_order   smallint,
  stock_starpack int,
  stock_rg       int,
  sort_no        int
);

insert into seed_products values
  -- 겨울
  ('KPT-B4505',           'KPT-B4505 욕실난방기',                              33000, 'winter', null,    0,   0,  1),
  ('KRH-R4116CF',         'KRH-R4116CF 크루거 공업용 대형 온풍기 3000W',        80000, 'winter', null,    0,   0,  2),
  ('KRH-R4116CF-REMOTE',  'KRH-R4116CF 공업용 온풍기 리모컨',                       0, 'winter', null,   18,   0,  3),
  ('ZMH-RSW058W',         'ZMH-RSW058W 짐머만 오방난로',                        52000, 'winter', null,    0,   0,  4),
  ('KRH-SWS133MN',        'KRH-SWS133MN 크루거 미니 오방히터',                  19000, 'winter', null,  328,   0,  5),
  ('DN-504',              'DN-504 에코히터 아이보리',                           52000, 'winter',    8,    0, 112,  6),
  ('KRH-1340FW',          'KRH-1340FW 에코히터',                                53000, 'winter',    7,    0, 159,  7),
  ('KRGH-2101K',          'KRGH-2101K 템프라도 가스히터',                       75000, 'winter', null,    0,   0,  8),
  ('ZMH-SWS134MN',        'ZMH-SWS134MN 고효율 기본 오방히터 (미니 아이보리)',  19000, 'winter', null,    0,   0,  9),
  ('RUBEK-CONV-2000W',    '루베크 컨벡션히터 2000W',                            29000, 'winter', null,    0,   0, 10),
  ('RU-PHS910W',          'RU-PHS910W 루베크 헬리오 PTC 온풍기',                24500, 'winter', null,    0,   0, 11),
  ('WELFIN-012',          'WELFIN-012 웰핀 더 에어히터',                        63000, 'winter', null,    5,   0, 12),
  ('WELFIN-012-BOX-OUT',  'WELFIN-012 웰핀 더 에어히터 공박스(외부)',            1100, 'winter', null,    0,   0, 13),
  ('WELFIN-012-BOX-IN',   'WELFIN-012 웰핀 더 에어히터 공박스(내부)',               0, 'winter', null,   17,   0, 14),
  ('WELFIN-014',          'WELFIN-014 웰핀 더 에어히터 프로2',                  68000, 'winter',    2,  318,   0, 15),
  ('WELFIN-014-STAND',    'WELFIN-014 웰핀 더 에어히터 프로2 하단 지지대',          0, 'winter',    3,  335,   0, 16),
  ('WELFIN-014-SCREW',    'WELFIN-014 에어히터 프로2 결합나사',                     0, 'winter', null,  116,   0, 17),
  ('WELFIN-014-REMOTE',   'WELFIN-014 에어히터 프로2 리모컨',                       0, 'winter', null,   42,   0, 18),
  ('WELFIN-015',          'WELFIN-015 웰핀 더 에어히터 슬림',                   70000, 'winter',    4,    1,   0, 19),
  ('WELFIN-015-REMOTE',   'WELFIN-015 웰핀 더 에어히터 슬림 리모컨',                0, 'winter', null,    8,   0, 20),
  ('WELFIN-015-BOX-OUT',  'WELFIN-015 웰핀 더 에어히터 슬림 박스(외부)',            0, 'winter', null,  150,   0, 21),
  ('WELFIN-006',          'WELFIN-006 웰핀 라디에이터',                         58300, 'winter',    1,  109,   0, 22),
  -- 여름
  ('ZMF-8804CR',          'ZMF-8804CR 짐머만 써큘레이터 8인치',                 45000, 'summer', null,    0,   0, 23),
  ('ZMF-8804CR-REMOTE',   'ZMF-8804CR 짐머만 써큘레이터 리모컨',                    0, 'summer', null,   27,   0, 24),
  ('WELFIN-009',          'WELFIN-009 웰핀 에어팬',                             44000, 'summer', null,  220,   0, 25),
  ('WELFIN-AIR-REMOTE',   'WELFIN-AIR 웰핀 에어팬 리모컨',                          0, 'summer', null,   51,   0, 26),
  ('ZMI-R4735',           'ZMI-R4735 3000W 냉풍기',                             77000, 'summer', null,   85,   0, 27),
  ('ZMI-R4735-REMOTE',    'ZMI-R4735 3000W 냉풍기 리모컨',                          0, 'summer', null,   32,   0, 28),
  ('ZMI-R6154YW',         'ZMI-R6154YW / KRI-R6153YW 냉풍기',                  105000, 'summer',    6,    2,   0, 29),
  ('GSI-R1429SKD',        'GSI-R1429SKD 고스 보텍스 3구 BLDC 냉풍기',           96000, 'summer', null,  288,   0, 30),
  ('WELFIN-004',          'WELFIN-004 웰핀 모기퇴치기',                         18150, 'summer', null,    0,   0, 31),
  ('WELFIN-004-25',       'WELFIN-004 웰핀 터프라이트 모기퇴치기 (25년형)',     19250, 'summer', null,    0,   0, 32),
  ('WELFIN-013',          'WELFIN-013 웰핀 버그라이트',                         27900, 'summer',    5, 3005,  24, 33),
  ('WELFIN-013-BAG',      'WELFIN-013 버그라이트 전용가방',                     10000, 'summer', null,   93,   0, 34),
  -- 나머지
  ('KRK-D2300WH',         '(유니맥스) KRK-D2300WH 스텐 무선 전기포트 2L',       11000, 'etc',    null,    0,   0, 35),
  ('WELFIN-010',          'WELFIN-010 웰핀 더 퓨어 맥스 가습기',                62040, 'etc',    null,    3,   0, 36),
  ('WELFIN-010-PACKING',  'WELFIN-010 웰핀 더 퓨어 맥스 고무패킹',                  0, 'etc',    null,   14,   0, 37),
  ('WELFIN-VACUUM-HEPA',  'WELFIN-VACUUM 헤파필터',                              8000, 'etc',    null,    0,   0, 38),
  ('WELFIN-VACUUM-STEEL', 'WELFIN-VACUUM 스테인리스 필터',                      10000, 'etc',    null,    1,   0, 39),
  ('WELFIN-VACUUM-ADAPTER','WELFIN-VACUUM 어댑터',                              15000, 'etc',    null,   13,   0, 40),
  ('DISH-SET-1P',         '1인 식기세트',                                       28000, 'etc',    null,  263,   0, 41),
  ('WELFIN-001',          'WELFIN-001 웰핀 퍼펙트스텐 저당밥솥',                56000, 'etc',    null,    1,   0, 42),
  ('WELFIN-001-POT',      '웰핀 저당밥솥 내솥(스테인레스)',                         0, 'etc',    null,   76,   0, 43),
  ('WELFIN-001-WARRANTY', '웰핀 저당밥솥 보증서',                                   0, 'etc',    null,   30,   0, 44),
  ('WELFIN-001-PART-03',  '웰핀 저당밥솥 감사장',                                   0, 'etc',    null,   30,   0, 45),
  ('WELFIN-001-STICKER',  '웰핀 저당밥솥 스티커',                                   0, 'etc',    null,   98,   0, 46),
  ('WELFIN-001-BOX-IN',   '웰핀 저당밥솥 내박스',                                   0, 'etc',    null,  110,   0, 47),
  ('WELFIN-001-BOX-OUT',  '웰핀 저당밥솥 외박스',                                   0, 'etc',    null,  127,   0, 48),
  ('WELFIN-001-CORD',     '웰핀 저당밥솥 전원 코드',                                0, 'etc',    null,   45,   0, 49),
  ('WELFIN-001-TRAY-23',  '웰핀 저당밥솥 트레이 (23년형)',                          0, 'etc',    null,   95,   0, 50),
  ('WELFIN-001-COVER-22', '웰핀 저당밥솥 스테인레스 커버 (22년형)',                 0, 'etc',    null,  182,   0, 51);

insert into public.products (sku, name, unit_cost, category, report_order, safety_stock)
select sku, name, unit_cost, category, report_order, 15
from seed_products
order by sort_no
on conflict (sku) do update
  set name = excluded.name,
      unit_cost = excluded.unit_cost,
      category = excluded.category,
      report_order = excluded.report_order;

-- 안전재고를 따로 정하지 않은(0) 제품은 15개로
update public.products set safety_stock = 15 where safety_stock = 0;

-- 초기 재고: '조정' 기록으로 넣는다 (입출고 기록이 하나도 없는 제품만)
do $$
declare
  v_admin    uuid;
  v_starpack bigint;
  v_rg       bigint;
  v_batch    uuid := gen_random_uuid();
begin
  select id into v_admin from public.profiles where role = 'admin' order by created_at limit 1;
  if v_admin is null then
    raise exception '관리자 계정이 없어요. 관리자로 한 번 로그인한 뒤 다시 실행해주세요';
  end if;

  select id into v_starpack from public.warehouses where code = 'STARPACK';
  select id into v_rg       from public.warehouses where code = 'COUPANG';

  insert into public.stock_movements
    (batch_id, type, moved_on, product_id, quantity, to_warehouse_id, memo, created_by)
  select v_batch, 'adjust', date '2026-11-19', p.id, x.qty, x.warehouse_id, '초기 재고 (엑셀 이관)', v_admin
  from seed_products sp
  join public.products p on p.sku = sp.sku
  cross join lateral (values (v_starpack, sp.stock_starpack), (v_rg, sp.stock_rg)) as x(warehouse_id, qty)
  where x.qty > 0
    and not exists (select 1 from public.stock_movements m where m.product_id = p.id);
end;
$$;

drop table if exists seed_products;

-- 확인용: 창고별 재고 수량 / 재고금액
--   스타팩 6,338개 · 171,259,320원 / 쿠팡 295개 · 14,920,600원 이 나오면 정상
select w.name as 창고,
       sum(s.quantity) as 재고수량,
       sum(s.quantity * p.unit_cost) as 재고금액
from public.stock_as_of(null) s
join public.products p on p.id = s.product_id
join public.warehouses w on w.id = s.warehouse_id
group by w.name, w.sort_order
order by w.sort_order;
