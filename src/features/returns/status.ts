import type { BadgeTone } from "@/components/ui";
import { currentInvoice } from "@/api/returns";
import {
  isKnownChannel,
  returnChannel,
  returnChannelLabel,
  type ReturnChannel,
  type Carrier,
  type ReturnInvoice,
  type TrackingEvent,
  type ReturnItem,
  type ReturnStatus,
} from "@/api/types";

/** 이 차수까지 접수했는데도 집화가 안 됐으면 장기 미수 (1차 = 최초 접수, 2차 = 재접수) */
export const OVERDUE_ATTEMPT = 3;

/** 접수 차수 (rerequestCount 0 → 1차) */
export const attemptOf = (rerequestCount: number) => rerequestCount + 1;

/** 1차: 표시 안 함 / 2차: 재접수 / 3차~: n차 접수 */
export function attemptLabel(attempt: number): string | null {
  if (attempt <= 1) return null;
  if (attempt === 2) return "재접수";
  return `${attempt}차 접수`;
}

export function daysSince(dateString: string, todayString: string): number {
  const a = new Date(`${dateString}T00:00:00`).getTime();
  const b = new Date(`${todayString}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** 택배사가 물건을 가져간 뒤의 배송조회 상태 (집화처리 이후) */
const PICKED_UP_CODES = new Set([
  "AT_PICKUP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "ATTEMPT_FAIL",
  "DELIVERED",
  "AVAILABLE_FOR_PICKUP",
]);

/** 배송조회 결과 한 개 (지금 송장은 이동 경로까지, 이전 송장은 마지막 상태만) */
interface Tracked {
  code: string | null;
  label: string | null;
  events?: TrackingEvent[];
}

/** 한 건의 반송장 전부, 최근 것부터 */
export function invoicesOf(item: ReturnItem): ReturnInvoice[] {
  const current = currentInvoice(item);
  return current ? [current, ...item.previousInvoices] : [...item.previousInvoices];
}

/** 한 건의 배송조회 결과 전부 (지금 송장 + 이전 송장) */
function trackingsOf(item: ReturnItem): Tracked[] {
  return [...(item.invoiceNo ? [item.tracking] : []), ...item.previousInvoices.map((i) => i.tracking)];
}

const pickedUp = (t: Tracked) =>
  Boolean(t.code && PICKED_UP_CODES.has(t.code)) ||
  (t.events ?? []).some((event) => PICKED_UP_CODES.has(event.code) || /집화/.test(event.label));
const atPickup = (t: Tracked) =>
  t.code === "AT_PICKUP" || (!t.code && Boolean(t.label && /집[화하]/.test(t.label)));
const delivered = (t: Tracked) => t.code === "DELIVERED";
/** 택배사가 가져가서 실제로 오고 있는 송장 */
const moving = (t: Tracked) => pickedUp(t) && !atPickup(t) && !delivered(t);

/** 배송조회로 집화처리가 확인됐는지 — 송장 하나라도 (회수완료·검수완료 건은 당연히 집화된 것으로 본다) */
export function isPickedUp(item: ReturnItem): boolean {
  if (item.status === "collected" || item.status === "inspected") return true;
  return trackingsOf(item).some(pickedUp);
}

const isOpen = (item: ReturnItem) =>
  item.status === "requested" || item.status === "in_transit";

/** 미집화: 회수 송장은 나왔는데 어느 송장에도 아직 집화처리가 안 잡힌 건 */
export function isUncollected(item: ReturnItem): boolean {
  return item.status === "in_transit" && !isPickedUp(item);
}

/** 송장 하나라도 배송조회 현재 상태가 집화처리(집화출발) */
export const isAtPickup = (item: ReturnItem) => trackingsOf(item).some(atPickup);

/** 송장 하나라도 배송조회 현재 상태가 배송완료 (우리 쪽에 도착) */
export const isDelivered = (item: ReturnItem) => trackingsOf(item).some(delivered);

/**
 * 회수중: 송장 중 하나라도 실제로 이동 중인 건 (집화 이후, 집화출발·배송완료가 아닌 상태)
 */
export function isReturning(item: ReturnItem): boolean {
  return item.status === "in_transit" && trackingsOf(item).some(moving);
}

/** 집화된 날부터 이 날수가 지나면 장기 회수중 (집화일 = 1일차, 4일차부터 장기) */
export const LONG_RETURNING_DAYS = 3;

/** 배송조회 이동 경로에서 처음 집화된 날 (YYYY-MM-DD). 경로가 없으면 null */
export function pickedUpOn(item: ReturnItem): string | null {
  const times = trackingsOf(item)
    .flatMap((t) => t.events ?? [])
    .filter((event) => PICKED_UP_CODES.has(event.code) || /집화/.test(event.label))
    .flatMap((event) => (event.time ? [event.time.slice(0, 10)] : []))
    .sort();
  return times[0] ?? null;
}

/**
 * 장기 회수중: 회수중인데 집화된 날부터 4일차가 된 건.
 * 집화 날짜를 모르면 접수일부터 센다.
 */
export function isLongReturning(item: ReturnItem, todayString: string): boolean {
  if (!isReturning(item)) return false;
  const since = pickedUpOn(item) ?? item.receivedOn;
  return daysSince(since, todayString) >= LONG_RETURNING_DAYS;
}

/**
 * 장기 미수: 3차 접수까지 했는데 아직 집화가 안 된 건.
 * 배송조회에서 집화처리가 확인되면 장기 미수가 아니다.
 */
export function isOverdue(item: ReturnItem): boolean {
  return (
    isOpen(item) &&
    attemptOf(item.rerequestCount) >= OVERDUE_ATTEMPT &&
    !isPickedUp(item)
  );
}

export type ReturnFilter =
  | "overdue"
  | "uncollected"
  | "long_returning"
  | ReturnStatus
  | "today"
  | "all";

export const FILTERS: Array<{ key: ReturnFilter; label: string }> = [
  { key: "overdue", label: "장기 미수" },
  { key: "today", label: "오늘 접수" },
  { key: "requested", label: "송장 미등록" },
  { key: "uncollected", label: "미집화" },
  { key: "in_transit", label: "회수중" },
  { key: "long_returning", label: "장기 회수중" },
  { key: "collected", label: "회수완료" },
  { key: "inspected", label: "검수완료" },
  { key: "all", label: "전체" },
];

export function matchesFilter(
  item: ReturnItem,
  filter: ReturnFilter,
  todayString: string,
): boolean {
  switch (filter) {
    case "overdue":
      return isOverdue(item);
    case "uncollected":
      return isUncollected(item);
    case "in_transit":
      return isReturning(item) && !isLongReturning(item, todayString);
    case "long_returning":
      return isLongReturning(item, todayString);
    case "today":
      return item.receivedOn === todayString;
    case "all":
      return true;
    case "requested":
      // 오늘 접수한 건은 다음날 송장이 나오므로 전일까지만
      return item.status === "requested" && item.receivedOn < todayString;
    default:
      return item.status === filter;
  }
}

export const STATUS_TONE: Record<ReturnStatus, BadgeTone> = {
  requested: "orange",
  in_transit: "blue",
  collected: "green",
  inspected: "grey",
};

export function trackingTone(code: string | null): BadgeTone {
  switch (code) {
    case "DELIVERED":
      return "green";
    case "ATTEMPT_FAIL":
    case "EXCEPTION":
      return "red";
    case "NOT_FOUND":
    case null:
      return "grey";
    default:
      return "blue";
  }
}

/** 자동 배송조회가 되는 택배사 */
export const isTrackableCarrier = (carrier: Carrier | null) =>
  carrier === "cj" || carrier === "lotte";

/** 자동 조회할 송장이 하나라도 있는 건 */
export const isTrackable = (item: ReturnItem) =>
  invoicesOf(item).some((invoice) => isTrackableCarrier(invoice.carrier));

export function carrierTrackingUrl(
  carrier: Carrier | null,
  invoiceNo: string,
): string | null {
  if (carrier === "cj")
    return `https://trace.cjlogistics.com/next/tracking.html?wblNo=${invoiceNo}`;
  if (carrier === "lotte")
    return `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${invoiceNo}`;
  return null;
}

/** 이름 · 연락처 · 관리번호 · 주문번호 · 송장번호 · 제품 · 주소 · 사유 · 메모로 검색 */
export function matchesSearch(item: ReturnItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qDigits = q.replace(/\D/g, "");
  const text = [
    returnChannelLabel(item),
    item.recipient,
    item.mgmtNo,
    item.orderNo,
    ...invoicesOf(item).map((invoice) => invoice.invoiceNo),
    item.productText,
    item.address,
    item.reason,
    item.memo,
    item.phone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (text.includes(q)) return true;
  // 하이픈 없이 친 연락처/송장번호도 찾기
  if (qDigits.length >= 4) {
    return [item.phone, item.mgmtNo, ...invoicesOf(item).map((invoice) => invoice.invoiceNo)].some(
      (v) => v && v.replace(/\D/g, "").includes(qDigits),
    );
  }
  return false;
}

/** 접수처 묶음: 스타팩 / 이지어드민 / 그외(직접 입력한 접수처) */
export type ChannelGroup = ReturnChannel | "other";

export const CHANNEL_GROUP_LABEL: Record<ChannelGroup, string> = {
  starpack: "스타팩",
  ezadmin: "이지어드민",
  other: "그외",
};

const CHANNEL_GROUP_ORDER: ChannelGroup[] = ["starpack", "ezadmin", "other"];

export function channelGroup(item: ReturnItem): ChannelGroup {
  const channel = returnChannel(item);
  return isKnownChannel(channel) ? channel : "other";
}

/**
 * 고른 접수처를 맨 위로, 나머지는 스타팩 → 이지어드민 → 그외 순으로 묶는다.
 * 같은 묶음 안의 순서는 그대로 둔다 (안정 정렬).
 */
export function sortByChannel(rows: ReturnItem[], first: ChannelGroup): ReturnItem[] {
  const order = [first, ...CHANNEL_GROUP_ORDER.filter((group) => group !== first)];
  const rank = (item: ReturnItem) => order.indexOf(channelGroup(item));
  return [...rows].sort((a, b) => rank(a) - rank(b));
}
