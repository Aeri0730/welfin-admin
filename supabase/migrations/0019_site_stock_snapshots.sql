-- =====================================================================
-- 0019: 날짜별 사이트 재고 비교 저장
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--
-- 사이트 재고 비교 탭에서 '저장'을 누르면 그날 올린 사이트 재고(셀메이트·이카운트·이지어드민)와
-- 그 순간의 우리 재고를 그 날짜로 저장한다. 같은 날 다시 저장하면 덮어쓴다.
-- =====================================================================

create table if not exists public.site_stock_snapshots (
  compared_on     date primary key,
  -- 비교한 우리 창고 (null = 전체 창고)
  warehouse_id    bigint references public.warehouses (id) on delete set null,
  warehouse_name  text,
  -- { sellmate?: { fileName, uploadedAt, rows: [{ name, code, quantity, original? }] }, ecount?: ..., ezadmin?: ... }
  sites           jsonb not null default '{}'::jsonb,
  -- 저장할 때의 우리 재고 { "제품 id": 수량 }
  ours            jsonb not null default '{}'::jsonb,
  updated_by      uuid default auth.uid() references public.profiles (id),
  updated_at      timestamptz not null default now()
);

alter table public.site_stock_snapshots enable row level security;

drop policy if exists "site_stock_snapshots: 조회" on public.site_stock_snapshots;
drop policy if exists "site_stock_snapshots: 입력" on public.site_stock_snapshots;
drop policy if exists "site_stock_snapshots: 수정" on public.site_stock_snapshots;
drop policy if exists "site_stock_snapshots: 삭제" on public.site_stock_snapshots;
create policy "site_stock_snapshots: 조회" on public.site_stock_snapshots for select to authenticated using (true);
create policy "site_stock_snapshots: 입력" on public.site_stock_snapshots for insert to authenticated with check (true);
create policy "site_stock_snapshots: 수정" on public.site_stock_snapshots for update to authenticated using (true) with check (true);
create policy "site_stock_snapshots: 삭제" on public.site_stock_snapshots for delete to authenticated using (true);
