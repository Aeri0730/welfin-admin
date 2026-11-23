-- =====================================================================
-- 0017: 입고·출고 기록 수정 / 삭제
-- SQL Editor 에서 통째로 실행하세요. (0016 다음에 실행, 여러 번 실행해도 괜찮아요)
--
-- - 본인이 등록한 기록, 또는 관리자만 고칠 수 있다
-- - 고칠 수 있는 것: 날짜(예정 건은 예정 시각), 수량, 메모
-- - 누가 언제 고쳤는지 updated_at / updated_by 에 남긴다
-- =====================================================================

alter table public.stock_movements
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by uuid references public.profiles (id);

-- 공통 권한 확인: 기록을 잠그고 돌려준다
create or replace function public.lock_own_movement(p_id bigint)
returns public.stock_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.stock_movements;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요해요';
  end if;

  select * into v from public.stock_movements where id = p_id for update;
  if not found then
    raise exception '기록을 찾을 수 없어요' using errcode = 'P0001';
  end if;

  if v.created_by is distinct from auth.uid() and not public.is_admin() then
    raise exception '본인이 등록한 기록만 고칠 수 있어요 (관리자는 모두 가능)' using errcode = 'P0001';
  end if;

  return v;
end;
$$;

revoke all on function public.lock_own_movement(bigint) from public, anon, authenticated;

create or replace function public.update_movement(
  p_id           bigint,
  p_moved_on     date,
  p_quantity     int,
  p_memo         text,
  p_scheduled_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v         public.stock_movements := public.lock_own_movement(p_id);
  v_pending boolean := v.scheduled_at is not null and v.scheduled_at > now();
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception '수량은 1개 이상이어야 해요' using errcode = 'P0001';
  end if;

  update public.stock_movements
  set quantity     = p_quantity,
      memo         = nullif(trim(p_memo), ''),
      -- 예정 건: 예정 시각을 바꾸고 날짜는 그 시각에 맞춘다
      scheduled_at = case when v_pending and p_scheduled_at is not null then p_scheduled_at else scheduled_at end,
      moved_on     = case
                       when v_pending and p_scheduled_at is not null then (p_scheduled_at at time zone 'Asia/Seoul')::date
                       else coalesce(p_moved_on, moved_on)
                     end,
      updated_at   = now(),
      updated_by   = auth.uid()
  where id = p_id;
end;
$$;

create or replace function public.delete_movement(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.lock_own_movement(p_id);
  delete from public.stock_movements where id = p_id;
end;
$$;

revoke all on function public.update_movement(bigint, date, int, text, timestamptz) from public, anon;
grant execute on function public.update_movement(bigint, date, int, text, timestamptz) to authenticated;
revoke all on function public.delete_movement(bigint) from public, anon;
grant execute on function public.delete_movement(bigint) to authenticated;

notify pgrst, 'reload schema';
