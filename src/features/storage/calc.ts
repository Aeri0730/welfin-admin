import type { Product, StorageItem, Warehouse } from "@/api/types";
import type { StockMatrixRow } from "@/features/inventory/useStockMatrix";

/** 보관비를 계산하는 창고 (3PL) */
export const STORAGE_WAREHOUSE_CODE = "STARPACK";

export const findStorageWarehouse = (warehouses: Warehouse[]) =>
  warehouses.find((w) => w.code === STORAGE_WAREHOUSE_CODE);

const slots = (stock: number, capacity: number | null) =>
  stock > 0 && capacity ? Math.ceil(stock / capacity) : 0;

export interface StorageRow {
  product: Product;
  stock: number;
  palletCapacity: number | null;
  rackCapacity: number | null;
  pallets: number;
  racks: number;
  amount: number;
  exempt: boolean;
}

/**
 * 제품별 보관비 계산 (스타팩 재고 기준).
 * 팔레트 수 = 올림(재고 ÷ 팔레트 적재수), 경량랙 수 = 올림(재고 ÷ 경량랙 적재수).
 */
export function computeStorageRows(
  matrix: StockMatrixRow[],
  warehouse: Warehouse,
  price: { pallet: number; rack: number },
): StorageRow[] {
  return matrix.map(({ product, byWarehouse }) => {
    const stock = byWarehouse[warehouse.id] ?? 0;
    const exempt = product.storageExempt;
    const pallets = exempt ? 0 : slots(stock, product.palletCapacity);
    const racks = exempt ? 0 : slots(stock, product.rackCapacity);
    return {
      product,
      stock,
      palletCapacity: product.palletCapacity,
      rackCapacity: product.rackCapacity,
      pallets,
      racks,
      amount: pallets * price.pallet + racks * price.rack,
      exempt,
    };
  });
}

/** 저장할 세부 내역 (재고가 있는 제품만) */
export const toStorageItems = (
  date: string,
  rows: StorageRow[],
): StorageItem[] =>
  rows
    .filter((row) => row.stock > 0)
    .map((row) => ({
      storedOn: date,
      productId: row.product.id,
      stock: row.stock,
      palletCapacity: row.palletCapacity,
      rackCapacity: row.rackCapacity,
      pallets: row.pallets,
      racks: row.racks,
      amount: row.amount,
      exempt: row.exempt,
    }));
