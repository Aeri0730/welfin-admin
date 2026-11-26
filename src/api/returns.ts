import { supabase } from '@/lib/supabase';
import { readAllPages } from './paging';
import type {
  Carrier,
  NewReturnInput,
  ReturnInvoice,
  ReturnItem,
  ReturnKind,
  ReturnPatch,
  ReturnStatus,
  TrackingEvent,
} from './types';

function toError(error: { message: string; code?: string }): Error {
  if (error.code === '23505') return new Error('이미 등록된 관리번호가 있어요');
  if (error.code === '42501') return new Error('권한이 없어요. 관리자에게 문의해주세요');
  if (error.code === '42P01') return new Error('회수 테이블이 없어요. supabase/migrations/0003_returns.sql 을 먼저 실행해주세요');
  if (error.code === '42703' && /original_invoice_no/.test(error.message)) {
    return new Error('원송장번호 칸이 없어요. supabase/migrations/0022_return_original_invoice.sql 을 먼저 실행해주세요');
  }
  if (error.code === '42703' && /invoice_history/.test(error.message)) {
    return new Error('이전 반송장 칸이 없어요. supabase/migrations/0025_return_invoice_history.sql 을 먼저 실행해주세요');
  }
  if (error.code === '42703' && /channel/.test(error.message)) {
    return new Error('접수처 칸이 없어요. supabase/migrations/0018_return_channel.sql 을 먼저 실행해주세요');
  }
  if (error.code === '42703' && /mis_shipped/.test(error.message)) {
    return new Error('오출고 칸이 없어요. supabase/migrations/0029_return_mis_shipped.sql 을 먼저 실행해주세요');
  }
  if (error.code === '42703' && /rerequest_count|restocked/.test(error.message)) {
    return new Error('재접수·양품화 칸이 없어요. supabase/migrations/0005_returns_rerequest.sql 을 먼저 실행해주세요');
  }
  return new Error(error.message);
}

const COLUMNS = `
  id, received_on, source_format, mgmt_no, order_no, ordered_at, shipped_at,
  recipient, phone, address, product_text, sku, quantity, kind, reason,
  carrier, invoice_no, status, collected_at, inspected_at,
  tracking_code, tracking_label, tracking_location, tracking_time, tracking_events,
  tracking_checked_at, tracking_error, memo, rerequest_count, restocked, restocked_at, channel, created_at
`;
/** 마이그레이션을 실행해야 생기는 칸 (없으면 빼고 다시 읽는다) */
const OPTIONAL_COLUMNS = ['original_invoice_no', 'invoice_history', 'mis_shipped_at', 'mis_shipped'];

/** DB 에 저장된 이전 반송장 한 개 */
interface InvoiceHistoryRow {
  carrier: string | null;
  invoice_no: string;
  entered_at?: string | null;
  tracking_code?: string | null;
  tracking_label?: string | null;
  tracking_location?: string | null;
  tracking_time?: string | null;
  tracking_checked_at?: string | null;
  tracking_error?: string | null;
}

function fromHistory(raw: unknown): ReturnInvoice[] {
  if (!Array.isArray(raw)) return [];
  return (raw as InvoiceHistoryRow[])
    .filter((h) => h && typeof h.invoice_no === 'string' && h.invoice_no)
    .map((h) => ({
      carrier: (h.carrier as Carrier | null) ?? null,
      invoiceNo: h.invoice_no,
      enteredAt: h.entered_at ?? null,
      tracking: {
        code: h.tracking_code ?? null,
        label: h.tracking_label ?? null,
        location: h.tracking_location ?? null,
        time: h.tracking_time ?? null,
        checkedAt: h.tracking_checked_at ?? null,
        error: h.tracking_error ?? null,
      },
    }));
}

const toHistory = (list: ReturnInvoice[]): InvoiceHistoryRow[] =>
  list.map((i) => ({
    carrier: i.carrier,
    invoice_no: i.invoiceNo,
    entered_at: i.enteredAt,
    tracking_code: i.tracking.code,
    tracking_label: i.tracking.label,
    tracking_location: i.tracking.location,
    tracking_time: i.tracking.time,
    tracking_checked_at: i.tracking.checkedAt,
    tracking_error: i.tracking.error,
  }));

