import { useMemo } from 'react';
import { useProducts, useStock, useWarehouses } from '@/api/queries';
import type { Product, Warehouse } from '@/api/types';

/** 안전재고를 따로 정하지 않은 제품의 기준. 합계 재고가 이 개수 이하이면 '미달' */
export const DEFAULT_SAFETY_STOCK = 15;

export const safetyStockOf = (product: Product) => product.safetyStock || DEFAULT_SAFETY_STOCK;

export interface StockMatrixRow {
  product: Product;
  byWarehouse: Record<number, number>;
  total: number;
  /** 재고금액 = 합계 수량 × 입고단가 */
  value: number;
  isLow: boolean;
}

/** 창고별(또는 전체) 재고 수량·금액 합계 */
export function sumStock(rows: StockMatrixRow[], warehouseId?: number) {
  let quantity = 0;
  let value = 0;
  for (const row of rows) {
    const qty = warehouseId === undefined ? row.total : (row.byWarehouse[warehouseId] ?? 0);
    quantity += qty;
    value += qty * row.product.unitCost;
  }
  return { quantity, value };
}

/** 제품 × 창고 재고표. date 가 없으면 현재 재고. */
export function useStockMatrix(date?: string) {
  const warehouses = useWarehouses();
  const products = useProducts();
  const stock = useStock(date);

  const rows = useMemo<StockMatrixRow[]>(() => {
    if (!products.data || !stock.data) return [];

    const quantities = new Map<number, Record<number, number>>();
    for (const level of stock.data) {
      const byWarehouse = quantities.get(level.productId) ?? {};
      byWarehouse[level.warehouseId] = level.quantity;
      quantities.set(level.productId, byWarehouse);
    }

    return products.data
      .map((product) => {
        const byWarehouse = quantities.get(product.id) ?? {};
        const total = Object.values(byWarehouse).reduce((sum, qty) => sum + qty, 0);
        return {
          product,
          byWarehouse,
          total,
          value: total * product.unitCost,
          isLow: product.isActive && total <= safetyStockOf(product),
        };
      })
      .filter((row) => row.product.isActive || row.total !== 0);
  }, [products.data, stock.data]);

  return {
    rows,
    warehouses: warehouses.data ?? ([] as Warehouse[]),
    isLoading: warehouses.isLoading || products.isLoading || stock.isLoading,
    error: warehouses.error ?? products.error ?? stock.error,
  };
}
