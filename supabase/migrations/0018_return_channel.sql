-- =====================================================================
-- 0018: 회수 건 접수처 직접 지정
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--   - channel 이 비어 있으면 예전처럼 관리번호 유무로 판단
--     (관리번호 있음 = 이지어드민, 없음 = 스타팩)
--   - 'ezadmin' / 'starpack' 또는 직접 입력한 접수처 이름을 저장
-- =====================================================================

alter table public.returns
  add column if not exists channel text check (channel is null or char_length(channel) <= 40);

notify pgrst, 'reload schema';
