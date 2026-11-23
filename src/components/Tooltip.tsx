import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Icon } from './Icon';
import * as styles from './Tooltip.css';

interface TooltipProps {
  /** 버튼에 보일 글자 */
  label: ReactNode;
  children: ReactNode;
  /** 말풍선을 버튼 왼쪽 끝(start)에 맞출지 오른쪽 끝(end)에 맞출지 */
  align?: 'start' | 'end';
}

/**
 * ⓘ 버튼 + 말풍선.
 * 데스크톱: 마우스를 올리거나 포커스하면 열림 / 모바일: 눌러서 열고 닫기.
 * 바깥을 누르거나 Esc 를 누르면 닫힌다.
 */
export function Tooltip({ label, children, align = 'end' }: TooltipProps) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const id = useId();
  const open = hover || pinned;

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setPinned(false);
      setHover(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className={styles.root}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(false)}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setPinned((v) => !v)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        <Icon name="info" size={16} />
        {label}
      </button>
      {open && (
        <span id={id} role="tooltip" className={cx(styles.bubble, align === 'end' ? styles.alignEnd : styles.alignStart)}>
          {children}
        </span>
      )}
    </span>
  );
}
