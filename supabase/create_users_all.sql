-- =====================================================================
-- 직원 9명 profiles 한 번에 등록
--
-- 1) 먼저 Authentication > Users > "Add user" 로 아래 이메일 9개를 만든다
--    ("Auto Confirm User" 체크, 비밀번호는 초기 비밀번호)
-- 2) 그다음 이 SQL 을 SQL Editor 에서 실행
--    → id 는 auth.users 에서 자동으로 가져오고, created_at 은 자동 입력
-- =====================================================================

insert into public.profiles (id, name, role)
select u.id, v.name, v.role
from (values
  ('ahn.junghyuk@welfin.local', '안중혁', 'admin'),
  ('han.seungjin@welfin.local', '한승진', 'admin'),
  ('park.aeri@welfin.local',    '박애리', 'admin'),
  ('kim.dayoung@welfin.local',  '김다영', 'admin'),
  ('lee.eunji@welfin.local',    '이은지', 'staff'),
  ('kim.minji@welfin.local',    '김민지', 'staff'),
  ('kim.hyojin@welfin.local',   '김효진', 'staff'),
  ('seo.jimin@welfin.local',    '서지민', 'staff'),
  ('yoon.inha@welfin.local',    '윤인하', 'staff')
) as v(email, name, role)
join auth.users u on u.email = v.email
on conflict (id) do update set name = excluded.name, role = excluded.role;

-- 확인: 9줄 나오면 성공 (빠진 사람은 1)에서 이메일을 안 만든 것)
select p.name, p.role, u.email
from public.profiles p join auth.users u on u.id = p.id
order by p.role, p.name;
