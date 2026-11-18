// supabase/users.csv 를 읽어서 로그인 계정 + profiles 를 한 번에 만든다.
// 실행: pnpm create-users   (.env.local 에 아래 3개 필요)
//   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STAFF_INITIAL_PASSWORD
//
// - 이미 있는 계정은 비밀번호를 건드리지 않고 이름/권한만 맞춘다 → 여러 번 돌려도 안전
// - 직원 추가: users.csv 에 한 줄 추가하고 다시 실행
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.STAFF_INITIAL_PASSWORD;

const missing = [
  !url && 'VITE_SUPABASE_URL',
  !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
  !password && 'STAFF_INITIAL_PASSWORD',
].filter(Boolean);
if (missing.length) {
  console.error(`.env.local 에 다음 값이 없어요: ${missing.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// CSV: 이름,직급,아이디,권한
const rows = readFileSync(new URL('../supabase/users.csv', import.meta.url), 'utf8')
  .replace(/^﻿/, '')
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [name, , loginId, role] = line.split(',').map((s) => s.trim());
    if (!['admin', 'staff'].includes(role)) throw new Error(`권한은 admin 또는 staff 여야 해요: ${line}`);
    return { name, email: `${loginId}@welfin.local`, role };
  });

const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
const existing = new Map(list.users.map((u) => [u.email, u.id]));

let failed = 0;
for (const row of rows) {
  try {
    let id = existing.get(row.email);
    let status = '기존 계정';
    if (!id) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: row.email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      id = data.user.id;
      status = '새로 만듦';
    }
    const { error } = await supabase
      .from('profiles')
      .upsert({ id, name: row.name, role: row.role }, { onConflict: 'id' });
    if (error) throw error;
    console.log(`✓ ${row.name} (${row.role}) - ${status}`);
  } catch (e) {
    failed++;
    console.error(`✗ ${row.name}: ${e.message}`);
  }
}

console.log(`\n완료: ${rows.length - failed}/${rows.length}명`);
process.exit(failed ? 1 : 0);
