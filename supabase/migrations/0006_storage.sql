-- =====================================================================
-- 0006: 보관비 관리 (재고 > 보관비)
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--
--   1) 제품: 이지어드민 상품코드, 팔레트·경량랙 1칸 적재수, 보관비 제외 여부
--      → 제품별 보관비 계산 (팔레트 수 = 올림(재고 ÷ 팔레트 적재수))
--   2) storage_days: 날짜별 업체가 알려준 일일금액·누적금액·메모
--      (팔레트·경량랙 수량과 단가는 기존 storage_fees 에 그대로 저장)
--   3) 2026년 11월 1일 ~ 20일 보관비 기록 이관 (이미 입력된 날짜는 건드리지 않음)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 제품 보관 기준
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists ezadmin_code    text,
  add column if not exists pallet_capacity int check (pallet_capacity is null or pallet_capacity >= 0),
  add column if not exists rack_capacity   int check (rack_capacity is null or rack_capacity >= 0),
  add column if not exists storage_exempt  boolean not null default false;

comment on column public.products.ezadmin_code is '이지어드민 상품코드 (보관비 엑셀의 상품코드)';
comment on column public.products.pallet_capacity is '팔레트 1개에 들어가는 수량. 팔레트 수 = 올림(재고 / 적재수)';
comment on column public.products.rack_capacity is '경량랙 1칸에 들어가는 수량';
comment on column public.products.storage_exempt is '보관비 계산에서 제외 (가입고 등)';

-- 11월 20일 보관비 엑셀 기준
update public.products p
set ezadmin_code    = coalesce(p.ezadmin_code, v.code),
    pallet_capacity = coalesce(p.pallet_capacity, v.pallet),
    rack_capacity   = coalesce(p.rack_capacity, v.rack),
    storage_exempt  = p.storage_exempt or v.exempt
from (values
  ('DISH-SET-1P',           '06738',   96,     0, false),
  ('WELFIN-009',            '06758',   18,     0, false),
  ('ZMI-R4735',             '07624',    8,     0, false),
  ('WELFIN-006',            '07747',   16,     0, false),
  ('WELFIN-VACUUM-STEEL',   '08140',    0,   200, false),
  ('WELFIN-VACUUM-ADAPTER', '08141',    0,   200, false),
  ('WELFIN-001-CORD',       '08369',    0,   100, false),
  ('ZMF-8804CR-REMOTE',     '08370',    0,   500, false),
  ('KRH-R4116CF-REMOTE',    '08372',    0,   500, false),
  ('WELFIN-001-TRAY-23',    '08373',    0,    30, false),
  ('WELFIN-001-COVER-22',   '08378',    0,   200, false),
  ('ZMI-R4735-REMOTE',      '08379',    0,   500, false),
  ('WELFIN-001',            '20266',   45,     0, false),
  ('WELFIN-001-POT',        '20272',  320,     0, false),
  ('WELFIN-001-BOX-IN',     '20273', 1000,     0, false),
  ('WELFIN-001-BOX-OUT',    '20274', 1000,     0, false),
  ('ZMI-R6154YW',           '22078',    6,     0, false),
  ('WELFIN-001-STICKER',    '23178',    0, 10000, false),
  ('WELFIN-001-WARRANTY',   '23203',    0,  5000, false),
  ('WELFIN-001-PART-03',    '23204',    0,   300, false),
  ('WELFIN-AIR-REMOTE',     '23340',    0,   500, false),
  ('WELFIN-010',            '25762',   40,     0, false),
  ('WELFIN-012',            '25763',   16,     0, true),
  ('WELFIN-010-PACKING',    '26649',    0,   300, false),
  ('GSI-R1429SKD',          '30393',   15,     0, false),
  ('WELFIN-013',            '30523',   96,     0, false),
  ('WELFIN-013-BAG',        '31304',    0,    30, false),
  ('KRH-SWS133MN',          '33921',   36,     0, false),
  ('WELFIN-012-BOX-IN',     '34009',    0,     0, false),
  ('WELFIN-015',            '34299',   32,     0, false),
  ('WELFIN-014',            '34311',   16,     0, false),
  ('WELFIN-014-STAND',      '34418',   80,     0, true),
  ('WELFIN-015-BOX-OUT',    '34643',    0,     0, false),
  ('WELFIN-014-SCREW',      '34660',    0,     0, false),
  ('WELFIN-014-REMOTE',     '34710',    0,   200, true),
  ('WELFIN-015-REMOTE',     '34736',    0,   200, true)
) as v(sku, code, pallet, rack, exempt)
where p.sku = v.sku;

