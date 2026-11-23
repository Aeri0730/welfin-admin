import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/lib/cx';
import { Icon } from './Icon';
import * as styles from './Dropdown.css';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface DropdownProps<T extends string> {
  value: T | string;
  options: Array<DropdownOption<T>>;
  onChange: (value: T | string) => void;
  /** 화면에 글자가 없을 때 읽어줄 이름 */
  ariaLabel: string;
  variant?: 'pill' | 'chip' | 'field';
  /** 버튼 id (label htmlFor 연결용) */
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  tone?: 'grey' | 'blue' | 'purple';
  /** 버튼에 보일 내용 (없으면 고른 항목 이름) */
  renderValue?: (label: string) => ReactNode;
  /** 넘기면 메뉴 아래에 직접 입력칸이 생긴다 */
  custom?: { title: string; placeholder?: string; maxLength?: number };
  align?: 'start' | 'end';
  className?: string;
}

/**
 * 토스 톤 드롭다운: 네이티브 select 대신 흰 말풍선 메뉴.
 * 메뉴는 body 에 띄워서 모달 안에서도 잘리지 않는다.
 * Esc·바깥 누르기로 닫히고, ↑↓ 로 항목을 옮길 수 있다.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  variant = 'pill',
  tone = 'grey',
  renderValue,
  custom,
  align = 'start',
  className,
  id: triggerId,
  disabled,
  invalid,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number; minWidth?: number } | null>(null);
  const isCustomValue = !options.some((o) => o.value === value);
  const [customText, setCustomText] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? String(value);

  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const below = rect.bottom + 8;
    const top = below + menuHeight > window.innerHeight - 8 && rect.top - 8 - menuHeight > 8 ? rect.top - 8 - menuHeight : below;
    // 입력칸 모양은 메뉴 폭을 버튼에 맞춘다
    const minWidth = variant === 'field' ? rect.width : undefined;
    setPos(align === 'end' ? { top, right: window.innerWidth - rect.right, minWidth } : { top, left: Math.max(12, rect.left), minWidth });
  };

  const openMenu = () => {
    setCustomText(isCustomValue ? String(value) : '');
    setOpen(true);
  };

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    // 고른 항목에 포커스
    menuRef.current?.querySelector<HTMLElement>('[aria-selected="true"], [role="option"]')?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false);
    };
    const onMove = () => place();
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (next: T | string) => {
    if (next !== value) onChange(next);
    close();
  };

  const applyCustom = () => {
    const text = customText.trim();
    if (text) pick(text);
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      // 모달까지 닫히지 않게 여기서 멈춘다
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      close();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
      if (items.length === 0) return;
      e.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = e.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
      items[next].focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cx(styles.trigger({ variant, tone }), className)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={variant === 'field' ? undefined : `${ariaLabel}: ${label}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            openMenu();
          }
        }}
      >
        <span className={styles.triggerLabel}>{renderValue ? renderValue(label) : label}</span>
        <span className={styles.chevron}>
          <Icon name="chevronDown" size={variant === 'field' ? 18 : 14} />
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={id}
            className={styles.menu}
            style={pos ? { top: pos.top, left: pos.left, right: pos.right, minWidth: pos.minWidth } : { visibility: 'hidden', top: 0, left: 0 }}
            role="listbox"
            aria-label={ariaLabel}
            onKeyDown={onMenuKey}
            // 모달 바깥 누르기로 처리되지 않게
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={styles.option}
                onClick={() => pick(o.value)}
              >
                <span className={styles.optionLabel}>
                  {o.label}
                  {o.hint && <span className={styles.optionHint}> · {o.hint}</span>}
                </span>
                {o.value === value && (
                  <span className={styles.check}>
                    <Icon name="check" size={18} />
                  </span>
                )}
              </button>
            ))}
            {custom && (
              <>
                <div className={styles.divider} />
                <div className={styles.custom}>
                  <p className={styles.customTitle}>{custom.title}</p>
                  <div className={styles.customRow}>
                    <input
                      className={styles.customInput}
                      value={customText}
                      maxLength={custom.maxLength}
                      placeholder={custom.placeholder}
                      aria-label={custom.title}
                      onChange={(e) => setCustomText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyCustom();
                        }
                      }}
                    />
                    <button type="button" className={styles.customApply} onClick={applyCustom} disabled={!customText.trim()}>
                      적용
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
