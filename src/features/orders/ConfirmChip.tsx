import type { OrderRequest } from '@/api/orderRequests';
import { useSetOrderConfirmed } from '@/api/queries';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { cx } from '@/lib/cx';
import { formatDateTime } from '@/lib/format';
import * as s from './orders.css';

/** 발주 확인 칩. 담당자(canConfirm)만 눌러서 확인 / 해제한다 */
export function ConfirmChip({
  order,
  canConfirm,
  noConfirmReason,
}: {
  order: OrderRequest;
  canConfirm: boolean;
  /** 권한이 없을 때 눌렀을 때 알려줄 이유 */
  noConfirmReason: string;
}) {
  const toast = useToast();
  const setConfirmed = useSetOrderConfirmed();
  const confirmed = order.confirmedAt !== null;
  const label = confirmed ? '확인' : '미확인';
  const title = confirmed
    ? `${order.confirmer ?? ''} ${formatDateTime(order.confirmedAt)} 확인`.trim()
    : '아직 확인 전이에요';

  if (!canConfirm) {
    return (
      <button
        type="button"
        className={s.chip[confirmed ? 'confirmed' : 'pending']}
        title={title}
        // 줄 클릭(수정 모달)으로 넘기지 않고, 왜 못 바꾸는지 알려준다
        onClick={(e) => {
          e.stopPropagation();
          toast(noConfirmReason);
        }}
      >
        {confirmed && <Icon name="check" size={14} />}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cx(s.chip[confirmed ? 'confirmed' : 'pending'], s.chipButton)}
      title={`${title} · 눌러서 ${confirmed ? '확인 취소' : '확인'}`}
      aria-pressed={confirmed}
      disabled={setConfirmed.isPending}
      // 줄을 누르면 수정 모달이 열리므로 칩 클릭은 줄로 전달하지 않는다
      onClick={(e) => {
        e.stopPropagation();
        setConfirmed.mutate(
          { id: order.id, confirmed: !confirmed },
          { onError: (error) => toast(error.message) },
        );
      }}
    >
      {confirmed && <Icon name="check" size={14} />}
      {label}
    </button>
  );
}