-- ---------------------------------------------------------------------
-- 2. 날짜별 업체 안내 금액·메모
-- ---------------------------------------------------------------------
create table if not exists public.storage_days (
  stored_on       date primary key,
  reported_daily  int check (reported_daily is null or reported_daily >= 0),   -- 업체가 알려준 일일금액
  reported_total  bigint check (reported_total is null or reported_total >= 0), -- 업체가 알려준 누적금액
  memo            text,
  updated_by      uuid default auth.uid() references public.profiles (id),
  updated_at      timestamptz not null default now()
);

alter table public.storage_days enable row level security;
drop policy if exists "storage_days: 조회" on public.storage_days;
drop policy if exists "storage_days: 입력" on public.storage_days;
drop policy if exists "storage_days: 수정" on public.storage_days;
drop policy if exists "storage_days: 삭제" on public.storage_days;
create policy "storage_days: 조회" on public.storage_days for select to authenticated using (true);
create policy "storage_days: 입력" on public.storage_days for insert to authenticated with check (true);
create policy "storage_days: 수정" on public.storage_days for update to authenticated using (true) with check (true);
create policy "storage_days: 삭제" on public.storage_days for delete to authenticated using (true);

drop policy if exists "storage_fees: 삭제" on public.storage_fees;
create policy "storage_fees: 삭제" on public.storage_fees for delete to authenticated using (true);

-- ---------------------------------------------------------------------
-- 3. 11월 1일 ~ 20일 기록 (팔레트 550원 · 경량랙 165원, 부가세 포함)
-- ---------------------------------------------------------------------
drop table if exists seed_storage;
create temporary table seed_storage (
  stored_on date, pallet int, rack int, reported_daily int, reported_total bigint, memo text
);

insert into seed_storage values
  ('2026-11-01', 157, 20,  89650,    null, null),
  ('2026-11-02', 157, 20,  89650,  179300, null),
  ('2026-11-03', 148, 20,  84700,  264000, null),
  ('2026-11-04', 141, 20,  80850,  344850, null),
  ('2026-11-05', 139, 20,  79750,  424600, null),
  ('2026-11-06', 197, 20, 111650,  536250, '에어히터 슬림은 가입고 상태여서 수량이 확인되고 있으나, 현재 입고 중이므로 보관비에 포함하지 않았습니다.'),
  ('2026-11-07', 156, 20,  89100,    null, null),
  ('2026-11-08', 156, 20,  89100,    null, null),
  ('2026-11-09', 156, 20,  89100,  803550, null),
  ('2026-11-10', 133, 20,  76450,  880000, null),
  ('2026-11-11', 125, 20,  72050,  952050, null),
  ('2026-11-12', 118, 20,  68200, 1020250, null),
  ('2026-11-13', 118, 20,  68200, 1088450, null),
  ('2026-11-14', 342, 20, 191400,    null, 'WELFIN-014 :3080 , WELFIN-LEG:3084 이지어드민 가입고 상태이며 WELFIN-006 웰핀 라디에이터, WELFIN-012 웰핀 더 에어히터 오출고로 인해 실재고와 차이가 있을 것으로 보입니다.'),
  ('2026-11-15', 342, 20, 191400,    null, 'WELFIN-014 :3080 , WELFIN-LEG:3084 이지어드민 가입고 상태이며 WELFIN-006 웰핀 라디에이터, WELFIN-012 웰핀 더 에어히터 오출고로 인해 실재고와 차이가 있을 것으로 보입니다.'),
  ('2026-11-16', 342, 20, 191400, 1662650, 'WELFIN-014 :3080 , WELFIN-LEG:3084 이지어드민 가입고 상태이며 WELFIN-006 웰핀 라디에이터, WELFIN-012 웰핀 더 에어히터 오출고로 인해 실재고와 차이가 있을 것으로 보입니다.'),
  ('2026-11-17', 136, 20,  78100, 1740750, 'WELFIN-006 웰핀 라디에이터, WELFIN-012 웰핀 더 에어히터 오출고로 인해 실재고와 차이가 있을 것으로 보입니다.'),
  ('2026-11-18', 135, 20,  77550, 1818300, 'WELFIN-006 웰핀 라디에이터, WELFIN-012 웰핀 더 에어히터 오출고로 인해 실재고와 차이가 있을 것으로 보입니다.'),
  ('2026-11-19', 121, 20,  69850, 1888150, null),
  ('2026-11-20', 125, 20,  72050, 1960200, '현재 셀메이트와 이카운트에서도 오출고 내역을 반영하였으나, 실재고와도 이지어드민상도 맞지않아 계속 재 확인 해보겠습니다.');

insert into public.storage_fees (stored_on, kind, quantity, unit_price)
select stored_on, 'pallet', pallet, 550 from seed_storage
union all
select stored_on, 'rack', rack, 165 from seed_storage
on conflict (stored_on, kind) do nothing;

insert into public.storage_days (stored_on, reported_daily, reported_total, memo)
select stored_on, reported_daily, reported_total, memo from seed_storage
on conflict (stored_on) do nothing;

drop table seed_storage;
