-- =====================================================================
-- 0016: 입고·출고 '예정' 등록
-- SQL Editor 에서 이 파일을 통째로 실행하세요. (여러 번 실행해도 괜찮아요)
-- 0015(재고 부족 확인 후 출고) 내용도 함께 들어 있어서, 0015 를 아직 안 돌렸으면 이것만 실행해도 돼요.
--
-- - stock_movements.scheduled_at : 예정 시각. 비어 있으면 바로 반영된 기록
-- - 예정 시각이 지나기 전에는 재고(stock_as_of)에 더하지 않는다 → 시간이 지나면 자동으로 반영
--   (따로 예약 작업을 돌리지 않아요. 재고를 조회하는 순간의 시각으로 계산해요)
-- - 예정 건은 반영되기 전까지 '예정 취소' 로 지울 수 있다
-- =====================================================================

alter table public.stock_movements
  add column if not exists scheduled_at timestamptz;

comment on column public.stock_movements.scheduled_at is '입출고 예정 시각 (비어 있으면 즉시 반영)';

create index if not exists stock_movements_scheduled_idx
  on public.stock_movements (scheduled_at)
  where scheduled_at is not null;

-- ---------------------------------------------------------------------
-- 재고 조회: 예정 시각이 아직 안 된 기록은 빼고 합산
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
    and (m.scheduled_at is null or m.scheduled_at <= now())
  group by m.product_id, x.warehouse_id;
$$;

-- ---------------------------------------------------------------------
-- 입출고 등록: p_scheduled_at 이 미래면 예정으로 저장 (재고 부족 검사는 반영 시점이 아니라서 건너뜀)
-- ---------------------------------------------------------------------
drop function if exists public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb);
drop function if exists public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb, boolean);

create or replace function public.create_movements(
  p_type               public.movement_type,
  p_moved_on           date,
  p_from_warehouse_id  bigint,
  p_to_warehouse_id    bigint,
  p_partner_id         bigint,
  p_memo               text,
  p_items              jsonb,  -- [{ "product_id": 1, "quantity": 10 }, ...]
  p_allow_negative     boolean default false,
  p_scheduled_at       timestamptz default null
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
  v_scheduled    timestamptz := case when p_scheduled_at > now() then p_scheduled_at end;
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
     from_warehouse_id, to_warehouse_id, partner_id, memo, scheduled_at)
  select v_batch_id, p_type,
         coalesce((v_scheduled at time zone 'Asia/Seoul')::date, p_moved_on),
         (item ->> 'product_id')::bigint,
         (item ->> 'quantity')::int,
         p_from_warehouse_id, p_to_warehouse_id, p_partner_id, nullif(trim(p_memo), ''),
         v_scheduled
  from jsonb_array_elements(p_items) as item;

  -- 바로 반영되는 건만, 확인을 받지 않았으면 재고 부족을 막는다
  if p_from_warehouse_id is not null and v_scheduled is null and not coalesce(p_allow_negative, false) then
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

revoke all on function public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb, boolean, timestamptz) from public, anon;
grant execute on function public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb, boolean, timestamptz) to authenticated;

-- ---------------------------------------------------------------------
-- 예정 취소: 아직 반영 전(예정 시각 전)인 묶음만 지운다
-- ---------------------------------------------------------------------
create or replace function public.cancel_scheduled_movements(p_batch_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요해요';
  end if;

  if exists (
    select 1 from public.stock_movements
    where batch_id = p_batch_id
      and (scheduled_at is null or scheduled_at <= now())
  ) then
    raise exception '이미 반영된 기록은 예정 취소할 수 없어요'
      using errcode = 'P0001';
  end if;

  delete from public.stock_movements where batch_id = p_batch_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.cancel_scheduled_movements(uuid) from public, anon;
grant execute on function public.cancel_scheduled_movements(uuid) to authenticated;

notify pgrst, 'reload schema';
