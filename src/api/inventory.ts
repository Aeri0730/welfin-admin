import { supabase } from '@/lib/supabase';
import type {
  CreateMovementsInput,
  CreatePartnerInput,
  CreateProductInput,
  Movement,
  MovementFilter,
  MovementType,
  Partner,
  Product,
  StockLevel,
  Warehouse,
} from './types';

/** Supabase/Postgres 에러를 사용자에게 보여줄 문장으로 바꾼다. */
function toError(error: { message: string; code?: string }): Error {
  if (error.code === '23505') return new Error('이미 등록된 값이에요');
  if (error.code === '42501') return new Error('권한이 없어요. 관리자에게 문의해주세요');
  return new Error(error.message);
}

export async function fetchWarehouses(): Promise<Warehouse[]> {
  const { data, error } = await supabase
    .from('warehouses')
    .select('id, code, name')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw toError(error);
  return data;
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, sku, name, safety_stock, is_active')
    .order('name');
  if (error) throw toError(error);
  return data.map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    safetyStock: row.safety_stock,
    isActive: row.is_active,
  }));
}

export async function createProduct(input: CreateProductInput): Promise<void> {
  const { error } = await supabase.from('products').insert({
    sku: input.sku,
    name: input.name,
    safety_stock: input.safetyStock,
  });
  if (error) throw toError(error);
}

export async function setProductActive(id: number, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('products').update({ is_active: isActive }).eq('id', id);
  if (error) throw toError(error);
}

/** 입출고 기록이 없는 제품만 삭제된다. 기록이 있으면 FK(23503)로 막힌다. */
export async function deleteProduct(id: number): Promise<void> {
  const { data, error } = await supabase.from('products').delete().eq('id', id).select('id');
  if (error) {
    if (error.code === '23503') {
      throw new Error('입출고 기록이 있는 제품은 삭제할 수 없어요. 대신 "사용 중지"를 눌러주세요');
    }
    throw toError(error);
  }
  // RLS 로 막히면 에러 없이 0건 삭제된다
  if (!data?.length) throw new Error('권한이 없어요. 관리자에게 문의해주세요');
}

export async function fetchPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('id, name, memo, is_active')
    .order('name');
  if (error) throw toError(error);
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    memo: row.memo,
    isActive: row.is_active,
  }));
}

export async function createPartner(input: CreatePartnerInput): Promise<void> {
  const { error } = await supabase
    .from('partners')
    .insert({ name: input.name, memo: input.memo || null });
  if (error) throw toError(error);
}

export async function setPartnerActive(id: number, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('partners').update({ is_active: isActive }).eq('id', id);
  if (error) throw toError(error);
}

/** 기준일까지의 창고별·제품별 재고. date 가 없으면 전체 기록 기준(현재 재고). */
export async function fetchStock(date?: string): Promise<StockLevel[]> {
  const { data, error } = await supabase.rpc('stock_as_of', { p_date: date ?? null });
  if (error) throw toError(error);
  return (data as Array<{ product_id: number; warehouse_id: number; quantity: number }>).map(
    (row) => ({
      productId: row.product_id,
      warehouseId: row.warehouse_id,
      quantity: row.quantity,
    }),
  );
}

interface MovementRow {
  id: number;
  batch_id: string;
  type: MovementType;
  moved_on: string;
  quantity: number;
  memo: string | null;
  created_at: string;
  product: { id: number; name: string; sku: string };
  from_warehouse: { id: number; name: string } | null;
  to_warehouse: { id: number; name: string } | null;
  partner: { id: number; name: string } | null;
  creator: { name: string } | null;
}

export async function fetchMovements(filter: MovementFilter): Promise<Movement[]> {
  let query = supabase
    .from('stock_movements')
    .select(
      `id, batch_id, type, moved_on, quantity, memo, created_at,
       product:products!inner(id, name, sku),
       from_warehouse:warehouses!stock_movements_from_warehouse_id_fkey(id, name),
       to_warehouse:warehouses!stock_movements_to_warehouse_id_fkey(id, name),
       partner:partners(id, name),
       creator:profiles!stock_movements_created_by_fkey(name)`,
    )
    .gte('moved_on', filter.from)
    .lte('moved_on', filter.to)
    .order('moved_on', { ascending: false })
    .order('id', { ascending: false })
    .limit(1000);

  if (filter.type) query = query.eq('type', filter.type);
  if (filter.warehouseId) {
    query = query.or(
      `from_warehouse_id.eq.${filter.warehouseId},to_warehouse_id.eq.${filter.warehouseId}`,
    );
  }

  const { data, error } = await query;
  if (error) throw toError(error);

  return (data as unknown as MovementRow[]).map((row) => ({
    id: row.id,
    batchId: row.batch_id,
    type: row.type,
    movedOn: row.moved_on,
    quantity: row.quantity,
    memo: row.memo,
    createdAt: row.created_at,
    product: row.product,
    fromWarehouse: row.from_warehouse,
    toWarehouse: row.to_warehouse,
    partner: row.partner,
    createdBy: row.creator?.name ?? '-',
  }));
}

export async function createMovements(input: CreateMovementsInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_movements', {
    p_type: input.type,
    p_moved_on: input.movedOn,
    p_from_warehouse_id: input.fromWarehouseId,
    p_to_warehouse_id: input.toWarehouseId,
    p_partner_id: input.partnerId,
    p_memo: input.memo,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
  });
  if (error) throw toError(error);
  return data as string;
}
