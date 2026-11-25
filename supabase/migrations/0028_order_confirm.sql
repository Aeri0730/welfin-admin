-- =====================================================================
-- 0028: 발주 확인 체크 · 송장번호
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요. (0026 다음에)
--   발주 확인은 profiles.can_confirm_orders 가 켜진 사람(김다영, 박애리)만.
--   확인한 사람·시각은 서버가 직접 채우고, 권한 없는 사람이 바꾸면 막는다.
-- =====================================================================

alter table public.profiles
  add column if not exists can_confirm_orders boolean not null default false;

update public.profiles set can_confirm_orders = true where name in ('김다영', '박애리');

alter table public.order_requests
  add column if not exists invoice_no   text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid references public.profiles (id);

create or replace function public.can_confirm_orders()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select can_confirm_orders from public.profiles where id = auth.uid()), false);
$$;

revoke all on function public.can_confirm_orders() from public, anon;
grant execute on function public.can_confirm_orders() to authenticated;

create or replace function public.guard_order_confirm()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- 새 신청은 항상 미확인
    new.confirmed_at := null;
    new.confirmed_by := null;
    return new;
  end if;
  if new.confirmed_at is distinct from old.confirmed_at then
    if not public.can_confirm_orders() then
      raise exception '발주 확인은 담당자만 할 수 있어요' using errcode = '42501';
    end if;
    new.confirmed_by := case when new.confirmed_at is null then null else auth.uid() end;
  else
    new.confirmed_by := old.confirmed_by;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_order_confirm on public.order_requests;
create trigger guard_order_confirm
  before insert or update on public.order_requests
  for each row execute function public.guard_order_confirm();

notify pgrst, 'reload schema';