/** 화면에서 새로 넣은 송장 (아직 조회 전) */
export const newInvoice = (invoiceNo: string, carrier: Carrier | null): ReturnInvoice => ({
  carrier,
  invoiceNo,
  enteredAt: new Date().toISOString(),
  tracking: { code: null, label: null, location: null, time: null, checkedAt: null, error: null },
});

/** 지금 송장을 이전 반송장 한 개로 (재접수로 새 송장이 나올 때 쌓아둔다) */
export function currentInvoice(item: ReturnItem): ReturnInvoice | null {
  if (!item.invoiceNo) return null;
  const t = item.tracking;
  return {
    carrier: item.carrier,
    invoiceNo: item.invoiceNo,
    enteredAt: null,
    tracking: { code: t.code, label: t.label, location: t.location, time: t.time, checkedAt: t.checkedAt, error: t.error },
  };
}

interface ReturnRow {
  id: number;
  received_on: string;
  source_format: number;
  mgmt_no: string | null;
  order_no: string | null;
  ordered_at: string | null;
  shipped_at: string | null;
  recipient: string;
  phone: string | null;
  address: string | null;
  product_text: string;
  sku: string | null;
  quantity: number;
  kind: string | null;
  reason: string | null;
  carrier: string | null;
  invoice_no: string | null;
  status: string;
  collected_at: string | null;
  inspected_at: string | null;
  tracking_code: string | null;
  tracking_label: string | null;
  tracking_location: string | null;
  tracking_time: string | null;
  tracking_events: unknown;
  tracking_checked_at: string | null;
  tracking_error: string | null;
  memo: string | null;
  rerequest_count: number | null;
  restocked: boolean | null;
  restocked_at: string | null;
  channel: string | null;
  original_invoice_no?: string | null;
  invoice_history?: unknown;
  mis_shipped?: boolean | null;
  mis_shipped_at?: string | null;
  created_at: string;
}

function mapRow(row: ReturnRow): ReturnItem {
  return {
    id: row.id,
    receivedOn: row.received_on,
    sourceFormat: row.source_format === 2 ? 2 : 1,
    mgmtNo: row.mgmt_no,
    orderNo: row.order_no,
    orderedAt: row.ordered_at,
    shippedAt: row.shipped_at,
    recipient: row.recipient,
    phone: row.phone,
    address: row.address,
    productText: row.product_text,
    sku: row.sku,
    quantity: row.quantity,
    kind: row.kind as ReturnKind | null,
    reason: row.reason,
    carrier: row.carrier as Carrier | null,
    invoiceNo: row.invoice_no,
    status: row.status as ReturnStatus,
    collectedAt: row.collected_at,
    inspectedAt: row.inspected_at,
    tracking: {
      code: row.tracking_code,
      label: row.tracking_label,
      location: row.tracking_location,
      time: row.tracking_time,
      events: Array.isArray(row.tracking_events) ? (row.tracking_events as TrackingEvent[]) : [],
      checkedAt: row.tracking_checked_at,
      error: row.tracking_error,
    },
    memo: row.memo,
    rerequestCount: row.rerequest_count ?? 0,
    restocked: Boolean(row.restocked),
    restockedAt: row.restocked_at,
    misShipped: Boolean(row.mis_shipped),
    misShippedAt: row.mis_shipped_at ?? null,
    channel: row.channel,
    originalInvoiceNo: row.original_invoice_no ?? null,
    previousInvoices: fromHistory(row.invoice_history),
    createdAt: row.created_at,
  };
}

