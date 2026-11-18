import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

/**
 * Supabase 클라이언트는 src/api 안에서만 사용한다.
 * 나중에 Spring 서버로 옮길 때 src/api 만 교체하면 화면 코드는 그대로 둘 수 있다.
 */
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
