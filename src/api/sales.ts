import { supabase } from '@/lib/supabase';
import type { DailySales, SalesActual, SalesBaseline, SalesExtra, SalesTarget } from './types';

function toError(error: { message: string; code?: string }): Error {
  if (error.code === '42P01' || error.code === 'PGRST205') return new Error('매출 테이블이 없어요. supabase/migrations/0004_products_sales.sql 을 실행해주세요');
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

const isMissingTable = (error: { code?: string }) => error.code === '42P01' || error.code === 'PGRST205';

/** from ~ to (포함) 기간의 창고 밖 매출. 0010 을 아직 안 돌렸으면 빈 목록 */
export async function fetchSalesExtras({ from, to }: { from: string; to: string }): Promise<SalesExtra[]> {
  const { data, error } = await supabase
    .from('sales_extras')
    .select('sales_on, name, amount, quantity')
    .gte('sales_on', from)
    .lte('sales_on', to)
    .order('sales_on')
    .order('id');
  if (error) {
    if (isMissingTable(error)) return [];
    throw toError(error);
  }
  return data.map((row) => ({ salesOn: row.sales_on, name: row.name, amount: Number(row.amount), quantity: row.quantity }));
}

/** 그날 창고 밖 매출을 통째로 바꾼다 (지우고 다시 넣기) */
export async function saveSalesExtras({ date, rows }: { date: string; rows: SalesExtra[] }): Promise<void> {
  const missing = () => new Error('창고 밖 매출을 저장하려면 supabase/migrations/0010_sales_extras.sql 을 먼저 실행해주세요');
  const del = await supabase.from('sales_extras').delete().eq('sales_on', date);
  if (del.error) throw isMissingTable(del.error) ? missing() : toError(del.error);
  if (rows.length === 0) return;
  const { error } = await supabase.from('sales_extras').insert(
    rows.map((row) => ({ sales_on: date, name: row.name.trim(), amount: row.amount, quantity: row.quantity })),
  );
  if (error) throw isMissingTable(error) ? missing() : toError(error);
}

/** from ~ to (포함) 기간에 입력한 월 실적. 0013 을 아직 안 돌렸으면 빈 목록 */
export async function fetchSalesActuals({ from, to }: { from: string; to: string }): Promise<SalesActual[]> {
  const { data, error } = await supabase
    .from('sales_actuals')
    .select('actual_on, amount')
    .gte('actual_on', from)
    .lte('actual_on', to)
    .order('actual_on');
  if (error) {
    if (isMissingTable(error)) return [];
    throw toError(error);
  }
  return data.map((row) => ({ actualOn: row.actual_on, amount: Number(row.amount) }));
}

/** 그날 월 실적 저장 (amount 가 null 이면 그날 입력 삭제) */
export async function saveSalesActual({ date, amount }: { date: string; amount: number | null }): Promise<void> {
  const missing = () => new Error('실적을 저장하려면 supabase/migrations/0013_sales_actuals.sql 을 먼저 실행해주세요');
  const { error } =
    amount === null
      ? await supabase.from('sales_actuals').delete().eq('actual_on', date)
      : await supabase
          .from('sales_actuals')
          .upsert({ actual_on: date, amount, updated_at: new Date().toISOString() }, { onConflict: 'actual_on' });
  if (error) throw isMissingTable(error) ? missing() : toError(error);
}

/** 누적 매출 기준값. 0010 을 아직 안 돌렸으면 null */
export async function fetchSalesBaseline(): Promise<SalesBaseline | null> {
  const { data, error } = await supabase.from('sales_baseline').select('amount, as_of').eq('id', 1).maybeSingle();
  if (error) {
    if (isMissingTable(error)) return null;
    throw toError(error);
  }
  return data ? { amount: Number(data.amount), asOf: data.as_of } : null;
}

export async function saveSalesBaseline(baseline: SalesBaseline): Promise<void> {
  const { error } = await supabase
    .from('sales_baseline')
    .upsert({ id: 1, amount: baseline.amount, as_of: baseline.asOf, updated_at: new Date().toISOString() });
  if (error) {
    if (isMissingTable(error)) throw new Error('누적 매출을 저장하려면 supabase/migrations/0010_sales_extras.sql 을 먼저 실행해주세요');
    throw toError(error);
  }
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
