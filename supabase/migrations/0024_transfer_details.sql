-- =====================================================================
-- 0024: 창고 이동(쿠팡 입고) 상세 정보
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--   이동 1건(stock_movements.batch_id) 마다 센터·입고시간·PLT·트럭·차량비용 등을 붙인다.
--   재고 계산에는 쓰지 않고, 이동 내역 표에서만 보여준다.
-- =====================================================================

create table if not exists public.transfer_details (
  batch_id      uuid primary key,
  center        text,                 -- 입고 센터 (예: 안성5센터)
  arrival_time  text,                 -- 입고(도착 예정) 시간 HH:MM
  po_no         text,                 -- 쿠팡 발주번호
  ship_method   text,                 -- 출고 방법 (예: 밀크런)
  pallets       int check (pallets is null or pallets >= 0),   -- PLT 수
  truck_ton     text,                 -- 입고 트럭 (예: 1T, 2.5T)
  vehicle_cost  bigint check (vehicle_cost is null or vehicle_cost >= 0),  -- 차량 비용
  out_no        text,                 -- 스타팩 출고번호
  vehicle_no    text,                 -- 차량번호
  driver        text,                 -- 기사님 정보
  address       text,                 -- 입고 주소 및 담당자
  raw           text,                 -- 붙여넣은 원문
  updated_by    uuid default auth.uid() references public.profiles (id),
  updated_at    timestamptz not null default now()
);

alter table public.transfer_details enable row level security;

drop policy if exists "transfer_details: 조회" on public.transfer_details;
drop policy if exists "transfer_details: 입력" on public.transfer_details;
drop policy if exists "transfer_details: 수정" on public.transfer_details;
drop policy if exists "transfer_details: 삭제" on public.transfer_details;
create policy "transfer_details: 조회" on public.transfer_details for select to authenticated using (true);
create policy "transfer_details: 입력" on public.transfer_details for insert to authenticated with check (true);
create policy "transfer_details: 수정" on public.transfer_details for update to authenticated using (true) with check (true);
create policy "transfer_details: 삭제" on public.transfer_details for delete to authenticated using (true);

notify pgrst, 'reload schema';
