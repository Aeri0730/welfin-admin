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

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as Profile;
}
