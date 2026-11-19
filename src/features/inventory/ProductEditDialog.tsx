import { useState } from 'react';
import { formatNumber } from '@/lib/format';
import { useUpdateProduct } from '@/api/queries';
import { PRODUCT_CATEGORY_LABEL, type Product, type ProductCategory } from '@/api/types';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { SelectField, TextField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { ErrorBox } from '@/components/ui';
import { DEFAULT_SAFETY_STOCK } from './useStockMatrix';
import * as p from '@/pages/pages.css';

const digitsOnly = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max);

export function ProductEditDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const toast = useToast();
  const update = useUpdateProduct();
  const [name, setName] = useState(product.name);
  const [unitCost, setUnitCost] = useState(String(product.unitCost || ''));
  const [safetyStock, setSafetyStock] = useState(String(product.safetyStock || ''));
  const [category, setCategory] = useState<ProductCategory>(product.category);
  const [reportOrder, setReportOrder] = useState(product.reportOrder === null ? '' : String(product.reportOrder));

  const handleSave = () => {
    update.mutate(
      {
        id: product.id,
        patch: {
          name: name.trim() || product.name,
          unitCost: Number(unitCost) || 0,
          safetyStock: Number(safetyStock) || DEFAULT_SAFETY_STOCK,
          category,
          reportOrder: reportOrder ? Number(reportOrder) : null,
        },
      },
      {
        onSuccess: () => {
          toast('저장했어요');
          onClose();
        },
      },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${product.sku} 수정`}
      footer={
        <>
          <Button variant="weak" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={handleSave} loading={update.isPending}>
            저장
          </Button>
        </>
      }
    >
      <div className={p.stack} style={{ gap: 12, marginTop: 16 }}>
        <TextField label="제품명" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="입고단가(원)"
          inputMode="numeric"
          placeholder="0"
          value={unitCost ? formatNumber(Number(unitCost)) : ''}
          onChange={(e) => setUnitCost(digitsOnly(e.target.value, 9))}
        />
        <TextField
          label="안전재고"
          inputMode="numeric"
          placeholder="15"
          hint="합계 재고가 이 개수 이하이면 '미달'"
          value={safetyStock ? formatNumber(Number(safetyStock)) : ''}
          onChange={(e) => setSafetyStock(digitsOnly(e.target.value, 7))}
        />
        <SelectField label="구분" value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
          {(Object.keys(PRODUCT_CATEGORY_LABEL) as ProductCategory[]).map((key) => (
            <option key={key} value={key}>
              {PRODUCT_CATEGORY_LABEL[key]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="매출 탭 표시 순서"
          inputMode="numeric"
          placeholder="비우면 안 보여요"
          hint="매출 탭 '주요 제품 재고'에 이 순서로 보여요"
          value={reportOrder}
          onChange={(e) => setReportOrder(digitsOnly(e.target.value, 3))}
        />
        {update.error && <ErrorBox error={update.error} />}
      </div>
    </Dialog>
  );
}
