-- =====================================================================
-- 0029: 회수 건 오출고 표시
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--   - 오출고: 잘못 보낸 물건이라 회수한 건인지 (회수 건 모달에서 양품화처럼 표시)
-- =====================================================================

alter table public.returns
  add column if not exists mis_shipped    boolean not null default false,
  add column if not exists mis_shipped_at timestamptz;

comment on column public.returns.mis_shipped is '오출고 여부';
