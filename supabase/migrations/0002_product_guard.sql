-- =====================================================================
-- 0002: 등록된(사용 중인) 제품만 입출고 가능하게
-- 0001_init.sql 을 실행한 뒤, SQL Editor 에서 이 파일도 통째로 실행하세요.
-- (create or replace 라서 여러 번 실행해도 괜찮아요)
--
-- - 등록되지 않은 제품 → 입출고 불가
-- - '사용 중지'한 제품 → 입고/출고/이동 불가 (재고 조정은 가능: 남은 재고 정리용)
-- - 제품 삭제는 입출고 기록이 없는 제품만 가능 (기록이 있으면 FK 로 막힘 → 화면에서 '사용 중지' 안내)
-- =====================================================================

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
  v_batch_id     uuid := gen_random_uuid();
  v_short        record;
  v_inactive     text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception '등록할 제품이 없어요';
  end if;

  -- 등록되지 않은 제품
  if exists (
    select 1
    from jsonb_array_elements(p_items) as item
    left join public.products p on p.id = (item ->> 'product_id')::bigint
    where p.id is null
  ) then
    raise exception '등록되지 않은 제품은 입출고할 수 없어요. 기준 정보에서 먼저 등록해주세요'
      using errcode = 'P0001';
  end if;

  -- 사용 중지된 제품 (조정은 허용)
  if p_type <> 'adjust' then
    select p.name into v_inactive
    from jsonb_array_elements(p_items) as item
    join public.products p on p.id = (item ->> 'product_id')::bigint
    where not p.is_active
    limit 1;

    if v_inactive is not null then
      raise exception '사용 중지된 제품은 입출고할 수 없어요: %', v_inactive
        using errcode = 'P0001';
    end if;
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

revoke all on function public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb) from public, anon;
grant execute on function public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb) to authenticated;
