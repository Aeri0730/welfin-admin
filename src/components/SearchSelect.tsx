import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/lib/cx';
import { Icon } from './Icon';
import type { DropdownOption } from './Dropdown';
import * as menuStyles from './Dropdown.css';
import * as styles from './SearchSelect.css';

interface SearchSelectProps {
  value: string;
  options: Array<DropdownOption<string>>;
  onChange: (value: string) => void;
  ariaLabel: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  /** 'sm': 표 안에 넣는 작은 칸 */
  size?: 'md' | 'sm';
}

const MENU_GAP = 8;

/** 이름·힌트(품번 등)에 검색어가 들어 있는지 (대소문자·공백 무시) */
function matches(option: DropdownOption<string>, query: string) {
  const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '');
  const q = normalize(query);
  return normalize(option.label).includes(q) || normalize(option.hint ?? '').includes(q);
}

/**
 * 검색되는 선택칸: 누르면 전체 목록이 열리고, 입력하면 바로 걸러진다.
 * 고르지 않고 벗어나면 원래 고른 항목으로 돌아간다.
 */
export function SearchSelect({
  value,
  options,
  onChange,
  ariaLabel,
  id: inputId,
  placeholder = '검색',
  disabled,
  invalid,
  className,
  size = 'md',
}: SearchSelectProps) {
  const compact = size === 'sm';
  const [open, setOpen] = useState(false);
  /** null 이면 아직 입력 안 함 → 고른 항목 이름을 보여주고 목록은 전부 */
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(
    () => (query?.trim() ? options.filter((o) => matches(o, query)) : options),
    [options, query],
  );

  const place = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const below = rect.bottom + MENU_GAP;
    const fitsBelow = below + menuHeight <= window.innerHeight - MENU_GAP;
    const fitsAbove = rect.top - MENU_GAP - menuHeight > MENU_GAP;
    const top = !fitsBelow && fitsAbove ? rect.top - MENU_GAP - menuHeight : below;
    setPos({ top, left: rect.left, width: compact ? Math.max(rect.width, styles.MIN_MENU_WIDTH) : rect.width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
    // 목록 길이가 바뀌면 위/아래 자리도 다시 잰다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered.length]);

  // 하이라이트된 항목이 보이게 스크롤
  useLayoutEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const openMenu = () => {
    if (disabled) return;
    const selectedIndex = options.findIndex((o) => o.value === value);
    setActiveIndex(Math.max(0, selectedIndex));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setQuery(null);
  };

  const pick = (option: DropdownOption<string>) => {
    if (option.value !== value) onChange(option.value);
    close();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return openMenu();
      if (filtered.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((i) => (i + step + filtered.length) % filtered.length);
      return;
    }
    if (e.key === 'Enter' && open) {
      // 폼 제출 막기
      e.preventDefault();
      const option = filtered[activeIndex];
      if (option) pick(option);
      return;
    }
    if (e.key === 'Escape' && open) {
      // 모달까지 닫히지 않게 여기서 멈춘다
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      close();
    }
  };

  const activeOption = open ? filtered[activeIndex] : undefined;

  return (
    <div className={cx(styles.wrap, className)}>
      <span className={cx(styles.searchIcon, compact && styles.compactIcon)}>
        <Icon name="search" size={compact ? 16 : 18} />
      </span>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        className={cx(styles.input, compact && styles.compactInput)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={activeOption ? `${listId}-${activeOption.value}` : undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={query ?? selected?.label ?? ''}
        onFocus={(e) => {
          openMenu();
          // 바로 입력하면 기존 이름이 지워지고 검색되게
          e.currentTarget.select();
        }}
        onClick={() => !open && openMenu()}
        onBlur={close}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          if (!open) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className={menuStyles.menu}
            style={pos ? { top: pos.top, left: pos.left, width: pos.width } : { visibility: 'hidden', top: 0, left: 0 }}
            // 누를 때 입력칸 포커스가 빠져 목록이 먼저 닫히지 않게
            onMouseDown={(e) => e.preventDefault()}
            // 모달 바깥 누르기로 처리되지 않게
            onClick={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 && <p className={styles.empty}>검색 결과가 없어요</p>}
            {filtered.map((o, index) => (
              <div
                key={o.value}
                id={`${listId}-${o.value}`}
                data-index={index}
                role="option"
                aria-selected={o.value === value}
                className={cx(menuStyles.option, index === activeIndex && styles.active)}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => pick(o)}
              >
                <span className={menuStyles.optionLabel}>
                  {o.label}
                  {o.hint && <span className={menuStyles.optionHint}> · {o.hint}</span>}
                </span>
                {o.value === value && (
                  <span className={menuStyles.check}>
                    <Icon name="check" size={18} />
                  </span>
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
