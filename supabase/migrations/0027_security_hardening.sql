-- =====================================================================
-- 0027: 보안 강화
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--
-- 1) 등록된 직원(profiles 에 있는 사람)만 데이터를 보고 고칠 수 있게
--    화면엔 가입 기능이 없지만, Supabase 가입 API 는 공개 키로도 부를 수 있어서
--    누가 직접 가입하면 '로그인한 사람' 이 되어 버린다. profiles 는 관리자가
--    scripts/create-users.mjs 로만 만들기 때문에, 여기에 없으면 막는다.
-- 2) 작성자(created_by)·수정자(updated_by) 는 로그인한 사람으로 서버가 직접 채운다
--    (화면에서 다른 사람 id 를 보내도 무시. created_by 는 수정해도 안 바뀜)
-- 3) 발주 신청은 본인 이름으로만 등록
-- =====================================================================

-- 1-1. 등록된 직원인지
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

revoke all on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

-- 3. 발주 신청: 본인 이름으로만 등록 (1-2 에서 직원 조건이 함께 붙는다)
drop policy if exists "order_requests: 입력" on public.order_requests;
create policy "order_requests: 입력" on public.order_requests
  for insert to authenticated with check (created_by = auth.uid());

-- 1-2. 로그인 사용자에게 열린 public 정책마다 '등록된 직원' 조건을 앞에 붙인다
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public' and 'authenticated' = any (roles)
  loop
    if p.qual is not null and p.qual not like '%is_member()%' then
      execute format('alter policy %I on %I.%I using (public.is_member() and (%s))',
        p.policyname, p.schemaname, p.tablename, p.qual);
    end if;
    if p.with_check is not null and p.with_check not like '%is_member()%' then
      execute format('alter policy %I on %I.%I with check (public.is_member() and (%s))',
        p.policyname, p.schemaname, p.tablename, p.with_check);
    end if;
  end loop;
end $$;

-- 2. 작성자·수정자 도장
create or replace function public.stamp_author()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  patch jsonb := '{}'::jsonb;
begin
  -- 관리자 스크립트(서비스 키)는 auth.uid() 가 없으니 그대로 둔다
  if uid is null then
    return new;
  end if;
  if to_jsonb(new) ? 'created_by' then
    patch := patch || jsonb_build_object(
      'created_by',
      case when tg_op = 'INSERT' then to_jsonb(uid) else to_jsonb(old) -> 'created_by' end
    );
  end if;
  if to_jsonb(new) ? 'updated_by' then
    patch := patch || jsonb_build_object('updated_by', uid);
  end if;
  return jsonb_populate_record(new, patch);
end;
$$;

do $$
declare
  t record;
begin
  for t in
    select distinct c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name in ('created_by', 'updated_by')
      and tb.table_type = 'BASE TABLE'
  loop
    execute format('drop trigger if exists stamp_author on public.%I', t.table_name);
    execute format(
      'create trigger stamp_author before insert or update on public.%I for each row execute function public.stamp_author()',
      t.table_name);
  end loop;
end $$;

notify pgrst, 'reload schema';
