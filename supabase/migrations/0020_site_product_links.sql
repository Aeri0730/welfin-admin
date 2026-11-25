-- =====================================================================
-- 0020: 사이트 상품명 ↔ 우리 제품 연결 기억
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--
-- 사이트 재고 비교에서 '셀메이트의 A 상품 = 우리 B 제품' 으로 한 번 연결하면 여기에 남아서,
-- 다음에 같은 이름이 올라오면 자동으로 연결된다. (어느 컴퓨터에서 열어도 같음)
--   product_id 가 null 이면 '연결 안 함' 으로 정한 것
-- =====================================================================

create table if not exists public.site_product_links (
  site        text not null check (site in ('sellmate', 'ecount', 'ezadmin')),
  -- 비교용으로 정리한 사이트 상품명 (공백·기호 제거, 소문자)
  name_key    text not null,
  product_id  bigint references public.products (id) on delete cascade,
  updated_by  uuid default auth.uid() references public.profiles (id),
  updated_at  timestamptz not null default now(),
  primary key (site, name_key)
);

alter table public.site_product_links enable row level security;

drop policy if exists "site_product_links: 조회" on public.site_product_links;
drop policy if exists "site_product_links: 입력" on public.site_product_links;
drop policy if exists "site_product_links: 수정" on public.site_product_links;
drop policy if exists "site_product_links: 삭제" on public.site_product_links;
create policy "site_product_links: 조회" on public.site_product_links for select to authenticated using (true);
create policy "site_product_links: 입력" on public.site_product_links for insert to authenticated with check (true);
create policy "site_product_links: 수정" on public.site_product_links for update to authenticated using (true) with check (true);
create policy "site_product_links: 삭제" on public.site_product_links for delete to authenticated using (true);
