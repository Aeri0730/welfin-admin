import { isPending, MOVEMENT_LABEL, type Movement } from '@/api/types';
import type { BadgeTone } from '@/components/ui';

export const MOVEMENT_TONE: Record<Movement['type'], BadgeTone> = {
  inbound: 'blue',
  outbound: 'red',
  transfer: 'green',
  adjust: 'orange',
};

/** "매입처 → 스타팩", "스타팩 → 쿠팡" 처럼 이동 경로를 사람이 읽기 좋게 */
export function describeRoute(m: Movement): string {
  switch (m.type) {
    case 'inbound':
      return `${m.partner?.name ?? '매입처'} → ${m.toWarehouse?.name ?? ''}`;
    case 'outbound':
      return `${m.fromWarehouse?.name ?? ''} → 고객`;
    case 'transfer':
      return `${m.fromWarehouse?.name ?? ''} → ${m.toWarehouse?.name ?? ''}`;
    case 'adjust':
      return m.fromWarehouse ? `${m.fromWarehouse.name} 감소` : `${m.toWarehouse?.name ?? ''} 증가`;
  }
}

/** 재고 관점의 부호: 들어오면 +, 나가면 -, 창고 간 이동은 0(전체 재고 변화 없음) */
export function signedQuantity(m: Movement): number {
  if (m.type === 'inbound') return m.quantity;
  if (m.type === 'outbound') return -m.quantity;
  if (m.type === 'adjust') return m.fromWarehouse ? -m.quantity : m.quantity;
  return 0;
}

/** 예정 건 배지 색: 일반 입고·출고와 구분되게 */
const PENDING_TONE: Record<Movement['type'], BadgeTone> = {
  inbound: 'purple',
  outbound: 'pink',
  transfer: 'purple',
  adjust: 'purple',
};

/** 배지 글자와 색: 예정이면 '입고 예정' 처럼 */
export function movementBadge(m: Movement, now = Date.now()): { label: string; tone: BadgeTone } {
  if (isPending(m, now)) return { label: `${MOVEMENT_LABEL[m.type]} 예정`, tone: PENDING_TONE[m.type] };
  return { label: MOVEMENT_LABEL[m.type], tone: MOVEMENT_TONE[m.type] };
}

const scheduleFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** '11. 25. (화) 14:00' */
export function formatSchedule(iso: string): string {
  return scheduleFormatter.format(new Date(iso));
}
