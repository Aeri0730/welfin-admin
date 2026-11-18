import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { signIn } from '@/api/auth';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Field';
import { ErrorBox } from '@/components/ui';
import { useSession } from './session';
import * as styles from './LoginPage.css';

export function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () => signIn(name.trim(), password),
    onSuccess: () => navigate(from, { replace: true }),
  });

  if (session) return <Navigate to={from} replace />;

  const canSubmit = name.trim().length > 0 && password.length > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) login.mutate();
  };

  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <p className={styles.brand}>Welfin 재고관리</p>
        <h1 className={styles.title}>{'이름과 비밀번호를\n입력해주세요'}</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <TextField
            label="이름"
            placeholder="홍길동"
            autoComplete="username"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="비밀번호"
            type="password"
            placeholder="비밀번호"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {login.error && <ErrorBox error={login.error} />}

          <div className={styles.footer}>
            <Button type="submit" size="lg" fullWidth disabled={!canSubmit} loading={login.isPending}>
              로그인
            </Button>
            <p className={styles.notice}>계정이 없다면 관리자에게 요청해주세요</p>
          </div>
        </form>
      </div>
    </main>
  );
}
