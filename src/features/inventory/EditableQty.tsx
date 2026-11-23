// 사이트 재고 비교 화면(StockComparePage)의 조각. 스타일은 화면과 함께 쓴다.
import { useRef, useState, type ReactNode } from 'react';
import { formatNumber } from '@/lib/format';
import * as st from '@/pages/StockComparePage.css';

/** 수량 (없으면 —, 음수는 빨강) */
export function Qty({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className={st.dash}>—</span>;
  return <span className={value < 0 ? st.negative : undefined}>{formatNumber(value)}</span>;
}

/**
 * 숫자를 눌러 바로 고치는 칸.
 * Enter: 저장하고 아래 줄로, Esc: 취소, 바깥을 누르면 저장.
 */
export function EditableQty({
  value,
  cellId,
  label,
  onCommit,
  children,
}: {
  value: number;
  /** "열:줄번호" — Enter 로 아래 칸을 찾을 때 씀 */
  cellId: string;
  label: string;
  onCommit: (value: number) => void;
  children: ReactNode;
}) {
  const [text, setText] = useState<string | null>(null);
  const cancelled = useRef(false);

  if (text === null)
    return (
      <button
        type="button"
        data-cell={cellId}
        aria-label={`${label} 수정`}
        className={st.editButton}
        onClick={() => {
          cancelled.current = false;
          setText(String(value));
        }}
      >
        {children}
      </button>
    );

  return (
    <input
      autoFocus
      className={st.editInput}
      inputMode="numeric"
      aria-label={label}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setText(e.target.value.replace(/[^\d-]/g, '').slice(0, 9))}
      onBlur={() => {
        const next = Number(text);
        if (!cancelled.current && text !== '' && text !== '-' && Number.isFinite(next) && next !== value) onCommit(next);
        setText(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          cancelled.current = true;
          setText(null);
        }
        if (e.key === 'Enter') {
          e.currentTarget.blur();
          const [col, row] = cellId.split(':');
          window.setTimeout(() => {
            document.querySelector<HTMLButtonElement>(`[data-cell="${col}:${Number(row) + 1}"]`)?.click();
          });
        }
      }}
    />
  );
}
