import { supabase } from '@/lib/supabase';
import { readAllPages } from './paging';
import type {
  CreateMovementsInput,
  CreatePartnerInput,
  CreateProductInput,
  Movement,
  MovementFilter,
  MovementType,
  Partner,
  Product,
  ProductCategory,
  ProductPatch,
  SalesChannel,
  StockLevel,
  Warehouse,
} from './types';

/** Supabase/Postgres 에러를 사용자에게 보여줄 문장으로 바꾼다. */
function toError(error: { message: string; code?: string }): Error {
  if (error.code === '23505') return new Error('이미 등록된 값이에요');
  if (error.code === '42501') return new Error('권한이 없어요. 관리자에게 문의해주세요');
  if (error.code === '23514' && error.message.includes('category')) {
    return new Error("'4계절'을 저장하려면 supabase/migrations/0007_product_season.sql 을 먼저 실행해주세요");
  }
  if (error.code === '42703' || error.code === 'PGRST204') {
    return new Error('보관 기준 칸이 없어요. supabase/migrations/0006_storage.sql 을 먼저 실행해주세요');
  }
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

/** 창고 추가. 코드는 따로 쓰는 곳이 없어 이름으로 자동으로 만든다 */
export async function createWarehouse(name: string): Promise<void> {
  const { data: last, error: orderError } = await supabase
    .from('warehouses')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  if (orderError) throw toError(orderError);
  const { error } = await supabase.from('warehouses').insert({
    code: `WH_${Date.now().toString(36).toUpperCase()}`,
    name: name.trim(),
    sort_order: (last?.[0]?.sort_order ?? 0) + 1,
  });
  if (error) throw toError(error);
}

/**
 * 한 줄 삭제 (창고·매입처·판매처 공통).
 * 입출고 기록이 걸려 있으면 DB 가 막는다 (23503). RLS 로 막히면 에러 없이 0건.
 */
async function deleteRow(table: 'warehouses' | 'partners' | 'sales_channels', id: number, usedMessage: string): Promise<void> {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
  if (error) {
    if (error.code === '23503') throw new Error(usedMessage);
    throw toError(error);
  }
  if (!data?.length) throw new Error('권한이 없어요. 관리자에게 문의해주세요');
}

export const deleteWarehouse = (id: number) =>
  deleteRow('warehouses', id, '입출고 기록이나 재고가 있는 창고는 삭제할 수 없어요');

interface ProductRow {
  id: number;
  sku: string;
  name: string;
  safety_stock: number;
  is_active: boolean;
  unit_cost: number | null;
  category: string | null;
  report_order: number | null;
  ezadmin_code?: string | null;
  pallet_capacity?: number | null;
  rack_capacity?: number | null;
  storage_exempt?: boolean | null;
}

const PRODUCT_COLUMNS = 'id, sku, name, safety_stock, is_active, unit_cost, category, report_order';
const STORAGE_COLUMNS = 'ezadmin_code, pallet_capacity, rack_capacity, storage_exempt';

export async function fetchProducts(): Promise<Product[]> {
  const load = (columns: string) => supabase.from('products').select(columns).order('name').returns<ProductRow[]>();
  let result = await load(`${PRODUCT_COLUMNS}, ${STORAGE_COLUMNS}`);
  // 0006_storage.sql 을 아직 실행하지 않았으면 보관 기준 없이 읽는다
  if (result.error?.code === '42703') result = await load(PRODUCT_COLUMNS);
  const { data, error } = result;
  if (error) throw toError(error);
  return data.map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    safetyStock: row.safety_stock,
    isActive: row.is_active,
    unitCost: row.unit_cost ?? 0,
    category: (row.category ?? 'etc') as ProductCategory,
    reportOrder: row.report_order ?? null,
    ezadminCode: row.ezadmin_code ?? null,
    palletCapacity: row.pallet_capacity ?? null,
    rackCapacity: row.rack_capacity ?? null,
    storageExempt: Boolean(row.storage_exempt),
  }));
}

export async function createProduct(input: CreateProductInput): Promise<void> {
  const { error } = await supabase.from('products').insert({
    sku: input.sku,
    name: input.name,
    safety_stock: input.safetyStock,
    unit_cost: input.unitCost,
    category: input.category,
  });
  if (error) throw toError(error);
}

export async function updateProduct({ id, patch }: { id: number; patch: ProductPatch }): Promise<void> {
  const columns: Record<string, unknown> = {};
  if (patch.name !== undefined) columns.name = patch.name;
  if (patch.safetyStock !== undefined) columns.safety_stock = patch.safetyStock;
  if (patch.unitCost !== undefined) columns.unit_cost = patch.unitCost;
  if (patch.category !== undefined) columns.category = patch.category;
  if (patch.reportOrder !== undefined) columns.report_order = patch.reportOrder;
  if (patch.ezadminCode !== undefined) columns.ezadmin_code = patch.ezadminCode;
  if (patch.palletCapacity !== undefined) columns.pallet_capacity = patch.palletCapacity;
  if (patch.rackCapacity !== undefined) columns.rack_capacity = patch.rackCapacity;
  if (patch.storageExempt !== undefined) columns.storage_exempt = patch.storageExempt;
  const { error } = await supabase.from('products').update(columns).eq('id', id);
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

export const deletePartner = (id: number) =>
  deleteRow('partners', id, '입출고 기록이 있는 매입처는 삭제할 수 없어요. 대신 "사용 중지"를 눌러주세요');

const isMissing = (error: { code?: string }) => ['42P01', 'PGRST205', '42703', 'PGRST200'].includes(error.code ?? '');

function salesChannelError(error: { message: string; code?: string }): Error {
  if (isMissing(error)) return new Error('판매처 테이블이 없어요. supabase/migrations/0021_sales_channels.sql 을 실행해주세요');
  return toError(error);
}

/** 판매처 (0021 을 아직 실행하지 않았으면 빈 목록) */
export async function fetchSalesChannels(): Promise<SalesChannel[]> {
  const { data, error } = await supabase.from('sales_channels').select('id, name, memo, is_active').order('name');
  if (error) {
    if (isMissing(error)) return [];
    throw toError(error);
  }
  return data.map((row) => ({ id: row.id, name: row.name, memo: row.memo, isActive: row.is_active }));
}

export async function createSalesChannel(input: CreatePartnerInput): Promise<void> {
  const { error } = await supabase.from('sales_channels').insert({ name: input.name, memo: input.memo || null });
  if (error) throw salesChannelError(error);
}

export async function setSalesChannelActive(id: number, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('sales_channels').update({ is_active: isActive }).eq('id', id);
  if (error) throw salesChannelError(error);
}

export const deleteSalesChannel = (id: number) =>
  deleteRow('sales_channels', id, '출고 기록이 있는 판매처는 삭제할 수 없어요. 대신 "사용 중지"를 눌러주세요');

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
  sales_channel?: { id: number; name: string } | null;
  creator: { name: string } | null;
  scheduled_at: string | null;
}

