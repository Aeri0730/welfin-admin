-- =====================================================================
-- 0021: 판매처 등록 + 출고에 판매처 지정
-- SQL Editor 에서 통째로 실행하세요. (0016 다음에 실행, 여러 번 실행해도 괜찮아요)
--
-- - 기준 정보 탭에서 판매처(쿠팡, 스마트스토어 등)를 등록한다 — 매입처와 같은 방식
-- - 출고 등록 때 판매처를 고를 수 있다 (선택 사항). stock_movements.sales_channel_id 에 남는다
-- =====================================================================

create table if not exists public.sales_channels (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  memo        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.sales_channels enable row level security;

drop policy if exists "sales_channels: 조회" on public.sales_channels;
drop policy if exists "sales_channels: 관리자 수정" on public.sales_channels;
create policy "sales_channels: 조회" on public.sales_channels
  for select to authenticated using (true);
create policy "sales_channels: 관리자 수정" on public.sales_channels
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.stock_movements
  add column if not exists sales_channel_id bigint references public.sales_channels (id);

create index if not exists stock_movements_sales_channel_idx
  on public.stock_movements (sales_channel_id)
  where sales_channel_id is not null;

-- ---------------------------------------------------------------------
-- 입출고 등록: p_sales_channel_id 추가 (나머지는 0016 과 같음)
-- ---------------------------------------------------------------------
drop function if exists public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb, boolean, timestamptz);
drop function if exists public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb, boolean, timestamptz, bigint);

create or replace function public.create_movements(
  p_type               public.movement_type,
  p_moved_on           date,
  p_from_warehouse_id  bigint,
  p_to_warehouse_id    bigint,
  p_partner_id         bigint,
  p_memo               text,
  p_items              jsonb,  -- [{ "product_id": 1, "quantity": 10 }, ...]
  p_allow_negative     boolean default false,
  p_scheduled_at       timestamptz default null,
  p_sales_channel_id   bigint default null
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
     from_warehouse_id, to_warehouse_id, partner_id, sales_channel_id, memo, scheduled_at)
  select v_batch_id, p_type,
         coalesce((v_scheduled at time zone 'Asia/Seoul')::date, p_moved_on),
         (item ->> 'product_id')::bigint,
         (item ->> 'quantity')::int,
         p_from_warehouse_id, p_to_warehouse_id, p_partner_id, p_sales_channel_id, nullif(trim(p_memo), ''),
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

revoke all on function public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb, boolean, timestamptz, bigint) from public, anon;
grant execute on function public.create_movements(public.movement_type, date, bigint, bigint, bigint, text, jsonb, boolean, timestamptz, bigint) to authenticated;

notify pgrst, 'reload schema';
