import { useEffect, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import * as styles from './Dialog.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** 제목 오른쪽 위에 놓을 버튼 */
  headerAction?: ReactNode;
}

export function Dialog({ open, onClose, title, children, footer, wide, headerAction }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={cx(styles.panel, wide && styles.wide)}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {headerAction ? (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <div className={styles.headerAction}>{headerAction}</div>
          </div>
        ) : (
          <h2 className={styles.title}>{title}</h2>
        )}
        {children && <div className={styles.body}>{children}</div>}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
