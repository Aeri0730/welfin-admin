import { useState } from 'react';
import { useCancelScheduledMovements, useSaveTransferDetail } from '@/api/queries';
import type { TransferDetail } from '@/api/transfers';
import { isPending, type Movement } from '@/api/types';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { ErrorBox } from '@/components/ui';
import { formatDateLabel, formatNumber } from '@/lib/format';
import { describeRoute } from './movement';
import { MovementEditDialog } from './MovementEditDialog';
import { TransferDetailFields, toDetailForm, toTransferDetail, type DetailForm } from './TransferDetailFields';
import * as m from './MovementEditDialog.css';
import * as s from './TransferDialog.css';

/** 이동 내역 한 건: 센터·PLT·차량비용 같은 상세를 고치고, 수량·날짜는 기존 수정 모달로 */
export function TransferEditDialog({
  batch,
  detail,
  onClose,
}: {
  batch: Movement[];
  detail: TransferDetail | undefined;
  onClose: () => void;
}) {
  const toast = useToast();
  const save = useSaveTransferDetail();
  const cancel = useCancelScheduledMovements();
  const [form, setForm] = useState<DetailForm>(() => toDetailForm(detail));
  const [editingLine, setEditingLine] = useState<Movement | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const first = batch[0];
  const pending = isPending(first);

  const handleSave = () =>
    save.mutate(toTransferDetail(first.batchId, form, detail?.raw ?? null), {
      onSuccess: () => {
        toast('저장했어요');
        onClose();
      },
    });

  const handleCancel = () => {
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    cancel.mutate(first.batchId, {
      onSuccess: () => {
        toast('이동 예정을 취소했어요');
        onClose();
      },
    });
  };

  if (editingLine) {
    return <MovementEditDialog movement={editingLine} onClose={() => setEditingLine(null)} />;
  }

  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title="이동 수정"
      footer={
        <div className={s.footer}>
          {pending && (
            <Button variant="danger" onClick={handleCancel} loading={cancel.isPending}>
              {confirmCancel ? '정말 취소' : '예정 취소'}
            </Button>
          )}
          <span className={s.spacer} />
          <Button variant="weak" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={handleSave} loading={save.isPending}>
            저장
          </Button>
        </div>
      }
    >
      <div className={m.summary}>
        <p className={m.meta}>
          {formatDateLabel(first.movedOn)}
          {pending && ' 입고 예정'} · {describeRoute(first)}
        </p>
        <ul style={{ marginTop: 6 }}>
          {batch.map((line) => (
            <li key={line.id}>
              <button type="button" className={s.lineButton} onClick={() => setEditingLine(line)}>
                <span className={m.product}>{line.product.name}</span>
                <span className={s.lineQty}>{formatNumber(line.quantity)}개</span>
                <Icon name="edit" size={14} />
              </button>
            </li>
          ))}
        </ul>
        <p className={m.meta}>날짜·수량은 제품을 눌러 고쳐요</p>
      </div>

      <div style={{ marginTop: 16 }}>
        <TransferDetailFields value={form} onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))} />
      </div>

      {(save.error || cancel.error) && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox error={save.error ?? cancel.error} />
        </div>
      )}
    </Dialog>
  );
}
