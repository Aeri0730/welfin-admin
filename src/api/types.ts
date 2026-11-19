/**
 * 화면에서 사용하는 도메인 타입.
 * 백엔드가 Supabase → Spring 으로 바뀌어도 이 타입은 유지한다.
 */

export type Role = 'admin' | 'staff';

export interface Profile {
  id: string;
  name: string;
  role: Role;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
}

export interface Partner {
  id: number;
  name: string;
  memo: string | null;
  isActive: boolean;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  safetyStock: number;
  isActive: boolean;
}

export interface StockLevel {
  productId: number;
  warehouseId: number;
  quantity: number;
}

export type MovementType = 'inbound' | 'outbound' | 'transfer' | 'adjust';

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  inbound: '입고',
  outbound: '출고',
  transfer: '이동',
  adjust: '조정',
};

export interface Movement {
  id: number;
  batchId: string;
  type: MovementType;
  movedOn: string;
  quantity: number;
  memo: string | null;
  createdAt: string;
  product: { id: number; name: string; sku: string };
  fromWarehouse: { id: number; name: string } | null;
  toWarehouse: { id: number; name: string } | null;
  partner: { id: number; name: string } | null;
  createdBy: string;
}

export interface MovementFilter {
  from: string;
  to: string;
  type?: MovementType;
  warehouseId?: number;
}

export interface CreateMovementsInput {
  type: MovementType;
  movedOn: string;
  fromWarehouseId: number | null;
  toWarehouseId: number | null;
  partnerId: number | null;
  memo: string;
  items: Array<{ productId: number; quantity: number }>;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  safetyStock: number;
}

export interface CreatePartnerInput {
  name: string;
  memo: string;
}

/* ------------------------------------------------------------------ */
/* 반품·교환 회수                                                        */
/* ------------------------------------------------------------------ */

export type ReturnStatus = 'requested' | 'in_transit' | 'collected' | 'inspected';
export type ReturnKind = 'return' | 'exchange';
export type Carrier = 'cj' | 'lotte' | 'direct';

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: '송장 미등록',
  in_transit: '회수중',
  collected: '회수완료',
  inspected: '검수완료',
};

export const RETURN_KIND_LABEL: Record<ReturnKind, string> = {
  return: '반품',
  exchange: '교환',
};

export const CARRIER_LABEL: Record<Carrier, string> = {
  cj: 'CJ대한통운',
  lotte: '롯데택배',
  direct: '직접발송',
};

export interface TrackingEvent {
  time: string | null;
  code: string;
  label: string;
  location: string | null;
  description: string | null;
}

export interface ReturnItem {
  id: number;
  receivedOn: string;
  sourceFormat: 1 | 2;
  mgmtNo: string | null;
  orderNo: string | null;
  orderedAt: string | null;
  shippedAt: string | null;
  recipient: string;
  phone: string | null;
  address: string | null;
  productText: string;
  sku: string | null;
  quantity: number;
  kind: ReturnKind | null;
  reason: string | null;
  carrier: Carrier | null;
  invoiceNo: string | null;
  status: ReturnStatus;
  collectedAt: string | null;
  inspectedAt: string | null;
  tracking: {
    code: string | null;
    label: string | null;
    location: string | null;
    time: string | null;
    events: TrackingEvent[];
    checkedAt: string | null;
    error: string | null;
  };
  memo: string | null;
  createdAt: string;
}

/** 접수 등록 시 한 줄 */
export interface NewReturnInput {
  receivedOn: string;
  sourceFormat: 1 | 2;
  mgmtNo: string | null;
  orderNo: string | null;
  orderedAt: string | null;
  shippedAt: string | null;
  recipient: string;
  phone: string | null;
  address: string | null;
  productText: string;
  sku: string | null;
  quantity: number;
  kind: ReturnKind | null;
  reason: string | null;
}

export interface ReturnPatch {
  recipient?: string;
  phone?: string | null;
  address?: string | null;
  productText?: string;
  quantity?: number;
  kind?: ReturnKind | null;
  reason?: string | null;
  carrier?: Carrier | null;
  invoiceNo?: string | null;
  status?: ReturnStatus;
  memo?: string | null;
}
