import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as inventory from './inventory';
import * as returns from './returns';
import * as sales from './sales';
import * as settlements from './settlements';
import * as storage from './storage';
import type { MovementFilter, MovementType, SettlementKind } from './types';

export const queryKeys = {
  warehouses: ['warehouses'] as const,
  products: ['products'] as const,
  partners: ['partners'] as const,
  stock: (date?: string) => ['stock', date ?? 'current'] as const,
  movements: (filter: MovementFilter) => ['movements', filter] as const,
  returns: ['returns'] as const,
  sales: (from: string, to: string) => ['sales', from, to] as const,
  salesTargets: ['salesTargets'] as const,
  storageFees: (from: string, to: string) => ['storageFees', from, to] as const,
  storageDays: (from: string, to: string) => ['storageFees', 'days', from, to] as const,
  storageItems: (date: string) => ['storageFees', 'items', date] as const,
};

export function useWarehouses() {
  return useQuery({
    queryKey: queryKeys.warehouses,
    queryFn: inventory.fetchWarehouses,
    staleTime: Infinity,
  });
}

export function useProducts() {
  return useQuery({ queryKey: queryKeys.products, queryFn: inventory.fetchProducts });
}

export function usePartners() {
  return useQuery({ queryKey: queryKeys.partners, queryFn: inventory.fetchPartners });
}

export function useStock(date?: string) {
  return useQuery({
    queryKey: queryKeys.stock(date),
    queryFn: () => inventory.fetchStock(date),
  });
}

export function useMovements(filter: MovementFilter) {
  return useQuery({
    queryKey: queryKeys.movements(filter),
    queryFn: () => inventory.fetchMovements(filter),
  });
}

/** 아직 반영 전인 예정 입출고 */
export function usePendingMovements(type?: MovementType) {
  return useQuery({
    queryKey: ['movements', 'pending', type ?? 'all'] as const,
    queryFn: () => inventory.fetchPendingMovements(type),
  });
}

/** 입출고 기록이 바뀌면 재고·기록 화면을 다시 불러온다 (등록·수정·삭제·예정 취소 공통) */
function useMovementMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['movements'] });
    },
  });
}

export const useCancelScheduledMovements = () => useMovementMutation(inventory.cancelScheduledMovements);
export const useUpdateMovement = () => useMovementMutation(inventory.updateMovement);
export const useDeleteMovement = () => useMovementMutation(inventory.deleteMovement);

/**
 * 가장 가까운 예정 시각이 되면 재고·입출고 화면을 다시 불러온다.
 * (DB 는 조회 시각 기준으로 계산하므로, 화면만 새로 고치면 반영된다)
 */
export function useScheduledRefresh() {
  const queryClient = useQueryClient();
  const pending = usePendingMovements();
  const next = pending.data?.[0]?.scheduledAt;
  useEffect(() => {
    if (!next) return;
    // setTimeout 최대치(약 24.8일)를 넘지 않게
    const delay = Math.min(Math.max(new Date(next).getTime() - Date.now(), 0) + 1000, 2 ** 31 - 1);
    const timer = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['movements'] });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [next, queryClient]);
}

export const useCreateMovements = () => useMovementMutation(inventory.createMovements);

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventory.createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.products }),
  });
}

export function useSetProductActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      inventory.setProductActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.products }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventory.deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.products }),
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventory.createPartner,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.partners }),
  });
}

export function useSetPartnerActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      inventory.setPartnerActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.partners }),
  });
}

/* ---------- 회수 ---------- */

export function useReturns() {
  return useQuery({ queryKey: queryKeys.returns, queryFn: returns.fetchReturns });
}

function useReturnsMutation<TVariables, TResult>(fn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.returns }),
  });
}

export const useCreateReturns = () => useReturnsMutation(returns.createReturns);
export const useUpdateReturns = () => useReturnsMutation(returns.updateReturns);
export const useDeleteReturn = () => useReturnsMutation(returns.deleteReturn);
export const useRefreshTracking = () => useReturnsMutation(returns.refreshTracking);

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventory.updateProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.products }),
  });
}

/* ---------- 매출 ---------- */

export function useDailySales(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.sales(from, to),
    queryFn: () => sales.fetchDailySales({ from, to }),
  });
}

export function useSaveDailySales() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sales.saveDailySales,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sales'] }),
  });
}

export function useSalesExtras(from: string, to: string) {
  return useQuery({
    queryKey: ['sales', 'extras', from, to],
    queryFn: () => sales.fetchSalesExtras({ from, to }),
  });
}

export function useSaveSalesExtras() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sales.saveSalesExtras,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sales'] }),
  });
}

export function useSalesBaseline() {
  return useQuery({ queryKey: ['sales', 'baseline'], queryFn: sales.fetchSalesBaseline });
}

export function useSaveSalesBaseline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sales.saveSalesBaseline,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sales'] }),
  });
}

export function useSalesActuals(from: string, to: string) {
  return useQuery({ queryKey: ['sales', 'actuals', from, to], queryFn: () => sales.fetchSalesActuals({ from, to }) });
}

export function useSaveSalesActual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sales.saveSalesActual,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sales', 'actuals'] }),
  });
}

export function useSalesTargets() {
  return useQuery({ queryKey: queryKeys.salesTargets, queryFn: sales.fetchSalesTargets });
}

export function useSaveSalesTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sales.saveSalesTarget,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.salesTargets }),
  });
}

/* ---------- 보관비 ---------- */

export function useStorageDays(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.storageDays(from, to),
    queryFn: () => storage.fetchStorageDays({ from, to }),
  });
}

export function useStorageItems(date: string) {
  return useQuery({
    queryKey: queryKeys.storageItems(date),
    queryFn: () => storage.fetchStorageItems(date),
  });
}

function useStorageMutation<TVariables, TResult>(fn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['storageFees'] }),
  });
}

export const useSaveStorageDays = () => useStorageMutation(storage.saveStorageDays);
export const useSaveStorageItems = () => useStorageMutation(storage.saveStorageItems);
export const useDeleteStorageDay = () => useStorageMutation(storage.deleteStorageDay);
export const useSaveStorageMemo = () => useStorageMutation(storage.saveStorageMemo);

/* ---------- 정산 ---------- */

export function useSettlements(kind: SettlementKind) {
  return useQuery({ queryKey: ['settlements', kind], queryFn: () => settlements.fetchSettlements(kind) });
}

export function useSaveSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settlements.saveSettlement,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['settlements'] }),
  });
}

export function useDeleteSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settlements.deleteSettlement,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['settlements'] }),
  });
}

export function useDispatches() {
  return useQuery({ queryKey: ['dispatches'], queryFn: settlements.fetchDispatches });
}

export function useSaveDispatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settlements.saveDispatch,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['dispatches'] }),
  });
}

export function useDeleteDispatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settlements.deleteDispatch,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['dispatches'] }),
  });
}
