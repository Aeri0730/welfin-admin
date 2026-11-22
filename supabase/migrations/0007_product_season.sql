-- =====================================================================
-- 0007: 제품 사용 계절에 '4계절' 추가
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--   category: winter=겨울, summer=여름, all_season=4계절, etc=나머지(부자재 등)
-- =====================================================================

alter table public.products drop constraint if exists products_category_check;
alter table public.products
  add constraint products_category_check check (category in ('winter', 'summer', 'all_season', 'etc'));

comment on column public.products.category is '사용 계절: winter=겨울, summer=여름, all_season=4계절, etc=나머지';
