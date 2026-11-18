import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import { button, spinner, type ButtonVariants } from './Button.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariants & {
    loading?: boolean;
  };

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(button({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={spinner} aria-label="처리 중" /> : children}
    </button>
  );
}
