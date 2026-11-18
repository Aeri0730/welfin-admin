import { useMemo } from 'react';
import { useProducts, useStock, useWarehouses } from '@/api/queries';
import type { Product, Warehouse } from '@/api/types';

export interface StockMatrixRow {
  product: Product;
  byWarehouse: Record<number, number>;
  total: number;
  isLow: boolean;
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
          isLow: product.safetyStock > 0 && total < product.safetyStock,
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
