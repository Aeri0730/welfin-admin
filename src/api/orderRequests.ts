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
}

const COLUMNS = `
  id, requested_on, recipient, zip_code, address, phone, mobile, request_note,
  product_id, product_name, product_option, price, quantity, created_at,
  creator:profiles!order_requests_created_by_fkey(name)
`;

const MISSING = new Set(['42P01', 'PGRST205']);

function toError(error: { code?: string; message: string }): Error {
  if (error.code && MISSING.has(error.code)) {
    return new Error('발주 신청 테이블이 없어요. supabase/migrations/0026_order_requests.sql 을 먼저 실행해주세요');
  }
  if (error.code === '42501') return new Error('권한이 없어요. 관리자에게 문의해주세요');
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
});

/** 그날 신청한 발주 (먼저 신청한 것부터) */
export async function fetchOrderRequests(date: string): Promise<OrderRequest[]> {
  const { data, error } = await supabase
    .from('order_requests')
    .select(COLUMNS)
    .eq('requested_on', date)
    .order('created_at', { ascending: true })
    .returns<Row[]>();
  if (error) throw toError(error);
  return data.map(mapRow);
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
    updated_at: new Date().toISOString(),
  };
  const { error } = input.id
    ? await supabase.from('order_requests').update(columns).eq('id', input.id)
    : await supabase.from('order_requests').insert(columns);
  if (error) throw toError(error);
}

export async function deleteOrderRequest(id: string): Promise<void> {
  const { data, error } = await supabase.from('order_requests').delete().eq('id', id).select('id');
  if (error) throw toError(error);
  if (!data?.length) throw new Error('삭제하지 못했어요. 권한을 확인해주세요');
}
