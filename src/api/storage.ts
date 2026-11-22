import { supabase } from '@/lib/supabase';
import type { StorageDay, StorageItem } from './types';

function toError(error: { message: string; code?: string }): Error {
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return new Error('보관비 테이블이 없어요. supabase/migrations/0006_storage.sql 을 실행해주세요');
  }
  if (error.code === '42501') return new Error('권한이 없어요. 관리자에게 문의해주세요');
  return new Error(error.message);
}

/** 기록이 하나도 없을 때 쓰는 단가 (부가세 포함) */
export const DEFAULT_STORAGE_PRICE = { pallet: 550, rack: 165 } as const;

/**
 * from ~ to (포함) 기간의 날짜별 보관비.
 * 팔레트·경량랙 수량은 storage_fees, 업체 안내 금액·메모는 storage_days 에서 읽어 합친다.
 */
export async function fetchStorageDays({ from, to }: { from: string; to: string }): Promise<StorageDay[]> {
  const [fees, days] = await Promise.all([
    supabase.from('storage_fees').select('stored_on, kind, quantity, unit_price').gte('stored_on', from).lte('stored_on', to),
    supabase.from('storage_days').select('stored_on, reported_daily, reported_total, memo').gte('stored_on', from).lte('stored_on', to),
  ]);
  if (fees.error) throw toError(fees.error);
  if (days.error) throw toError(days.error);

  const byDate = new Map<string, StorageDay>();
  const get = (date: string) => {
    let day = byDate.get(date);
    if (!day) {
      day = {
        storedOn: date,
        palletQty: 0,
        palletPrice: DEFAULT_STORAGE_PRICE.pallet,
        rackQty: 0,
        rackPrice: DEFAULT_STORAGE_PRICE.rack,
        reportedDaily: null,
        reportedTotal: null,
        memo: null,
        recorded: false,
      };
      byDate.set(date, day);
    }
    return day;
  };

  for (const row of fees.data) {
    const day = get(row.stored_on);
    day.recorded = true;
    if (row.kind === 'pallet') {
      day.palletQty = row.quantity;
      day.palletPrice = row.unit_price;
    } else {
      day.rackQty = row.quantity;
      day.rackPrice = row.unit_price;
    }
  }
  for (const row of days.data) {
    const day = get(row.stored_on);
    day.reportedDaily = row.reported_daily;
    day.reportedTotal = row.reported_total;
    day.memo = row.memo;
  }

  return [...byDate.values()].sort((a, b) => a.storedOn.localeCompare(b.storedOn));
}

/** 수량·단가·업체 금액 저장 (메모는 건드리지 않음) */
export async function saveStorageDays(days: Omit<StorageDay, 'memo' | 'recorded'>[]): Promise<number> {
  if (days.length === 0) return 0;
  const now = new Date().toISOString();
  const fees = await supabase.from('storage_fees').upsert(
    days.flatMap((day) => [
      { stored_on: day.storedOn, kind: 'pallet', quantity: day.palletQty, unit_price: day.palletPrice, updated_at: now },
      { stored_on: day.storedOn, kind: 'rack', quantity: day.rackQty, unit_price: day.rackPrice, updated_at: now },
    ]),
    { onConflict: 'stored_on,kind' },
  );
  if (fees.error) throw toError(fees.error);

  const notes = await supabase.from('storage_days').upsert(
    days.map((day) => ({
      stored_on: day.storedOn,
      reported_daily: day.reportedDaily,
      reported_total: day.reportedTotal,
      updated_at: now,
    })),
    { onConflict: 'stored_on' },
  );
  if (notes.error) throw toError(notes.error);
  return days.length;
}

/** 그날 메모만 저장 (메모지 붙이기·떼기) */
export async function saveStorageMemo({ date, memo }: { date: string; memo: string | null }): Promise<void> {
  const { error } = await supabase
    .from('storage_days')
    .upsert({ stored_on: date, memo, updated_at: new Date().toISOString() }, { onConflict: 'stored_on' });
  if (error) throw toError(error);
}

/** 그날 수량·업체 금액 기록 삭제 (메모지는 남겨둔다) */
export async function deleteStorageDay(date: string): Promise<void> {
  const [fees, days, items] = await Promise.all([
    supabase.from('storage_fees').delete().eq('stored_on', date),
    supabase.from('storage_days').update({ reported_daily: null, reported_total: null }).eq('stored_on', date),
    supabase.from('storage_fee_items').delete().eq('stored_on', date),
  ]);
  if (fees.error) throw toError(fees.error);
  if (days.error) throw toError(days.error);
  // 0012 를 아직 실행하지 않았으면 세부 내역 삭제는 건너뜀
  if (items.error && !isMissingTable(items.error)) throw toError(items.error);
}

const isMissingTable = (error: { code?: string }) => error.code === '42P01' || error.code === 'PGRST205';

function itemsError(error: { message: string; code?: string }): Error {
  if (isMissingTable(error)) {
    return new Error('보관비 세부 내역 테이블이 없어요. supabase/migrations/0012_storage_items.sql 을 실행해주세요');
  }
  return toError(error);
}

/** 그날 저장된 제품별 세부 내역 (없으면 빈 배열) */
export async function fetchStorageItems(date: string): Promise<StorageItem[]> {
  const { data, error } = await supabase
    .from('storage_fee_items')
    .select('stored_on, product_id, stock, pallet_capacity, rack_capacity, pallets, racks, amount, exempt')
    .eq('stored_on', date);
  if (error) {
    if (isMissingTable(error)) return [];
    throw itemsError(error);
  }
  return data.map((row) => ({
    storedOn: row.stored_on,
    productId: row.product_id,
    stock: row.stock,
    palletCapacity: row.pallet_capacity,
    rackCapacity: row.rack_capacity,
    pallets: row.pallets,
    racks: row.racks,
    amount: row.amount,
    exempt: row.exempt,
  }));
}

/** 그날 세부 내역을 통째로 바꿔 저장 (지우고 다시 넣음) */
export async function saveStorageItems({ date, items }: { date: string; items: StorageItem[] }): Promise<number> {
  const removed = await supabase.from('storage_fee_items').delete().eq('stored_on', date);
  if (removed.error) throw itemsError(removed.error);
  if (items.length === 0) return 0;
  const now = new Date().toISOString();
  const { error } = await supabase.from('storage_fee_items').insert(
    items.map((item) => ({
      stored_on: date,
      product_id: item.productId,
      stock: item.stock,
      pallet_capacity: item.palletCapacity,
      rack_capacity: item.rackCapacity,
      pallets: item.pallets,
      racks: item.racks,
      amount: item.amount,
      exempt: item.exempt,
      updated_at: now,
    })),
  );
  if (error) throw itemsError(error);
  return items.length;
}
