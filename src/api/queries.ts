import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as inventory from './inventory';
import * as returns from './returns';
import type { MovementFilter } from './types';

export const queryKeys = {
  warehouses: ['warehouses'] as const,
  products: ['products'] as const,
  partners: ['partners'] as const,
  stock: (date?: string) => ['stock', date ?? 'current'] as const,
  movements: (filter: MovementFilter) => ['movements', filter] as const,
  returns: ['returns'] as const,
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

export function useCreateMovements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventory.createMovements,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['movements'] });
    },
  });
}

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
