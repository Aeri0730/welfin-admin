-- =====================================================================
-- 0009: 2026-11-20 스타팩(셀메이트) 출고 728대 반영
-- SQL Editor 에서 통째로 실행하세요. 이미 반영됐으면 아무것도 하지 않아요.
--
--   - 판매처별로 한 줄씩 '출고' 기록 (메모: 스타팩 출고 · 판매처명)
--   - 양일상사(14) · 유니맥스(2) 는 업체 직배송이라 우리 재고에서 빼지 않음
--   - 마지막 조회 결과: 출고 후 스타팩 재고 (음수면 입고 기록이 빠진 것)
-- =====================================================================

do $$
declare
  v_admin    uuid;
  v_starpack bigint;
  v_batch    uuid := gen_random_uuid();
  v_missing  text;
begin
  if exists (
    select 1 from public.stock_movements
    where type = 'outbound' and moved_on = date '2026-11-20' and memo like '스타팩 출고 · %'
  ) then
    raise notice '2026-11-20 스타팩 출고는 이미 반영돼 있어요';
    return;
  end if;

  select id into v_admin from public.profiles where role = 'admin' order by created_at limit 1;
  if v_admin is null then
    raise exception '관리자 계정이 없어요. 관리자로 한 번 로그인한 뒤 다시 실행해주세요';
  end if;
  select id into v_starpack from public.warehouses where code = 'STARPACK';

  create temporary table seed_outbound (partner text, sku text, qty int) on commit drop;
  insert into seed_outbound values
    ('드엘리사',          'WELFIN-014',        158),
    ('드엘리사',          'WELFIN-014-STAND',  158),
    ('네이버_웰핀홀딩스', 'WELFIN-014',        106),
    ('네이버_웰핀홀딩스', 'WELFIN-014-STAND',  106),
    ('네이버_웰핀홀딩스', 'WELFIN-006',          2),
    ('쿠팡_스카이로켓',   'KRH-SWS133MN',        5),
    ('디에이블앤',        'WELFIN-014',          8),
    ('디에이블앤',        'WELFIN-014-STAND',    8),
    ('아임',              'WELFIN-014',          1),
    ('아임',              'WELFIN-014-STAND',    1),
    ('오늘의집',          'WELFIN-014',          1),
    ('오늘의집',          'WELFIN-014-STAND',    1),
    ('와디즈',            'WELFIN-015',         95),
    ('협찬',              'WELFIN-014',          2),
    ('협찬',              'WELFIN-014-STAND',    2),
    ('퀵 출고',           'WELFIN-014',          1),
    ('퀵 출고',           'WELFIN-014-STAND',    1),
    ('에어히터 들뜸',     'WELFIN-014',         10),
    ('에어히터 들뜸',     'WELFIN-014-STAND',   10),
    ('교환',              'WELFIN-014',         35),
    ('교환',              'WELFIN-014-STAND',    1),
    ('교환',              'WELFIN-014-SCREW',    6),
    ('교환',              'WELFIN-015-REMOTE',   3),
    ('교환',              'WELFIN-015',          1),
    ('부품',              'WELFIN-012-BOX-IN',   6);

  -- 합계 확인 (셀메이트 전체 출고 728)
  if (select sum(qty) from seed_outbound) <> 728 then
    raise exception '출고 합계가 728 이 아니에요';
  end if;

  select string_agg(distinct so.sku, ', ') into v_missing
  from seed_outbound so
  left join public.products p on p.sku = so.sku
  where p.id is null;
  if v_missing is not null then
    raise exception '등록되지 않은 제품이 있어요: %', v_missing;
  end if;

  insert into public.stock_movements
    (batch_id, type, moved_on, product_id, quantity, from_warehouse_id, memo, created_by)
  select v_batch, 'outbound', date '2026-11-20', p.id, so.qty, v_starpack, '스타팩 출고 · ' || so.partner, v_admin
  from seed_outbound so
  join public.products p on p.sku = so.sku;

  raise notice '2026-11-20 스타팩 출고 % 건(728대)을 반영했어요', (select count(*) from seed_outbound);
end;
$$;

-- 출고 후 스타팩 재고 (음수면 그 제품의 입고 기록이 빠져 있어요)
select p.sku, p.name, s.quantity as starpack_stock
from public.stock_as_of(null) s
join public.products p on p.id = s.product_id
join public.warehouses w on w.id = s.warehouse_id and w.code = 'STARPACK'
where p.sku in ('WELFIN-014', 'WELFIN-014-STAND', 'WELFIN-006', 'KRH-SWS133MN', 'WELFIN-015',
                'WELFIN-014-SCREW', 'WELFIN-015-REMOTE', 'WELFIN-012-BOX-IN')
order by s.quantity;
