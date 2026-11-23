-- =====================================================================
-- 0015: 재고가 부족해도 확인 후 출고(이동)할 수 있게
-- SQL Editor 에서 이 파일을 통째로 실행하세요. (여러 번 실행해도 괜찮아요)
--
-- - p_allow_negative = false (기본): 지금처럼 재고가 모자라면 막는다
-- - p_allow_negative = true : 화면에서 "재고가 부족한데 출고할까요?" 에 '네' 를 누른 경우.
--                             재고가 마이너스가 되어도 그대로 저장한다
-- =====================================================================

-- 예전 7개 인자 버전을 지워야 새 버전 호출이 헷갈리지 않아요
drop function if exists public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb);

create or replace function public.create_movements(
  p_type               public.movement_type,
  p_moved_on           date,
  p_from_warehouse_id  bigint,
  p_to_warehouse_id    bigint,
  p_partner_id         bigint,
  p_memo               text,
  p_items              jsonb,  -- [{ "product_id": 1, "quantity": 10 }, ...]
  p_allow_negative     boolean default false
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

  -- 확인을 받지 않았으면 재고 부족을 막는다
  if p_from_warehouse_id is not null and not coalesce(p_allow_negative, false) then
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

revoke all on function public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb, boolean) from public, anon;
grant execute on function public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb, boolean) to authenticated;

-- PostgREST 가 새 함수 모양을 바로 알도록
notify pgrst, 'reload schema';
