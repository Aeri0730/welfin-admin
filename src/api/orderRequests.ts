import { supabase } from '@/lib/supabase';

/** 발주 신청 1건 */
export interface OrderRequest {
  /** 고유번호 (uuid, 자동 생성) */
  id: string;
  requestedOn: string;
  recipient: string;
  zipCode: string | null;
  address: string;
  phone: string | null;
  mobile: string | null;
  requestNote: string | null;
  productId: number | null;
  /** 판매처상품명 (신청 당시 제품 이름) */
  productName: string;
  productOption: string | null;
  price: number | null;
  quantity: number;
  /** 신청자 이름 */
  requester: string | null;
  createdAt: string;
  invoiceNo: string | null;
  /** 발주 확인 시각 (null 이면 미확인) */
  confirmedAt: string | null;
  /** 확인한 사람 이름 */
  confirmer: string | null;
}

export interface OrderRequestInput {
  /** 있으면 수정, 없으면 새로 신청 */
  id?: string;
  requestedOn: string;
  recipient: string;
  zipCode: string;
  address: string;
  phone: string;
  mobile: string;
  requestNote: string;
  productId: number;
  productName: string;
  productOption: string;
  price: number | null;
  quantity: number;
  /** 바꿀 때만 보낸다 (0028 실행 전에도 다른 칸은 저장되게) */
  invoiceNo?: string;
}

interface Row {
  id: string;
  requested_on: string;
  recipient: string;
  zip_code: string | null;
  address: string;
  phone: string | null;
  mobile: string | null;
  request_note: string | null;
  product_id: number | null;
  product_name: string;
  product_option: string | null;
  price: number | string | null;
  quantity: number;
  created_at: string;
  creator: { name: string } | null;
  invoice_no?: string | null;
  confirmed_at?: string | null;
  confirmer?: { name: string } | null;
}

const BASE_COLUMNS = `
  id, requested_on, recipient, zip_code, address, phone, mobile, request_note,
  product_id, product_name, product_option, price, quantity, created_at,
  creator:profiles!order_requests_created_by_fkey(name)
`;
/** 0028 칸 */
const CONFIRM_COLUMNS = `, invoice_no, confirmed_at, confirmer:profiles!order_requests_confirmed_by_fkey(name)`;

const MISSING_TABLE = new Set(['42P01', 'PGRST205']);
/** 칸·관계가 아직 없을 때 (0028 실행 전) */
const MISSING_COLUMN = new Set(['42703', 'PGRST200', 'PGRST204']);

function toError(error: { code?: string; message: string }): Error {
  if (error.code && MISSING_TABLE.has(error.code)) {
    return new Error('발주 신청 테이블이 없어요. supabase/migrations/0026_order_requests.sql 을 먼저 실행해주세요');
  }
  if (error.code && MISSING_COLUMN.has(error.code)) {
    return new Error('송장번호·발주 확인 칸이 없어요. supabase/migrations/0028_order_confirm.sql 을 먼저 실행해주세요');
  }
  if (error.code === '42501') return new Error(error.message.includes('담당자') ? error.message : '권한이 없어요. 관리자에게 문의해주세요');
  return new Error(error.message);
}

const mapRow = (r: Row): OrderRequest => ({
  id: r.id,
  requestedOn: r.requested_on,
  recipient: r.recipient,
  zipCode: r.zip_code,
  address: r.address,
  phone: r.phone,
  mobile: r.mobile,
  requestNote: r.request_note,
  productId: r.product_id,
  productName: r.product_name,
  productOption: r.product_option,
  price: r.price === null ? null : Number(r.price),
  quantity: r.quantity,
  requester: r.creator?.name ?? null,
  createdAt: r.created_at,
  invoiceNo: r.invoice_no ?? null,
  confirmedAt: r.confirmed_at ?? null,
  confirmer: r.confirmer?.name ?? null,
});

/** 그날 신청한 발주 (먼저 신청한 것부터) */
export async function fetchOrderRequests(date: string): Promise<OrderRequest[]> {
  const load = (columns: string) =>
    supabase
      .from('order_requests')
      .select(columns)
      .eq('requested_on', date)
      .order('created_at', { ascending: true })
      .returns<Row[]>();
  let result = await load(BASE_COLUMNS + CONFIRM_COLUMNS);
  if (result.error?.code && MISSING_COLUMN.has(result.error.code)) result = await load(BASE_COLUMNS);
  if (result.error) throw toError(result.error);
  return result.data.map(mapRow);
}

const clean = (value: string) => value.trim() || null;

export async function saveOrderRequest(input: OrderRequestInput): Promise<void> {
  const columns = {
    requested_on: input.requestedOn,
    recipient: input.recipient.trim(),
    zip_code: clean(input.zipCode),
    address: input.address.trim(),
    phone: clean(input.phone),
    mobile: clean(input.mobile),
    request_note: clean(input.requestNote),
    product_id: input.productId,
    product_name: input.productName,
    product_option: clean(input.productOption),
    price: input.price,
    quantity: input.quantity,
    ...(input.invoiceNo !== undefined && { invoice_no: clean(input.invoiceNo) }),
    updated_at: new Date().toISOString(),
  };
  const { error } = input.id
    ? await supabase.from('order_requests').update(columns).eq('id', input.id)
    : await supabase.from('order_requests').insert(columns);
  if (error) throw toError(error);
}

/** 발주 확인 체크 / 해제. 여러 건을 한 번에 (담당자만. 확인한 사람은 서버가 채운다) */
export async function setOrderConfirmed({ ids, confirmed }: { ids: string[]; confirmed: boolean }): Promise<number> {
  if (ids.length === 0) return 0;
  const { data, error } = await supabase
    .from('order_requests')
    .update({ confirmed_at: confirmed ? new Date().toISOString() : null })
    .in('id', ids)
    .select('id');
  if (error) throw toError(error);
  if (!data?.length) throw new Error('바꾸지 못했어요. 권한을 확인해주세요');
  return data.length;
}

export async function deleteOrderRequest(id: string): Promise<void> {
  const { data, error } = await supabase.from('order_requests').delete().eq('id', id).select('id');
  if (error) throw toError(error);
  if (!data?.length) throw new Error('삭제하지 못했어요. 권한을 확인해주세요');
}