/** 검수완료 건은 이 기간 안의 것만 불러온다 (회수 화면 안내 문구와 같은 값) */
export const INSPECTED_KEEP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 진행 중인 건 전부 + 최근 INSPECTED_KEEP_DAYS 일 안에 검수완료된 건 */
export async function fetchReturns(): Promise<ReturnItem[]> {
  const since = new Date(Date.now() - INSPECTED_KEEP_DAYS * DAY_MS).toISOString();
  const load = (columns: string) =>
    supabase
      .from('returns')
      .select(columns)
      .or(`status.neq.inspected,inspected_at.gte.${since}`)
      .order('received_on', { ascending: true })
      .order('id', { ascending: true });
  const loadAll = (columns: string) => readAllPages<ReturnRow>((from, to) => load(columns).range(from, to));
  // 아직 실행하지 않은 마이그레이션의 칸은 빼고 다시 읽는다
  let optional = [...OPTIONAL_COLUMNS];
  let result = await loadAll([COLUMNS, ...optional].join(', '));
  while (result.error?.code === '42703' && optional.length > 0) {
    const message = result.error.message;
    const missing = optional.find((column) => message.includes(column));
    optional = missing ? optional.filter((column) => column !== missing) : [];
    result = await loadAll([COLUMNS, ...optional].join(', '));
  }
  if (result.error) throw toError(result.error);
  return result.rows.map(mapRow);
}

export async function createReturns(items: NewReturnInput[]): Promise<number> {
  if (items.length === 0) return 0;
  const { data, error } = await supabase
    .from('returns')
    .insert(
      items.map((item) => ({
        received_on: item.receivedOn,
        source_format: item.sourceFormat,
        mgmt_no: item.mgmtNo,
        order_no: item.orderNo,
        ordered_at: item.orderedAt,
        shipped_at: item.shippedAt,
        recipient: item.recipient,
        phone: item.phone,
        address: item.address,
        product_text: item.productText,
        sku: item.sku,
        quantity: item.quantity,
        kind: item.kind,
        reason: item.reason,
      })),
    )
    .select('id');
  if (error) throw toError(error);
  return data.length;
}

/**
 * 화면의 변경 내용을 DB 컬럼으로 바꾼다.
 * 상태가 바뀌면 시각(회수완료·검수완료)도 같이 기록한다.
 */
async function toColumns(current: Pick<ReturnItem, 'status' | 'invoiceNo'>, patch: ReturnPatch) {
  const columns: Record<string, unknown> = {};
  if (patch.recipient !== undefined) columns.recipient = patch.recipient;
  if (patch.phone !== undefined) columns.phone = patch.phone;
  if (patch.address !== undefined) columns.address = patch.address;
  if (patch.productText !== undefined) columns.product_text = patch.productText;
  if (patch.quantity !== undefined) columns.quantity = patch.quantity;
  if (patch.kind !== undefined) columns.kind = patch.kind;
  if (patch.reason !== undefined) columns.reason = patch.reason;
  if (patch.carrier !== undefined) columns.carrier = patch.carrier;
  if (patch.memo !== undefined) columns.memo = patch.memo;
  if (patch.channel !== undefined) columns.channel = patch.channel;
  if (patch.originalInvoiceNo !== undefined) columns.original_invoice_no = patch.originalInvoiceNo;
  if (patch.rerequestCount !== undefined) columns.rerequest_count = patch.rerequestCount;
  if (patch.previousInvoices !== undefined) columns.invoice_history = toHistory(patch.previousInvoices);
  if (patch.restocked !== undefined) {
    columns.restocked = patch.restocked;
    columns.restocked_at = patch.restocked ? new Date().toISOString() : null;
  }
  if (patch.misShipped !== undefined) {
    columns.mis_shipped = patch.misShipped;
    columns.mis_shipped_at = patch.misShipped ? new Date().toISOString() : null;
  }

  let nextStatus = patch.status;

  if (patch.invoiceNo !== undefined && patch.invoiceNo !== current.invoiceNo) {
    columns.invoice_no = patch.invoiceNo;
    columns.invoice_entered_at = patch.invoiceNo ? new Date().toISOString() : null;
    // 송장이 바뀌면 이전 조회 결과는 버린다
    Object.assign(columns, {
      tracking_code: null,
      tracking_label: null,
      tracking_location: null,
      tracking_time: null,
      tracking_events: null,
      tracking_checked_at: null,
      tracking_error: null,
    });
    if (!nextStatus) {
      if (patch.invoiceNo && current.status === 'requested') nextStatus = 'in_transit';
      if (!patch.invoiceNo && current.status === 'in_transit') nextStatus = 'requested';
    }
  }

  if (nextStatus && nextStatus !== current.status) {
    columns.status = nextStatus;
    const now = new Date().toISOString();
    const order: ReturnStatus[] = ['requested', 'in_transit', 'collected', 'inspected'];
    const rank = order.indexOf(nextStatus);
    columns.collected_at = rank >= 2 ? now : null;
    columns.inspected_at = rank >= 3 ? now : null;
    if (rank >= 3) {
      const { data } = await supabase.auth.getUser();
      columns.inspected_by = data.user?.id ?? null;
    } else {
      columns.inspected_by = null;
    }
    // 이미 회수완료된 건을 검수완료로 올릴 때는 회수완료 시각을 유지
    if (rank === 3 && current.status === 'collected') delete columns.collected_at;
  }

  return columns;
}