const MOVEMENT_BASE_SELECT = `id, batch_id, type, moved_on, quantity, memo, created_at, scheduled_at,
       product:products!inner(id, name, sku),
       from_warehouse:warehouses!stock_movements_from_warehouse_id_fkey(id, name),
       to_warehouse:warehouses!stock_movements_to_warehouse_id_fkey(id, name),
       partner:partners(id, name),
       creator:profiles!stock_movements_created_by_fkey(name)`;
const MOVEMENT_SELECT = `${MOVEMENT_BASE_SELECT}, sales_channel:sales_channels(id, name)`;

/**
 * 입출고 기록 조회. 0021(판매처)을 아직 실행하지 않았으면 판매처 없이 다시 읽는다.
 * build 는 select 할 칸을 받아 조건을 붙인 쿼리를 돌려준다.
 */
type PagedQuery = {
  range: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
};

/** 조건에 맞는 입출고를 끝까지 (1000줄씩 이어서) 읽는다 */
async function selectMovements(build: (columns: string) => PagedQuery): Promise<Movement[]> {
  const loadAll = (columns: string) => readAllPages<MovementRow>((from, to) => build(columns).range(from, to));
  let result = await loadAll(MOVEMENT_SELECT);
  if (result.error && isMissing(result.error)) result = await loadAll(MOVEMENT_BASE_SELECT);
  if (result.error) throw toError(result.error);
  return result.rows.map(toMovement);
}

function toMovement(row: MovementRow): Movement {
  return {
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
    salesChannel: row.sales_channel ?? null,
    createdBy: row.creator?.name ?? '-',
    scheduledAt: row.scheduled_at,
  };
}

/** 아직 반영 전인 예정 입출고 (가까운 순) */
export async function fetchPendingMovements(type?: MovementType): Promise<Movement[]> {
  const now = new Date().toISOString();
  return selectMovements((columns) => {
    let query = supabase
      .from('stock_movements')
      .select(columns)
      .gt('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .order('id', { ascending: true });
    if (type) query = query.eq('type', type);
    return query;
  });
}

/** 예정 묶음 취소 (반영 전만 가능) */
export async function cancelScheduledMovements(batchId: string): Promise<number> {
  const { data, error } = await supabase.rpc('cancel_scheduled_movements', { p_batch_id: batchId });
  if (error) throw toError(error);
  return data as number;
}

export interface UpdateMovementInput {
  id: number;
  movedOn: string;
  quantity: number;
  memo: string;
  /** 예정 건만: 새 예정 시각 (ISO) */
  scheduledAt?: string | null;
}

/** 입출고 기록 한 줄 수정 (본인 등록 건 또는 관리자) */
export async function updateMovement(input: UpdateMovementInput): Promise<void> {
  const { error } = await supabase.rpc('update_movement', {
    p_id: input.id,
    p_moved_on: input.movedOn,
    p_quantity: input.quantity,
    p_memo: input.memo,
    p_scheduled_at: input.scheduledAt ?? null,
  });
  if (error) throw toError(error);
}

export async function deleteMovement(id: number): Promise<void> {
  const { error } = await supabase.rpc('delete_movement', { p_id: id });
  if (error) throw toError(error);
}

export async function fetchMovements(filter: MovementFilter): Promise<Movement[]> {
  return selectMovements((columns) => {
    let query = supabase
      .from('stock_movements')
      .select(columns)
      .gte('moved_on', filter.from)
      .lte('moved_on', filter.to)
      .order('moved_on', { ascending: false })
      .order('id', { ascending: false });

    if (filter.type) query = query.eq('type', filter.type);
    if (filter.warehouseId) {
      query = query.or(`from_warehouse_id.eq.${filter.warehouseId},to_warehouse_id.eq.${filter.warehouseId}`);
    }
    return query;
  });
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
    p_allow_negative: input.allowNegative ?? false,
    p_scheduled_at: input.scheduledAt ?? null,
    // 판매처를 골랐을 때만 보낸다 (0021 실행 전에도 판매처 없는 등록은 그대로 되도록)
    ...(input.salesChannelId ? { p_sales_channel_id: input.salesChannelId } : {}),
  });
  if (error) {
    if (input.salesChannelId && error.code === 'PGRST202') {
      throw new Error('판매처를 저장하려면 supabase/migrations/0021_sales_channels.sql 을 먼저 실행해주세요');
    }
    throw toError(error);
  }
  return data as string;
}
