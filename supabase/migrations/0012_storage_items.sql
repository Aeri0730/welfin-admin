-- =====================================================================
-- 0012: 날짜별 보관비 세부 내역 (제품별 스냅샷)
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--
-- 보관비 탭에서 그날 보관비를 '저장'할 때, 그 순간 스타팩 재고 기준으로
-- 제품별 팔레트·경량랙 계산 결과를 그 날짜로 같이 저장한다.
-- (나중에 재고·적재수가 바뀌어도 그날 내역은 그대로 남음. 다시 저장하면 새로 덮어씀)
-- =====================================================================

create table if not exists public.storage_fee_items (
  stored_on        date not null,
  product_id       bigint not null references public.products (id) on delete cascade,
  stock            int not null default 0,
  pallet_capacity  int,
  rack_capacity    int,
  pallets          int not null default 0,
  racks            int not null default 0,
  amount           bigint not null default 0,
  exempt           boolean not null default false,
  updated_by       uuid default auth.uid() references public.profiles (id),
  updated_at       timestamptz not null default now(),
  primary key (stored_on, product_id)
);

alter table public.storage_fee_items enable row level security;

drop policy if exists "storage_fee_items: 조회" on public.storage_fee_items;
drop policy if exists "storage_fee_items: 입력" on public.storage_fee_items;
drop policy if exists "storage_fee_items: 수정" on public.storage_fee_items;
drop policy if exists "storage_fee_items: 삭제" on public.storage_fee_items;
create policy "storage_fee_items: 조회" on public.storage_fee_items for select to authenticated using (true);
create policy "storage_fee_items: 입력" on public.storage_fee_items for insert to authenticated with check (true);
create policy "storage_fee_items: 수정" on public.storage_fee_items for update to authenticated using (true) with check (true);
create policy "storage_fee_items: 삭제" on public.storage_fee_items for delete to authenticated using (true);
