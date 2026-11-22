import { supabase } from '@/lib/supabase';
import type { Dispatch, DispatchInput, Settlement, SettlementInput, SettlementKind } from './types';

function toError(error: { message: string; code?: string }): Error {
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return new Error('정산 테이블이 없어요. supabase/migrations/0011_settlements.sql 을 실행해주세요');
  }
  if (error.code === '42501') return new Error('권한이 없어요. 관리자에게 문의해주세요');
  return new Error(error.message);
}

const SETTLEMENT_COLUMNS =
  'id, kind, agency, seller, product_text, ordered_on, order_qty, final_order_qty, return_qty, naver_qty, site_qty, sold_qty, unit_price, commission_rate, return_amount, return_shipping, total_amount, received_amount, due_on, schedule_note, memo';

interface SettlementRow {
  id: number;
  kind: SettlementKind;
  agency: string | null;
  seller: string;
  product_text: string;
  ordered_on: string | null;
  order_qty: number;
  final_order_qty: number | null;
  return_qty: number;
  naver_qty: number | null;
  site_qty: number | null;
  sold_qty: number;
  unit_price: number | string;
  commission_rate: number | string | null;
  return_amount: number | string;
  return_shipping: number | string;
  total_amount: number | string | null;
  received_amount: number | string;
  due_on: string | null;
  schedule_note: string | null;
  memo: string | null;
}

const numOrNull = (v: number | string | null) => (v === null ? null : Number(v));

export async function fetchSettlements(kind: SettlementKind): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select(SETTLEMENT_COLUMNS)
    .eq('kind', kind)
    .order('due_on', { ascending: false, nullsFirst: true })
    .order('id', { ascending: false })
    .returns<SettlementRow[]>();
  if (error) throw toError(error);
  return data.map((row) => ({
    id: row.id,
    kind: row.kind,
    agency: row.agency,
    seller: row.seller,
    productText: row.product_text,
    orderedOn: row.ordered_on,
    orderQty: row.order_qty,
    finalOrderQty: row.final_order_qty,
    returnQty: row.return_qty,
    naverQty: row.naver_qty,
    siteQty: row.site_qty,
    soldQty: row.sold_qty,
    unitPrice: Number(row.unit_price),
    commissionRate: numOrNull(row.commission_rate),
    returnAmount: Number(row.return_amount),
    returnShipping: Number(row.return_shipping),
    totalAmount: numOrNull(row.total_amount),
    receivedAmount: Number(row.received_amount),
    dueOn: row.due_on,
    scheduleNote: row.schedule_note,
    memo: row.memo,
  }));
}

export async function saveSettlement(input: SettlementInput): Promise<void> {
  const columns = {
    kind: input.kind,
    agency: input.agency?.trim() || null,
    seller: input.seller.trim(),
    product_text: input.productText.trim(),
    ordered_on: input.orderedOn || null,
    order_qty: input.orderQty,
    final_order_qty: input.finalOrderQty,
    return_qty: input.returnQty,
    naver_qty: input.naverQty,
    site_qty: input.siteQty,
    sold_qty: input.soldQty,
    unit_price: input.unitPrice,
    commission_rate: input.commissionRate,
    return_amount: input.returnAmount,
    return_shipping: input.returnShipping,
    total_amount: input.totalAmount,
    received_amount: input.receivedAmount,
    due_on: input.dueOn || null,
    schedule_note: input.scheduleNote?.trim() || null,
    memo: input.memo?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = input.id
    ? await supabase.from('settlements').update(columns).eq('id', input.id)
    : await supabase.from('settlements').insert(columns);
  if (error) throw toError(error);
}

export async function deleteSettlement(id: number): Promise<void> {
  const { error } = await supabase.from('settlements').delete().eq('id', id);
  if (error) throw toError(error);
}

interface DispatchRow {
  id: number;
  requested_on: string | null;
  shipped_on: string | null;
  partner: string;
  product_text: string;
  quantity: number;
  vehicle_no: string | null;
  vehicle_type: string | null;
  fare: number | string;
  memo: string | null;
}

export async function fetchDispatches(): Promise<Dispatch[]> {
  const { data, error } = await supabase
    .from('dispatches')
    .select('id, requested_on, shipped_on, partner, product_text, quantity, vehicle_no, vehicle_type, fare, memo')
    .order('shipped_on', { ascending: false, nullsFirst: true })
    .order('id', { ascending: false })
    .returns<DispatchRow[]>();
  if (error) throw toError(error);
  return data.map((row) => ({
    id: row.id,
    requestedOn: row.requested_on,
    shippedOn: row.shipped_on,
    partner: row.partner,
    productText: row.product_text,
    quantity: row.quantity,
    vehicleNo: row.vehicle_no,
    vehicleType: row.vehicle_type,
    fare: Number(row.fare),
    memo: row.memo,
  }));
}

export async function saveDispatch(input: DispatchInput): Promise<void> {
  const columns = {
    requested_on: input.requestedOn || null,
    shipped_on: input.shippedOn || null,
    partner: input.partner.trim(),
    product_text: input.productText.trim(),
    quantity: input.quantity,
    vehicle_no: input.vehicleNo?.trim() || null,
    vehicle_type: input.vehicleType?.trim() || null,
    fare: input.fare,
    memo: input.memo?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = input.id
    ? await supabase.from('dispatches').update(columns).eq('id', input.id)
    : await supabase.from('dispatches').insert(columns);
  if (error) throw toError(error);
}

export async function deleteDispatch(id: number): Promise<void> {
  const { error } = await supabase.from('dispatches').delete().eq('id', id);
  if (error) throw toError(error);
}
