-- =====================================================================
-- 0026: 발주 신청
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--   고유번호(id)는 uuid 로 자동 생성, 신청자(created_by)는 로그인한 사람.
--   상품은 우리 제품(products)에서만 고르고, 이름은 신청 당시 그대로 남긴다.
-- =====================================================================

create table if not exists public.order_requests (
  id              uuid primary key default gen_random_uuid(),
  requested_on    date not null default (now() at time zone 'Asia/Seoul')::date,
  recipient       text not null,
  zip_code        text,
  address         text not null,
  phone           text,                 -- 전화번호
  mobile          text,                 -- 휴대폰
  request_note    text,                 -- 상세요구사항
  product_id      bigint references public.products (id),
  product_name    text not null,        -- 판매처상품명 (신청 당시 이름)
  product_option  text,                 -- 상품옵션
  price           bigint check (price is null or price >= 0),
  quantity        int not null check (quantity > 0),
  created_by      uuid not null default auth.uid() references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists order_requests_requested_on_idx on public.order_requests (requested_on);

alter table public.order_requests enable row level security;

drop policy if exists "order_requests: 조회" on public.order_requests;
drop policy if exists "order_requests: 입력" on public.order_requests;
drop policy if exists "order_requests: 수정" on public.order_requests;
drop policy if exists "order_requests: 삭제" on public.order_requests;
create policy "order_requests: 조회" on public.order_requests for select to authenticated using (true);
create policy "order_requests: 입력" on public.order_requests for insert to authenticated with check (true);
create policy "order_requests: 수정" on public.order_requests for update to authenticated using (true) with check (true);
create policy "order_requests: 삭제" on public.order_requests for delete to authenticated using (true);

notify pgrst, 'reload schema';
