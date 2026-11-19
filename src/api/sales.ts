import { supabase } from '@/lib/supabase';
import type { DailySales, SalesTarget, StorageFee, StorageKind } from './types';

function toError(error: { message: string; code?: string }): Error {
  if (error.code === '42P01') return new Error('매출 테이블이 없어요. supabase/migrations/0004_products_sales.sql 을 실행해주세요');
  if (error.code === '42501') return new Error('권한이 없어요. 관리자에게 문의해주세요');
  return new Error(error.message);
}

/** from ~ to (포함) 기간의 일일 매출 */
export async function fetchDailySales({ from, to }: { from: string; to: string }): Promise<DailySales[]> {
  const { data, error } = await supabase
    .from('daily_sales')
    .select('sales_on, warehouse_id, amount, quantity, memo')
    .gte('sales_on', from)
    .lte('sales_on', to)
    .order('sales_on');
  if (error) throw toError(error);
  return data.map((row) => ({
    salesOn: row.sales_on,
    warehouseId: row.warehouse_id,
    amount: Number(row.amount),
    quantity: row.quantity,
    memo: row.memo,
  }));
}

/** 같은 날짜·창고 기록이 있으면 덮어쓴다 */
export async function saveDailySales(rows: DailySales[]): Promise<void> {
  const { error } = await supabase.from('daily_sales').upsert(
    rows.map((row) => ({
      sales_on: row.salesOn,
      warehouse_id: row.warehouseId,
      amount: row.amount,
      quantity: row.quantity,
      memo: row.memo,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'sales_on,warehouse_id' },
  );
  if (error) throw toError(error);
}

export async function fetchSalesTargets(): Promise<SalesTarget[]> {
  const { data, error } = await supabase.from('sales_targets').select('period, amount');
  if (error) throw toError(error);
  return data.map((row) => ({ period: row.period, amount: Number(row.amount) }));
}

export async function saveSalesTarget(target: SalesTarget): Promise<void> {
  const { error } = await supabase
    .from('sales_targets')
    .upsert({ period: target.period, amount: target.amount, updated_at: new Date().toISOString() });
  if (error) throw toError(error);
}

/** from ~ to (포함) 기간의 보관비 */
export async function fetchStorageFees({ from, to }: { from: string; to: string }): Promise<StorageFee[]> {
  const { data, error } = await supabase
    .from('storage_fees')
    .select('stored_on, kind, quantity, unit_price')
    .gte('stored_on', from)
    .lte('stored_on', to)
    .order('stored_on');
  if (error) throw toError(error);
  return data.map((row) => ({
    storedOn: row.stored_on,
    kind: row.kind as StorageKind,
    quantity: row.quantity,
    unitPrice: row.unit_price,
  }));
}

export async function saveStorageFees(rows: StorageFee[]): Promise<void> {
  const { error } = await supabase.from('storage_fees').upsert(
    rows.map((row) => ({
      stored_on: row.storedOn,
      kind: row.kind,
      quantity: row.quantity,
      unit_price: row.unitPrice,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'stored_on,kind' },
  );
  if (error) throw toError(error);
}
