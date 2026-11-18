import { useState, type FormEvent } from 'react';
import {
  useCreatePartner,
  useCreateProduct,
  useDeleteProduct,
  usePartners,
  useProducts,
  useSetPartnerActive,
  useSetProductActive,
} from '@/api/queries';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Field';
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
        description={isAdmin ? '제품과 매입처를 관리해요' : '기준 정보는 관리자만 수정할 수 있어요'}
      />
      <div className={s.twoColumn}>
        <ProductSection isAdmin={isAdmin} />
        <PartnerSection isAdmin={isAdmin} />
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

  const canSubmit = sku.trim() && name.trim();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    createProduct.mutate(
      { sku: sku.trim(), name: name.trim(), safetyStock: Number(safetyStock) || 0 },
      {
        onSuccess: () => {
          toast(`${name.trim()}을(를) 추가했어요`);
          setSku('');
          setName('');
          setSafetyStock('');
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
              placeholder="0"
              hint="합계 재고가 이보다 적으면 알려드려요"
              value={safetyStock}
              onChange={(e) => setSafetyStock(e.target.value.replace(/\D/g, '').slice(0, 7))}
            />
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
                  {p.sku} · 안전재고 {formatNumber(p.safetyStock)}개
                </p>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
    </Card>
  );
}

function PartnerSection({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const partners = usePartners();
  const createPartner = useCreatePartner();
  const setActive = useSetPartnerActive();

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
    <Card title={`매입처 ${partners.data ? partners.data.length : ''}`}>
      {isAdmin && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <TextField label="매입처명" placeholder="예: OO전자" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="메모 (선택)" placeholder="담당자, 연락처 등" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
          {createPartner.error && <ErrorBox error={createPartner.error} />}
          <Button type="submit" variant="secondary" fullWidth disabled={!name.trim()} loading={createPartner.isPending}>
            매입처 추가
          </Button>
        </form>
      )}

      {partners.error && <ErrorBox error={partners.error} />}
      {partners.data?.length === 0 ? (
        <EmptyState title="등록된 매입처가 없어요" />
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
