-- =====================================================================
-- 0005: 회수 재접수 차수 + 양품화 여부
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--   - 같은 이름·주소로 다시 접수할 때 '재접수'를 고르면 새 건을 만들지 않고
--     기존 건의 재접수 차수를 1 올리고 메모에 'n차 재접수' 를 남긴다.
--   - 3차 재접수까지 갔는데 아직 집화가 안 됐으면 장기 미수로 본다.
--   - 양품화: 회수한 물건을 다시 팔 수 있게 처리했는지 (회수 건 모달에서 표시)
-- =====================================================================

alter table public.returns
  add column if not exists rerequest_count smallint not null default 0 check (rerequest_count >= 0);

comment on column public.returns.rerequest_count is '재접수 차수 (0 = 최초 접수)';

alter table public.returns
  add column if not exists restocked    boolean not null default false,
  add column if not exists restocked_at timestamptz;

comment on column public.returns.restocked is '양품화 여부';
