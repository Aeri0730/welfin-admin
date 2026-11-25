-- =====================================================================
-- 0023: 배차 1건에 상품 여러 개
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--   items = [{"product": "WELFIN-009 웰핀 에어팬", "quantity": 10}, ...]
--   product_text / quantity 는 검색·엑셀용 요약(상품 이름 모음, 수량 합계)으로 계속 채운다.
--   items 가 비어 있는 예전 건은 product_text / quantity 한 줄로 본다.
-- =====================================================================

alter table public.dispatches
  add column if not exists items jsonb;

notify pgrst, 'reload schema';
