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
