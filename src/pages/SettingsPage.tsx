import { useState, type FormEvent } from 'react';
import {
  useCreatePartner,
  useCreateProduct,
  useCreateSalesChannel,
  useDeleteProduct,
  usePartners,
  useProducts,
  useSalesChannels,
  useSetPartnerActive,
  useSetProductActive,
  useSetSalesChannelActive,
} from '@/api/queries';
import { PRODUCT_CATEGORY_LABEL, type Product, type ProductCategory } from '@/api/types';
import { ProductEditDialog } from '@/features/inventory/ProductEditDialog';
import { DEFAULT_SAFETY_STOCK } from '@/features/inventory/useStockMatrix';
import { Button } from '@/components/Button';
import { SelectField, TextField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { Badge, Card, EmptyState, ErrorBox, PageHeader } from '@/components/ui';
import { useProfile } from '@/features/auth/session';
import { formatNumber } from '@/lib/format';
import * as s from './pages.css';
import * as styles from './SettingsPage.css';

export function SettingsPage() {
  const { data: profile } = useProfile();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className={s.stack}>
      <PageHeader
        title="기준 정보"
        description={isAdmin ? '제품과 매입처·판매처를 관리해요' : '기준 정보는 관리자만 수정할 수 있어요'}
      />
      <div className={s.twoColumn}>
        <ProductSection isAdmin={isAdmin} />
        <div className={s.stack}>
          <PartnerSection isAdmin={isAdmin} />
          <SalesChannelSection isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
}

function ProductSection({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const products = useProducts();
  const createProduct = useCreateProduct();
  const setActive = useSetProductActive();
  const deleteProduct = useDeleteProduct();

  const handleDelete = (id: number, productName: string) => {
    if (!window.confirm(`${productName}을(를) 삭제할까요?
삭제하면 되돌릴 수 없어요.`)) return;
    deleteProduct.mutate(id, {
      onSuccess: () => toast(`${productName}을(를) 삭제했어요`),
    });
  };

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [safetyStock, setSafetyStock] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [category, setCategory] = useState<ProductCategory>('etc');
  const [editing, setEditing] = useState<Product | null>(null);

  const canSubmit = sku.trim() && name.trim();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    createProduct.mutate(
      {
        sku: sku.trim(),
        name: name.trim(),
        safetyStock: Number(safetyStock) || DEFAULT_SAFETY_STOCK,
        unitCost: Number(unitCost) || 0,
        category,
      },
      {
        onSuccess: () => {
          toast(`${name.trim()}을(를) 추가했어요`);
          setSku('');
          setName('');
          setSafetyStock('');
          setUnitCost('');
        },
      },
    );
  };

  return (
    <Card title={`제품 ${products.data ? products.data.length : ''}`}>
      {isAdmin && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <TextField label="제품명" placeholder="예: 미니 선풍기 화이트" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="SKU (품번)" placeholder="예: WF-FAN-01" value={sku} onChange={(e) => setSku(e.target.value)} />
            <TextField
              label="안전재고"
              inputMode="numeric"
              placeholder="15"
              hint="합계 재고가 이 개수 이하이면 '미달'로 알려드려요"
              value={safetyStock ? formatNumber(Number(safetyStock)) : ''}
              onChange={(e) => setSafetyStock(e.target.value.replace(/\D/g, '').slice(0, 7))}
            />
            <TextField
              label="입고단가(원)"
              inputMode="numeric"
              placeholder="0"
              hint="재고금액 = 수량 × 입고단가"
              value={unitCost ? formatNumber(Number(unitCost)) : ''}
              onChange={(e) => setUnitCost(e.target.value.replace(/\D/g, '').slice(0, 9))}
            />
            <SelectField label="사용 계절" value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
              {(Object.keys(PRODUCT_CATEGORY_LABEL) as ProductCategory[]).map((key) => (
                <option key={key} value={key}>
                  {PRODUCT_CATEGORY_LABEL[key]}
                </option>
              ))}
            </SelectField>
          </div>
          {createProduct.error && <ErrorBox error={createProduct.error} />}
          <Button type="submit" variant="secondary" fullWidth disabled={!canSubmit} loading={createProduct.isPending}>
            제품 추가
          </Button>
        </form>
      )}

      {products.error && <ErrorBox error={products.error} />}
      {deleteProduct.error && <ErrorBox error={deleteProduct.error} />}
      {products.data?.length === 0 ? (
        <EmptyState title="등록된 제품이 없어요" description="제품을 등록해야 입출고할 수 있어요" />
      ) : (
        <ul>
          {(products.data ?? []).map((p) => (
            <li key={p.id} className={s.listItem}>
              <div className={s.listMain}>
                <p className={s.listTitle}>
                  {p.name}
                  {!p.isActive && <Badge>미사용</Badge>}
                </p>
                <p className={s.listMeta}>
                  {p.sku} · {PRODUCT_CATEGORY_LABEL[p.category]} · 단가 {p.unitCost ? `${formatNumber(p.unitCost)}원` : '-'} · 안전재고{' '}
                  {formatNumber(p.safetyStock)}개{p.reportOrder !== null && ` · 매출 탭 ${p.reportOrder}번`}
                </p>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Button variant="weak" size="sm" onClick={() => setEditing(p)}>
                    수정
                  </Button>
                  <Button
                    variant="weak"
                    size="sm"
                    onClick={() => setActive.mutate({ id: p.id, isActive: !p.isActive })}
                    disabled={setActive.isPending}
                  >
                    {p.isActive ? '사용 중지' : '다시 사용'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(p.id, p.name)}
                    disabled={deleteProduct.isPending}
                  >
                    삭제
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && <ProductEditDialog key={editing.id} product={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function PartnerSection({ isAdmin }: { isAdmin: boolean }) {
  return (
    <CounterpartSection
      isAdmin={isAdmin}
      label="매입처"
      placeholder="예: OO전자"
      list={usePartners()}
      create={useCreatePartner()}
      setActive={useSetPartnerActive()}
    />
  );
}

function SalesChannelSection({ isAdmin }: { isAdmin: boolean }) {
  return (
    <CounterpartSection
      isAdmin={isAdmin}
      label="판매처"
      placeholder="예: 쿠팡, 스마트스토어"
      emptyDescription="여기서 등록한 판매처를 출고할 때 고를 수 있어요"
      list={useSalesChannels()}
      create={useCreateSalesChannel()}
      setActive={useSetSalesChannelActive()}
    />
  );
}

/** 이름·메모만 있는 거래 상대 목록 (매입처, 판매처) */
function CounterpartSection({
  isAdmin,
  label,
  placeholder,
  emptyDescription,
  list,
  create,
  setActive,
}: {
  isAdmin: boolean;
  label: string;
  placeholder: string;
  emptyDescription?: string;
  list: { data?: Array<{ id: number; name: string; memo: string | null; isActive: boolean }>; error: Error | null };
  create: {
    mutate: (input: { name: string; memo: string }, options: { onSuccess: () => void }) => void;
    error: Error | null;
    isPending: boolean;
  };
  setActive: { mutate: (input: { id: number; isActive: boolean }) => void; isPending: boolean };
}) {
  const toast = useToast();
  const partners = list;
  const createPartner = create;

  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    createPartner.mutate(
      { name: name.trim(), memo: memo.trim() },
      {
        onSuccess: () => {
          toast(`${name.trim()}을(를) 추가했어요`);
          setName('');
          setMemo('');
        },
      },
    );
  };

  return (
    <Card title={`${label} ${partners.data ? partners.data.length : ''}`}>
      {isAdmin && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <TextField label={`${label}명`} placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="메모 (선택)" placeholder="담당자, 연락처 등" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
          {createPartner.error && <ErrorBox error={createPartner.error} />}
          <Button type="submit" variant="secondary" fullWidth disabled={!name.trim()} loading={createPartner.isPending}>
            {label} 추가
          </Button>
        </form>
      )}

      {partners.error && <ErrorBox error={partners.error} />}
      {partners.data?.length === 0 ? (
        <EmptyState title={`등록된 ${label}가 없어요`} description={emptyDescription} />
      ) : (
        <ul>
          {(partners.data ?? []).map((p) => (
            <li key={p.id} className={s.listItem}>
              <div className={s.listMain}>
                <p className={s.listTitle}>
                  {p.name}
                  {!p.isActive && <Badge>미사용</Badge>}
                </p>
                {p.memo && <p className={s.listMeta}>{p.memo}</p>}
              </div>
              {isAdmin && (
                <Button
                  variant="weak"
                  size="sm"
                  onClick={() => setActive.mutate({ id: p.id, isActive: !p.isActive })}
                  disabled={setActive.isPending}
                >
                  {p.isActive ? '사용 중지' : '다시 사용'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
