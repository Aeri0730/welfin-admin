-- =====================================================================
-- 0003: 반품·교환 회수 관리
-- 0002 까지 실행한 뒤, SQL Editor 에서 이 파일을 통째로 실행하세요.
--
-- 흐름
--   1) 당일: 회수 접수 (관리번호 형태 / 주소·연락처 형태)      → status = requested  (회수 송장 미등록)
--   2) 다음날: 회수 송장번호 등록                              → status = in_transit (회수중)
--   3) 배송조회가 '배달완료' 이거나 직접 처리                   → status = collected  (회수완료)
--   4) 창고에서 실물 확인 후 '검수완료'                         → status = inspected  (검수완료)
-- =====================================================================

create table public.returns (
  id                  bigint generated always as identity primary key,

  -- 접수 정보
  received_on         date not null,                           -- 회수 접수일
  source_format       smallint not null check (source_format in (1, 2)),
                                                               -- 1: 관리번호 형태, 2: 주소·연락처 형태
  mgmt_no             text,                                    -- 관리번호 (1 형태)
  order_no            text,                                    -- 주문번호
  ordered_at          text,                                    -- 발주일 (원문)
  shipped_at          text,                                    -- 배송일 (원문)
  recipient           text not null,                           -- 수령자
  phone               text,                                    -- 연락처 (2 형태)
  address             text,                                    -- 주소 (2 형태)
  product_text        text not null,                           -- 판매처상품 / 제품 (원문)
  sku                 text,                                    -- 원문에서 찾은 SKU (예: WELFIN-014)
  quantity            int not null default 1 check (quantity > 0),

  -- 반품/교환 구분
  kind                text check (kind in ('return', 'exchange')),
  reason              text,

  -- 회수 송장
  carrier             text check (carrier in ('cj', 'lotte', 'direct')),
  invoice_no          text,
  invoice_entered_at  timestamptz,

  -- 진행 상태
  status              text not null default 'requested'
                        check (status in ('requested', 'in_transit', 'collected', 'inspected')),
  collected_at        timestamptz,
  inspected_at        timestamptz,
  inspected_by        uuid references public.profiles (id),

  -- 배송조회 결과 (마지막 조회 기준)
  tracking_code       text,          -- tracker.delivery 상태 코드 (DELIVERED 등)
  tracking_label      text,          -- 화면 표시용 상태명
  tracking_location   text,
  tracking_time       timestamptz,
  tracking_events     jsonb,         -- 최근 이동 경로
  tracking_checked_at timestamptz,
  tracking_error      text,

  memo                text,
  created_by          uuid not null default auth.uid() references public.profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index returns_mgmt_no_key on public.returns (mgmt_no) where mgmt_no is not null;
create index returns_status_idx on public.returns (status, received_on);
create index returns_recipient_idx on public.returns (recipient);
create index returns_invoice_idx on public.returns (invoice_no);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger returns_touch
  before update on public.returns
  for each row execute function public.touch_updated_at();

alter table public.returns enable row level security;

create policy "returns: 조회" on public.returns
  for select to authenticated using (true);
create policy "returns: 등록" on public.returns
  for insert to authenticated with check (created_by = auth.uid());
create policy "returns: 수정" on public.returns
  for update to authenticated using (true) with check (true);
create policy "returns: 삭제" on public.returns
  for delete to authenticated using (true);
