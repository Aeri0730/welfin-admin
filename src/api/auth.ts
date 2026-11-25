import { supabase } from '@/lib/supabase';
import type { Profile } from './types';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('이름 또는 비밀번호가 맞지 않아요');
  }
}

/** 이름 + 비밀번호 로그인. 내부적으로 이름을 Supabase Auth 이메일로 바꿔서 로그인한다. */
export async function signIn(name: string, password: string): Promise<void> {
  const { data: email, error } = await supabase.rpc('login_email', { p_name: name });
  if (error) throw error;
  if (!email) throw new InvalidCredentialsError();

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    if (signInError.status === 400) throw new InvalidCredentialsError();
    throw signInError;
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

interface ProfileRow {
  id: string;
  name: string;
  role: Profile['role'];
  can_confirm_orders?: boolean;
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const load = (columns: string) => supabase.from('profiles').select(columns).eq('id', userId).single<ProfileRow>();
  let result = await load('id, name, role, can_confirm_orders');
  // 0028 실행 전이면 확인 권한 없이
  if (result.error?.code === '42703') result = await load('id, name, role');
  if (result.error) throw result.error;
  const row = result.data;
  return { id: row.id, name: row.name, role: row.role, canConfirmOrders: row.can_confirm_orders ?? null };
}
