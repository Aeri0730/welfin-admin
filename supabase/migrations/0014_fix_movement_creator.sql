-- =====================================================================
-- 0014: 입출고 '입력한 사람' 바로잡기
--
-- 원인: SQL Editor 에서 실행한 데이터 이관(0004 초기 재고, 0009 11/20 스타팩 출고)은
-- 로그인한 사용자가 없어서 '가장 먼저 가입한 관리자'(안중혁)로 기록됐다.
-- 앱 화면에서 입력한 건은 로그인한 사람으로 정상 저장된다.
--
-- 1) 먼저 아래 [확인] 쿼리만 실행해서 누구 이름으로 몇 건인지 보세요.
-- 2) 이관분을 박애리로 바꾸려면 [수정] 블록까지 실행하세요. 여러 번 실행해도 괜찮아요.
-- =====================================================================

-- [확인] 입력한 사람별 · 메모 종류별 건수
select pr.name as 입력자,
       case
         when m.memo = '초기 재고 (엑셀 이관)' then '0004 초기 재고 이관'
         when m.moved_on = date '2026-11-20' and m.memo like '스타팩 출고 · %' then '0009 11/20 출고 이관'
         else '앱에서 입력'
       end as 구분,
       count(*) as 건수,
       min(m.created_at) as 처음, max(m.created_at) as 마지막
from public.stock_movements m
join public.profiles pr on pr.id = m.created_by
group by 1, 2
order by 2, 1;

-- [수정] SQL 이관분의 입력자를 박애리로
do $$
declare
  v_owner uuid;
begin
  select id into v_owner from public.profiles where name = '박애리' limit 1;
  if v_owner is null then
    raise exception '박애리 계정을 찾지 못했어요. profiles.name 을 확인해주세요';
  end if;

  update public.stock_movements
  set created_by = v_owner
  where created_by <> v_owner
    and (
      memo = '초기 재고 (엑셀 이관)'
      or (moved_on = date '2026-11-20' and memo like '스타팩 출고 · %')
    );
end;
$$;
