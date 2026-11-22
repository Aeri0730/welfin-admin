import { useEffect, useRef, useState } from 'react';
import * as s from '@/pages/StoragePage.css';

/** '메모' 칩. 누르면 메모지 모양 말풍선으로 내용을 보여준다. (행 클릭으로 번지지 않음) */
export function MemoChip({ memo }: { memo: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const notes = memo.split('\n').map((line) => line.trim()).filter(Boolean);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className={s.memoChipWrap} onClick={(e) => e.stopPropagation()}>
      <button type="button" className={s.memoChip} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        메모{notes.length > 1 ? ` ${notes.length}` : ''}
      </button>
      {open && (
        <span className={s.memoPopover} role="dialog" aria-label="메모 내용">
          {notes.map((note, index) => (
            <span key={index} className={s.memoPopoverLine}>
              {note}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
