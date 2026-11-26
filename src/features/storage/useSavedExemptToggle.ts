import { useSaveStorageItems, useUpdateProduct } from "@/api/queries";
import { toStorageItems, withExempt, type StorageRow } from "./calc";

/**
 * 저장된 날짜에서 제품의 보관비 제외를 켜고 끈다.
 * 제품 설정(앞으로 계산에 쓰임)과 그날 저장된 제품별 내역을 함께 바꾼다.
 * 업체 기준 팔레트·경량랙 수량(일일금액)은 건드리지 않는다.
 */
export function useSavedExemptToggle(
  date: string,
  price: { pallet: number; rack: number },
) {
  const updateProduct = useUpdateProduct();
  const saveItems = useSaveStorageItems();

  const toggle = async (
    rows: StorageRow[],
    target: StorageRow,
    exempt: boolean,
  ) => {
    const next = rows.map((row) =>
      row.product.id === target.product.id
        ? withExempt(row, exempt, price)
        : row,
    );
    await updateProduct.mutateAsync({
      id: target.product.id,
      patch: { storageExempt: exempt },
    });
    await saveItems.mutateAsync({ date, items: toStorageItems(date, next) });
  };

  return {
    toggle,
    isPending: updateProduct.isPending || saveItems.isPending,
    error: updateProduct.error ?? saveItems.error,
  };
}
