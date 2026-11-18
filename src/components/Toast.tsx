import { useEffect } from 'react';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import * as styles from './Toast.css';

interface ToastState {
  id: number;
  message: string;
}

const toastAtom = atom<ToastState | null>(null);

export function useToast() {
  const setToast = useSetAtom(toastAtom);
  return (message: string) => setToast({ id: Date.now(), message });
}

export function ToastViewport() {
  const toast = useAtomValue(toastAtom);
  const setToast = useSetAtom(toastAtom);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast, setToast]);

  if (!toast) return null;

  return (
    <div key={toast.id} className={styles.toast} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}
