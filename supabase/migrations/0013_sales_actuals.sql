-- =====================================================================
-- 0013: 월 실적 (ACTUAL) 직접 입력
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--
-- 매출 탭 '목표 달성' 카드에서 그날까지의 이번 달 실적(ACTUAL)을 직접 입력해 날짜별로 저장한다.
-- 달성률은 기준일까지 가장 최근에 입력한 실적으로 계산한다.
-- (누적 매출 기준값 sales_baseline 은 더 이상 쓰지 않아요. 테이블은 남겨둠)
-- =====================================================================

create table if not exists public.sales_actuals (
  actual_on   date primary key,
  amount      bigint not null default 0 check (amount >= 0),
  updated_by  uuid default auth.uid() references public.profiles (id),
  updated_at  timestamptz not null default now()
);

alter table public.sales_actuals enable row level security;

drop policy if exists "sales_actuals: 조회" on public.sales_actuals;
drop policy if exists "sales_actuals: 입력" on public.sales_actuals;
drop policy if exists "sales_actuals: 수정" on public.sales_actuals;
drop policy if exists "sales_actuals: 삭제" on public.sales_actuals;
create policy "sales_actuals: 조회" on public.sales_actuals for select to authenticated using (true);
create policy "sales_actuals: 입력" on public.sales_actuals for insert to authenticated with check (true);
create policy "sales_actuals: 수정" on public.sales_actuals for update to authenticated using (true) with check (true);
create policy "sales_actuals: 삭제" on public.sales_actuals for delete to authenticated using (true);
