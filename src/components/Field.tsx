import {
  Children,
  Fragment,
  isValidElement,
  useId,
  type ChangeEvent,
  type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import { Dropdown, type DropdownOption } from './Dropdown';
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

/** <option> 자식들을 드롭다운 항목으로 바꾼다 (map 배열·Fragment 도 펼침) */
function optionsFrom(children: ReactNode): DropdownOption<string>[] {
  const result: DropdownOption<string>[] = [];
  const textOf = (node: ReactNode): string => {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(textOf).join('');
    if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
    return '';
  };
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement<{ value?: string | number; children?: ReactNode }>(child)) return;
      if (child.type === Fragment) return walk(child.props.children);
      if (child.type === 'option') {
        const text = textOf(child.props.children);
        result.push({ value: String(child.props.value ?? text), label: text });
      }
    });
  };
  walk(children);
  return result;
}

/**
 * 선택칸: 겉모양은 토스 톤 드롭다운, 쓰는 법은 예전 <select> 그대로
 * (<option> 자식 + onChange 에서 e.target.value)
 */
export function SelectField({
  label,
  hint,
  error,
  containerClassName,
  className,
  children,
  value,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const options = optionsFrom(children);
  const current = String(value ?? '');
  const shown = options.some((o) => o.value === current) ? current : (options[0]?.value ?? '');
  return (
    <FieldShell label={label} hint={hint} error={error} className={containerClassName}>
      {(id) => (
        <Dropdown
          id={id}
          variant="field"
          className={className}
          ariaLabel={ariaLabel ?? label ?? '선택'}
          value={shown}
          options={options}
          disabled={disabled}
          invalid={Boolean(error)}
          onChange={(next) =>
            onChange?.({ target: { value: next }, currentTarget: { value: next } } as unknown as ChangeEvent<HTMLSelectElement>)
          }
        />
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