export async function updateReturn(
  current: Pick<ReturnItem, 'id' | 'status' | 'invoiceNo'>,
  patch: ReturnPatch,
): Promise<void> {
  const columns = await toColumns(current, patch);
  if (Object.keys(columns).length === 0) return;
  const { error } = await supabase.from('returns').update(columns).eq('id', current.id);
  if (error) throw toError(error);
}

/** 여러 건을 한 번에 수정 (송장 일괄 등록, 반품/교환 일괄 지정) */
export async function updateReturns(
  changes: Array<{ current: Pick<ReturnItem, 'id' | 'status' | 'invoiceNo'>; patch: ReturnPatch }>,
): Promise<number> {
  const results = await Promise.allSettled(changes.map(({ current, patch }) => updateReturn(current, patch)));
  const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed) {
    const done = results.filter((r) => r.status === 'fulfilled').length;
    throw new Error(`${done}건만 저장됐어요: ${(failed.reason as Error).message}`);
  }
  return changes.length;
}

/**
 * 한 건 직접 접수 (개별 입력 모달).
 * 접수 칸으로 넣고, 송장·상태·메모·접수처 같은 나머지는 수정과 같은 규칙(updateReturn)으로 채운다.
 */
export async function createReturn({ input, patch }: { input: NewReturnInput; patch: ReturnPatch }): Promise<void> {
  const { data, error } = await supabase
    .from('returns')
    .insert({
      received_on: input.receivedOn,
      source_format: input.sourceFormat,
      mgmt_no: input.mgmtNo,
      order_no: input.orderNo,
      ordered_at: input.orderedAt,
      shipped_at: input.shippedAt,
      recipient: input.recipient,
      phone: input.phone,
      address: input.address,
      product_text: input.productText,
      sku: input.sku,
      quantity: input.quantity,
      kind: input.kind,
      reason: input.reason,
    })
    .select('id, status, invoice_no')
    .single();
  if (error) throw toError(error);
  try {
    await updateReturn({ id: data.id, status: data.status, invoiceNo: data.invoice_no }, patch);
  } catch (e) {
    throw new Error(`접수는 됐지만 나머지 칸을 저장하지 못했어요. 목록에서 열어 다시 저장해주세요 (${(e as Error).message})`);
  }
}

export async function deleteReturn(id: number): Promise<void> {
  const { data, error } = await supabase.from('returns').delete().eq('id', id).select('id');
  if (error) throw toError(error);
  if (!data?.length) throw new Error('삭제하지 못했어요. 권한을 확인해주세요');
}

export interface TrackResult {
  updated: number;
  collected: number;
  failed: number;
  message?: string;
}

/** 서버(/api/track)에서 tracker.delivery 로 배송 상태를 조회하고 DB 에 저장한다 */
export async function refreshTracking(ids: number[]): Promise<TrackResult> {
  if (ids.length === 0) return { updated: 0, collected: 0, failed: 0 };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('로그인이 필요해요');

  const response = await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ids }),
  });

  const body = (await response.json().catch(() => null)) as (TrackResult & { error?: string }) | null;
  if (!response.ok || !body) {
    if (response.status === 404) throw new Error('배송조회 서버가 아직 없어요 (로컬 개발 중이면 vercel dev 로 실행해주세요)');
    throw new Error(body?.error ?? `배송조회 실패 (${response.status})`);
  }
  return body;
}
