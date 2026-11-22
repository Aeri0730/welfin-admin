-- =====================================================================
-- 0011: 정산 메뉴 (판매처 대금 수령 · 거래처 입금 일정 · 배차비)
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--
-- settlements: 판매처/거래처에서 웰핀이 받을 돈
--   kind = 'receivable' : 판매처 대금 수령 (공급가 × 판매수량 − 반품비 − 반품택배비)
--   kind = 'consign'    : 거래처 입금 일정 (수수료 뗀 정산단가 × 판매수량 − 반품금액)
--   total_amount 가 null 이면 화면에서 위 식으로 자동 계산
-- dispatches: 스타팩 불량 제품 반품 · 배차비 (운임 VAT 별도)
-- =====================================================================

create table if not exists public.settlements (
  id               bigint generated always as identity primary key,
  kind             text not null check (kind in ('receivable', 'consign')),
  agency           text,                 -- 리씽크, 블랜드펀치 등 묶음
  seller           text not null,        -- 판매자
  product_text     text not null,        -- 제품명
  ordered_on       date,                 -- 확정 오더(발주)일
  order_qty        int not null default 0 check (order_qty >= 0),         -- 확정 오더 수량
  final_order_qty  int check (final_order_qty >= 0),                      -- 최종 발주수량
  return_qty       int not null default 0 check (return_qty >= 0),        -- 반품수량
  naver_qty        int check (naver_qty >= 0),                            -- 판매처별 수량 (거래처)
  site_qty         int check (site_qty >= 0),
  sold_qty         int not null default 0 check (sold_qty >= 0),          -- 최종 판매수량
  unit_price       bigint not null default 0 check (unit_price >= 0),     -- 공급가 / 정산단가
  commission_rate  numeric(5, 2),                                         -- 수수료율 (%)
  return_amount    bigint not null default 0 check (return_amount >= 0),  -- 반품비 / 반품금액
  return_shipping  bigint not null default 0 check (return_shipping >= 0),-- 반품택배비
  total_amount     bigint check (total_amount >= 0),                      -- 총 금액 (null = 자동)
  received_amount  bigint not null default 0 check (received_amount >= 0),-- 업체 입금금액
  due_on           date,                 -- 입금예정일
  schedule_note    text,                 -- 일정 메모 (최종발송일 · 최종정산일 등)
  memo             text,
  updated_by       uuid default auth.uid() references public.profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists settlements_kind_idx on public.settlements (kind, due_on);

create table if not exists public.dispatches (
  id            bigint generated always as identity primary key,
  requested_on  date,                    -- 출고 요청 날짜
  shipped_on    date,                    -- 실 출고 날짜
  partner       text not null,           -- 거래처
  product_text  text not null,           -- 제품
  quantity      int not null default 0 check (quantity >= 0),
  vehicle_no    text,                    -- 차량번호
  vehicle_type  text,                    -- 적재량 (예: 화성 1T)
  fare          bigint not null default 0 check (fare >= 0),  -- 운임 (VAT 별도)
  memo          text,
  updated_by    uuid default auth.uid() references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists dispatches_shipped_on_idx on public.dispatches (shipped_on desc);

alter table public.settlements enable row level security;
alter table public.dispatches  enable row level security;

drop policy if exists "settlements: 조회" on public.settlements;
drop policy if exists "settlements: 입력" on public.settlements;
drop policy if exists "settlements: 수정" on public.settlements;
drop policy if exists "settlements: 삭제" on public.settlements;
create policy "settlements: 조회" on public.settlements for select to authenticated using (true);
create policy "settlements: 입력" on public.settlements for insert to authenticated with check (true);
create policy "settlements: 수정" on public.settlements for update to authenticated using (true) with check (true);
create policy "settlements: 삭제" on public.settlements for delete to authenticated using (true);

drop policy if exists "dispatches: 조회" on public.dispatches;
drop policy if exists "dispatches: 입력" on public.dispatches;
drop policy if exists "dispatches: 수정" on public.dispatches;
drop policy if exists "dispatches: 삭제" on public.dispatches;
create policy "dispatches: 조회" on public.dispatches for select to authenticated using (true);
create policy "dispatches: 입력" on public.dispatches for insert to authenticated with check (true);
create policy "dispatches: 수정" on public.dispatches for update to authenticated using (true) with check (true);
create policy "dispatches: 삭제" on public.dispatches for delete to authenticated using (true);

-- ---------- 엑셀에 있던 내역 (이미 있으면 넣지 않음) ----------

insert into public.settlements
  (kind, agency, seller, product_text, ordered_on, order_qty, final_order_qty, return_qty, sold_qty,
   unit_price, return_amount, return_shipping, total_amount, received_amount, due_on)
select 'receivable', '리씽크', '삼프로TV', '에어히터 프로 WELFIN-012', date '2026-11-02', 538, 538, 16, 538,
       104000, 1664000, 208000, 54496000, 0, date '2026-11-23'
where not exists (select 1 from public.settlements where seller = '삼프로TV' and ordered_on = date '2026-11-02');

insert into public.settlements
  (kind, agency, seller, product_text, order_qty, sold_qty, unit_price, commission_rate,
   return_amount, total_amount, received_amount, due_on, schedule_note, memo)
select 'consign', '블랜드펀치', '리뷰머신', '웰핀 더퓨어 맥스 가습기', 456, 456, 32250, 25,
       483750, 14222250, 14222250, date '2026-11-20',
       '10/30(금) 최종발송일 · 11/20(금) 최종정산 (마지막 발주일로 3주 후)',
       '2026/11/20 업데이트 / 세금계산서 발행완료'
where not exists (select 1 from public.settlements where seller = '리뷰머신' and product_text = '웰핀 더퓨어 맥스 가습기');

insert into public.dispatches (requested_on, shipped_on, partner, product_text, quantity, vehicle_no, vehicle_type, fare)
select date '2026-09-02', date '2026-09-02', '양일상사', 'WELFIN-009 웰핀 에어팬', 22, '경기80아1929', '화성 1T', 80000
where not exists (select 1 from public.dispatches where vehicle_no = '경기80아1929' and shipped_on = date '2026-09-02');
