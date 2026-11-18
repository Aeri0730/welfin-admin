-- =====================================================================
-- 직원 계정 발급 방법 (회원가입 기능 없음)
--
-- 1) Supabase 대시보드 > Authentication > Users > "Add user" > "Create new user"
--    - Email: 아무 형식이나 OK (예: aeri@welfin.local)  ← 로그인할 땐 안 씀
--    - Password: 초기 비밀번호
--    - "Auto Confirm User" 체크
--
-- 2) 아래 SQL 에서 이메일/이름/권한만 바꿔서 SQL Editor 에서 실행
--    → 이후 로그인 화면에서 "이름 + 비밀번호" 로 접속
-- =====================================================================

insert into public.profiles (id, name, role)
select id, '박애리', 'admin'          -- 이름, 권한('admin' | 'staff')
from auth.users
where email = 'aeri@welfin.local';    -- 1)에서 만든 이메일
