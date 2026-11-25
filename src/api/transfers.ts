import { supabase } from '@/lib/supabase';

/** 창고 이동(쿠팡 입고) 1건에 붙는 상세 정보 */
export interface TransferDetail {
  batchId: string;
  center: string | null;
  /** 입고(도착 예정) 시간 HH:MM */
  arrivalTime: string | null;
  poNo: string | null;
  shipMethod: string | null;
  pallets: number | null;
  /** 입고 트럭 (예: 1T) */
  truckTon: string | null;
  vehicleCost: number | null;
  /** 스타팩 출고번호 */
  outNo: string | null;
  vehicleNo: string | null;
  driver: string | null;
  address: string | null;
  raw: string | null;
}

export type TransferDetailMap = Record<string, TransferDetail>;

interface Row {
  batch_id: string;
  center: string | null;
  arrival_time: string | null;
  po_no: string | null;
  ship_method: string | null;
  pallets: number | null;
  truck_ton: string | null;
  vehicle_cost: number | string | null;
  out_no: string | null;
  vehicle_no: string | null;
  driver: string | null;
  address: string | null;
  raw: string | null;
}

const MISSING = new Set(['42P01', 'PGRST205']);
const missingError = () =>
  new Error('이동 상세 칸이 없어요. supabase/migrations/0024_transfer_details.sql 을 먼저 실행해주세요');

function toError(error: { code?: string; message: string }): Error {
  if (error.code && MISSING.has(error.code)) return missingError();
  if (error.code === '42501') return new Error('권한이 없어요. 관리자에게 문의해주세요');
  return new Error(error.message);
}

/** 이동 묶음들의 상세 정보 (0024 실행 전이면 빈 값) */
export async function fetchTransferDetails(batchIds: string[]): Promise<TransferDetailMap> {
  if (batchIds.length === 0) return {};
  const { data, error } = await supabase.from('transfer_details').select('*').in('batch_id', batchIds).returns<Row[]>();
  if (error) {
    if (error.code && MISSING.has(error.code)) return {};
    throw toError(error);
  }
  return Object.fromEntries(
    data.map((r) => [
      r.batch_id,
      {
        batchId: r.batch_id,
        center: r.center,
        arrivalTime: r.arrival_time,
        poNo: r.po_no,
        shipMethod: r.ship_method,
        pallets: r.pallets,
        truckTon: r.truck_ton,
        vehicleCost: r.vehicle_cost === null ? null : Number(r.vehicle_cost),
        outNo: r.out_no,
        vehicleNo: r.vehicle_no,
        driver: r.driver,
        address: r.address,
        raw: r.raw,
      },
    ]),
  );
}

const clean = (value: string | null | undefined) => value?.trim() || null;

export async function saveTransferDetail(detail: TransferDetail): Promise<void> {
  const { error } = await supabase.from('transfer_details').upsert(
    {
      batch_id: detail.batchId,
      center: clean(detail.center),
      arrival_time: clean(detail.arrivalTime),
      po_no: clean(detail.poNo),
      ship_method: clean(detail.shipMethod),
      pallets: detail.pallets,
      truck_ton: clean(detail.truckTon),
      vehicle_cost: detail.vehicleCost,
      out_no: clean(detail.outNo),
      vehicle_no: clean(detail.vehicleNo),
      driver: clean(detail.driver),
      address: clean(detail.address),
      raw: clean(detail.raw),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'batch_id' },
  );
  if (error) throw toError(error);
}
