import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import * as styles from './Field.css';

interface FieldShellProps {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: (id: string) => ReactNode;
}

function FieldShell({ label, hint, error, className, children }: FieldShellProps) {
  const id = useId();
  return (
    <div className={cx(styles.field, className)}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      {children(id)}
      {error ? (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      ) : (
        hint && <p className={styles.message}>{hint}</p>
      )}
    </div>
  );
}

type Common = { label?: string; hint?: ReactNode; error?: string | null; containerClassName?: string };

export function TextField({ label, hint, error, containerClassName, className, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={containerClassName}>
      {(id) => (
        <input id={id} className={cx(styles.input, className)} aria-invalid={Boolean(error) || undefined} {...rest} />
      )}
    </FieldShell>
  );
}

export function SelectField({ label, hint, error, containerClassName, className, children, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={containerClassName}>
      {(id) => (
        <select id={id} className={cx(styles.select, className)} aria-invalid={Boolean(error) || undefined} {...rest}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function TextAreaField({ label, hint, error, containerClassName, className, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={containerClassName}>
      {(id) => (
        <textarea id={id} className={cx(styles.textarea, className)} aria-invalid={Boolean(error) || undefined} {...rest} />
      )}
    </FieldShell>
  );
}
