import { useEffect } from 'react';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchProfile } from '@/api/auth';

/** undefined = 아직 확인 중, null = 로그아웃 상태 */
export const sessionAtom = atom<Session | null | undefined>(undefined);

/** 앱 최상단에서 한 번만 실행: Supabase 세션 변화를 jotai 로 동기화 */
export function useSyncSession() {
  const setSession = useSetAtom(sessionAtom);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => data.subscription.unsubscribe();
  }, [setSession]);
}

export function useSession() {
  return useAtomValue(sessionAtom);
}

export function useProfile() {
  const session = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
    staleTime: Infinity,
  });
}
