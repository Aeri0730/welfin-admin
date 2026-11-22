-- =====================================================================
-- 0008: 11월 보관비 팔레트 수 바로잡기
-- 0006 이전에 이미 입력돼 있던 날짜는 0006 이 덮어쓰지 않아서,
-- 팔레트 수가 잘못 남아 있는 날이 있었다 (예: 11/18 팔레트 3,165개).
--
-- 업체가 알려준 일일금액이 있는데 계산 금액과 다르면,
-- 팔레트 수 = (업체 일일금액 - 경량랙 금액) ÷ 팔레트 단가 로 고친다.
-- (나누어떨어지는 경우만 고침. 여러 번 실행해도 괜찮아요)
-- =====================================================================

update public.storage_fees f
set quantity   = (d.reported_daily - r.quantity * r.unit_price) / f.unit_price,
    updated_at = now()
from public.storage_days d, public.storage_fees r
where f.kind = 'pallet'
  and r.kind = 'rack'
  and r.stored_on = f.stored_on
  and d.stored_on = f.stored_on
  and d.reported_daily is not null
  and f.unit_price > 0
  and f.quantity * f.unit_price + r.quantity * r.unit_price <> d.reported_daily
  and d.reported_daily - r.quantity * r.unit_price >= 0
  and (d.reported_daily - r.quantity * r.unit_price) % f.unit_price = 0;

-- 고친 결과 확인: 계산 금액과 업체 일일금액이 아직 다른 날 (없으면 비어 있음)
select f.stored_on, f.quantity as pallets, r.quantity as racks,
       f.quantity * f.unit_price + r.quantity * r.unit_price as computed, d.reported_daily
from public.storage_fees f
join public.storage_fees r on r.stored_on = f.stored_on and r.kind = 'rack'
join public.storage_days d on d.stored_on = f.stored_on
where f.kind = 'pallet'
  and d.reported_daily is not null
  and f.quantity * f.unit_price + r.quantity * r.unit_price <> d.reported_daily
order by f.stored_on;
