-- =====================================================================
-- 0010: 창고 밖 매출 (양일상사 · 유니맥스 등 업체 직배송)
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
-- 매출 탭 '매출 입력'의 + 버튼으로 넣은 매출이 여기 저장되고, 월 누적 실적에 더해져요.
-- =====================================================================

create table if not exists public.sales_extras (
  id          bigint generated always as identity primary key,
  sales_on    date not null,
  name        text not null check (length(trim(name)) > 0),
  amount      bigint not null default 0 check (amount >= 0),
  quantity    int not null default 0 check (quantity >= 0),
  updated_by  uuid default auth.uid() references public.profiles (id),
  updated_at  timestamptz not null default now()
);

create index if not exists sales_extras_sales_on_idx on public.sales_extras (sales_on desc);

alter table public.sales_extras enable row level security;

drop policy if exists "sales_extras: 조회" on public.sales_extras;
drop policy if exists "sales_extras: 입력" on public.sales_extras;
drop policy if exists "sales_extras: 수정" on public.sales_extras;
drop policy if exists "sales_extras: 삭제" on public.sales_extras;
create policy "sales_extras: 조회" on public.sales_extras for select to authenticated using (true);
create policy "sales_extras: 입력" on public.sales_extras for insert to authenticated with check (true);
create policy "sales_extras: 수정" on public.sales_extras for update to authenticated using (true) with check (true);
create policy "sales_extras: 삭제" on public.sales_extras for delete to authenticated using (true);

-- ---------------------------------------------------------------------
-- 누적 매출 기준값: as_of 날짜까지의 누적 매출 (엑셀에서 옮겨온 값)
-- 화면의 누적 매출 = amount + (as_of 다음날부터 입력한 매출)
-- ---------------------------------------------------------------------
create table if not exists public.sales_baseline (
  id          smallint primary key default 1 check (id = 1),
  amount      bigint not null check (amount >= 0),
  as_of       date not null,
  updated_at  timestamptz not null default now()
);

alter table public.sales_baseline enable row level security;
drop policy if exists "sales_baseline: 조회" on public.sales_baseline;
drop policy if exists "sales_baseline: 수정" on public.sales_baseline;
create policy "sales_baseline: 조회" on public.sales_baseline for select to authenticated using (true);
create policy "sales_baseline: 수정" on public.sales_baseline for all to authenticated using (true) with check (true);

insert into public.sales_baseline (id, amount, as_of)
values (1, 927858217, date '2026-11-21')
on conflict (id) do nothing;
