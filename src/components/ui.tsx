import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { pageTitle } from '@/styles/typography.css';
import * as styles from './ui.css';

export function Card({ title, className, children, ...rest }: HTMLAttributes<HTMLElement> & { title?: ReactNode }) {
  return (
    <section className={cx(styles.card, className)} {...rest}>
      {title && <h2 className={styles.cardTitle}>{title}</h2>}
      {children}
    </section>
  );
}

export type BadgeTone = 'blue' | 'red' | 'green' | 'orange' | 'grey';

export function Badge({ tone, children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={styles.badge({ tone })}>{children}</span>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <h1 className={pageTitle}>{title}</h1>
        {description && <p className={styles.pageDescription}>{description}</p>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </header>
  );
}

export function EmptyState({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {description && <p>{description}</p>}
    </div>
  );
}

export function Skeleton({ height = 20, width = '100%', style }: { height?: number; width?: number | string; style?: CSSProperties }) {
  return <div className={styles.skeleton} style={{ height, width, ...style }} aria-hidden />;
}

export function ErrorBox({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요';
  return (
    <div className={styles.errorBox} role="alert">
      {message}
    </div>
  );
}
