import { useState } from 'react';
import { useDeleteMovement, useUpdateMovement } from '@/api/queries';
import { isPending, MOVEMENT_LABEL, type Movement } from '@/api/types';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { TextField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { ErrorBox } from '@/components/ui';
import { today } from '@/lib/format';
import { describeRoute } from './movement';
import * as styles from './MovementEditDialog.css';

/** ISO 시각 → <input type="datetime-local"> 값 (내 컴퓨터 시간대) */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 입출고 기록 한 줄 수정·삭제.
 * 입고·출고 현황, 입출고 내역에서 같이 쓴다.
 */
export function MovementEditDialog({ movement, onClose }: { movement: Movement; onClose: () => void }) {
  const toast = useToast();
  const update = useUpdateMovement();
  const remove = useDeleteMovement();
  const pending = isPending(movement);

  const [movedOn, setMovedOn] = useState(movement.movedOn);
  const [scheduledAt, setScheduledAt] = useState(movement.scheduledAt ? toLocalInput(movement.scheduledAt) : '');
  const [quantity, setQuantity] = useState(String(movement.quantity));
  const [memo, setMemo] = useState(movement.memo ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const qty = Number(quantity);
  const invalid = !(qty > 0) ? '수량을 1개 이상 입력해주세요' : null;
  const label = `${MOVEMENT_LABEL[movement.type]}${pending ? ' 예정' : ''}`;

  const handleSave = () => {
    if (invalid) return;
    update.mutate(
      {
        id: movement.id,
        movedOn,
        quantity: qty,
        memo,
        scheduledAt: pending && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      },
      {
        onSuccess: () => {
          toast(`${label} 기록을 고쳤어요`);
          onClose();
        },
      },
    );
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    remove.mutate(movement.id, {
      onSuccess: () => {
        toast(`${label} 기록을 지웠어요`);
        onClose();
      },
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${label} 수정`}
      footer={
        <div className={styles.footer}>
          <Button variant={confirmDelete ? 'danger' : 'weak'} onClick={handleDelete} loading={remove.isPending}>
            {confirmDelete ? '정말 지울게요' : '삭제'}
          </Button>
          <span className={styles.spacer} />
          <Button variant="weak" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={handleSave} disabled={Boolean(invalid)} loading={update.isPending}>
            저장
          </Button>
        </div>
      }
    >
      <div className={styles.summary}>
        <p className={styles.product}>{movement.product.name}</p>
        <p className={styles.meta}>
          {describeRoute(movement)} · {movement.createdBy}
        </p>
      </div>
      <div className={styles.fields}>
        {pending ? (
          <TextField
            label="예정 시각"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => e.target.value && setScheduledAt(e.target.value)}
            hint="이 시각이 지나면 재고에 반영돼요"
          />
        ) : (
          <TextField
            label="날짜"
            type="date"
            value={movedOn}
            max={today()}
            onChange={(e) => e.target.value && setMovedOn(e.target.value)}
          />
        )}
        <TextField
          label="수량"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value.replace(/\D/g, '').slice(0, 7))}
          error={quantity ? invalid : null}
        />
        <TextField label="메모" value={memo} placeholder="선택" onChange={(e) => setMemo(e.target.value)} />
      </div>
      {confirmDelete && <p className={styles.warn}>지우면 재고에서도 이 수량만큼 되돌아가요.</p>}
      {(update.error ?? remove.error) && <ErrorBox error={update.error ?? remove.error} />}
    </Dialog>
  );
}
