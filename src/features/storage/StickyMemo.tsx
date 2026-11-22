import { useState } from 'react';
import { useSaveStorageMemo } from '@/api/queries';
import { Button } from '@/components/Button';
import { ErrorBox } from '@/components/ui';
import { formatDateLabel } from '@/lib/format';
import * as s from '@/pages/StoragePage.css';

/** 메모지 기울기: 같은 메모는 항상 같은 각도로 */
function tilt(text: string, index: number) {
  let hash = index * 31;
  for (const ch of text) hash = (hash * 33 + ch.charCodeAt(0)) % 997;
  return ((hash % 5) - 2) * 0.8; // -1.6 ~ 1.6도
}

/**
 * 그날 보관비 메모. 입력하면 아래에 메모지가 한 장씩 붙는다 (한 줄 = 한 장).
 */
export function StickyMemo({ date, memo }: { date: string; memo: string | null }) {
  const save = useSaveStorageMemo();
  const [text, setText] = useState('');
  const notes = (memo ?? '').split('\n').map((line) => line.trim()).filter(Boolean);

  const write = (next: string[]) => save.mutateAsync({ date, memo: next.length ? next.join('\n') : null });

  const add = async () => {
    const note = text.replace(/\s*\n\s*/g, ' ').trim();
    if (!note) return;
    await write([...notes, note]);
    setText('');
  };

  return (
    <div className={s.memoBox}>
      <form
        className={s.memoForm}
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input
          className={s.memoInput}
          placeholder={`${formatDateLabel(date)} 메모`}
          aria-label="보관비 메모"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button size="sm" type="submit" disabled={!text.trim()} loading={save.isPending}>
          붙이기
        </Button>
      </form>

      {notes.length > 0 && (
        <div className={s.notes}>
          {notes.map((note, index) => (
            <div key={`${index}:${note}`} className={s.note} style={{ transform: `rotate(${tilt(note, index)}deg)` }}>
              <span className={s.notePin} aria-hidden />
              <p className={s.noteText}>{note}</p>
              <button
                type="button"
                className={s.noteRemove}
                aria-label="메모 떼기"
                onClick={() => void write(notes.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {save.error && <ErrorBox error={save.error} />}
    </div>
  );
}
