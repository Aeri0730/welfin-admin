import type { BadgeTone } from '@/components/ui';
import type { Carrier, ReturnItem, ReturnStatus } from '@/api/types';

/** 접수 후 이 일수가 지나도 회수가 안 끝나면 장기 미수 */
export const OVERDUE_DAYS = 4;

export function daysSince(dateString: string, todayString: string): number {
  const a = new Date(`${dateString}T00:00:00`).getTime();
  const b = new Date(`${todayString}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function isOverdue(item: ReturnItem, todayString: string): boolean {
  return (item.status === 'requested' || item.status === 'in_transit') && daysSince(item.receivedOn, todayString) >= OVERDUE_DAYS;
}

export type ReturnFilter = 'overdue' | ReturnStatus | 'today' | 'all';

export const FILTERS: Array<{ key: ReturnFilter; label: string }> = [
  { key: 'overdue', label: '장기 미수' },
  { key: 'requested', label: '송장 미등록' },
  { key: 'in_transit', label: '회수중' },
  { key: 'collected', label: '회수완료' },
  { key: 'inspected', label: '검수완료' },
  { key: 'today', label: '오늘 접수' },
  { key: 'all', label: '전체' },
];

export function matchesFilter(item: ReturnItem, filter: ReturnFilter, todayString: string): boolean {
  switch (filter) {
    case 'overdue':
      return isOverdue(item, todayString);
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
  const text = [item.recipient, item.mgmtNo, item.orderNo, item.invoiceNo, item.productText, item.address, item.reason, item.memo, item.phone]
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
