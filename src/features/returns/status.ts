import type { BadgeTone } from '@/components/ui';
import { RETURN_CHANNEL_LABEL, returnChannel, type Carrier, type ReturnItem, type ReturnStatus } from '@/api/types';

/** 이 차수까지 접수했는데도 집화가 안 됐으면 장기 미수 (1차 = 최초 접수, 2차 = 재접수) */
export const OVERDUE_ATTEMPT = 3;

/** 접수 차수 (rerequestCount 0 → 1차) */
export const attemptOf = (rerequestCount: number) => rerequestCount + 1;

/** 1차: 표시 안 함 / 2차: 재접수 / 3차~: n차 접수 */
export function attemptLabel(attempt: number): string | null {
  if (attempt <= 1) return null;
  if (attempt === 2) return '재접수';
  return `${attempt}차 접수`;
}

export function daysSince(dateString: string, todayString: string): number {
  const a = new Date(`${dateString}T00:00:00`).getTime();
  const b = new Date(`${todayString}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** 택배사가 물건을 가져간 뒤의 배송조회 상태 (집화처리 이후) */
const PICKED_UP_CODES = new Set(['AT_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ATTEMPT_FAIL', 'DELIVERED', 'AVAILABLE_FOR_PICKUP']);

/** 배송조회로 집화처리가 확인됐는지 (회수완료·검수완료 건은 당연히 집화된 것으로 본다) */
export function isPickedUp(item: ReturnItem): boolean {
  if (item.status === 'collected' || item.status === 'inspected') return true;
  const t = item.tracking;
  if (t.code && PICKED_UP_CODES.has(t.code)) return true;
  return t.events.some((event) => PICKED_UP_CODES.has(event.code) || /집화/.test(event.label));
}

const isOpen = (item: ReturnItem) => item.status === 'requested' || item.status === 'in_transit';

/** 미집화: 회수 송장은 나왔는데 배송조회에 아직 집화처리가 안 잡힌 건 */
export function isUncollected(item: ReturnItem): boolean {
  return item.status === 'in_transit' && !isPickedUp(item);
}

/** 배송조회 현재 상태가 집화처리(집화출발) — 택배사가 막 가져간 단계 */
export function isAtPickup(item: ReturnItem): boolean {
  const t = item.tracking;
  if (t.code === 'AT_PICKUP') return true;
  return !t.code && Boolean(t.label && /집[화하]/.test(t.label));
}

/** 배송조회 현재 상태가 배송완료 (우리 쪽에 도착) */
export const isDelivered = (item: ReturnItem) => item.tracking.code === 'DELIVERED';

/**
 * 회수중: 송장이 있고, 미집화·집화출발·배송완료가 아닌 건 (실제로 이동 중인 건)
 */
export function isReturning(item: ReturnItem): boolean {
  return (
    item.status === 'in_transit' &&
    Boolean(item.invoiceNo) &&
    !isUncollected(item) &&
    !isAtPickup(item) &&
    !isDelivered(item)
  );
}

/**
 * 장기 미수: 3차 접수까지 했는데 아직 집화가 안 된 건.
 * 배송조회에서 집화처리가 확인되면 장기 미수가 아니다.
 */
export function isOverdue(item: ReturnItem): boolean {
  return isOpen(item) && attemptOf(item.rerequestCount) >= OVERDUE_ATTEMPT && !isPickedUp(item);
}

export type ReturnFilter = 'overdue' | 'uncollected' | ReturnStatus | 'today' | 'all';

export const FILTERS: Array<{ key: ReturnFilter; label: string }> = [
  { key: 'overdue', label: '장기 미수' },
  { key: 'requested', label: '송장 미등록' },
  { key: 'uncollected', label: '미집화' },
  { key: 'in_transit', label: '회수중' },
  { key: 'collected', label: '회수완료' },
  { key: 'inspected', label: '검수완료' },
  { key: 'today', label: '오늘 접수' },
  { key: 'all', label: '전체' },
];

export function matchesFilter(item: ReturnItem, filter: ReturnFilter, todayString: string): boolean {
  switch (filter) {
    case 'overdue':
      return isOverdue(item);
    case 'uncollected':
      return isUncollected(item);
    case 'in_transit':
      return isReturning(item);
    case 'today':
      return item.receivedOn === todayString;
    case 'all':
      return true;
    case 'requested':
      // 오늘 접수한 건은 다음날 송장이 나오므로 전일까지만
      return item.status === 'requested' && item.receivedOn < todayString;
    default:
      return item.status === filter;
  }
}

export const STATUS_TONE: Record<ReturnStatus, BadgeTone> = {
  requested: 'orange',
  in_transit: 'blue',
  collected: 'green',
  inspected: 'grey',
};

export function trackingTone(code: string | null): BadgeTone {
  switch (code) {
    case 'DELIVERED':
      return 'green';
    case 'ATTEMPT_FAIL':
    case 'EXCEPTION':
      return 'red';
    case 'NOT_FOUND':
    case null:
      return 'grey';
    default:
      return 'blue';
  }
}

/** 자동 배송조회가 되는 택배사 */
export const isTrackable = (item: ReturnItem) => Boolean(item.invoiceNo) && (item.carrier === 'cj' || item.carrier === 'lotte');

export function carrierTrackingUrl(carrier: Carrier | null, invoiceNo: string): string | null {
  if (carrier === 'cj') return `https://trace.cjlogistics.com/next/tracking.html?wblNo=${invoiceNo}`;
  if (carrier === 'lotte') return `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${invoiceNo}`;
  return null;
}

const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : timeFormatter.format(date);
}

/** 이름 · 연락처 · 관리번호 · 주문번호 · 송장번호 · 제품 · 주소 · 사유 · 메모로 검색 */
export function matchesSearch(item: ReturnItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qDigits = q.replace(/\D/g, '');
  const text = [RETURN_CHANNEL_LABEL[returnChannel(item)], item.recipient, item.mgmtNo, item.orderNo, item.invoiceNo, item.productText, item.address, item.reason, item.memo, item.phone]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (text.includes(q)) return true;
  // 하이픈 없이 친 연락처/송장번호도 찾기
  if (qDigits.length >= 4) {
    return [item.phone, item.invoiceNo, item.mgmtNo].some((v) => v && v.replace(/\D/g, '').includes(qDigits));
  }
  return false;
}
