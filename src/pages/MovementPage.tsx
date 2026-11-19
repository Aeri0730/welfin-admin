import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { NavLink } from 'react-router';
import { useCreateMovements, usePartners, useProducts, useStock, useWarehouses } from '@/api/queries';
import type { CreateMovementsInput, Warehouse } from '@/api/types';
import { Button } from '@/components/Button';
import { SelectField, TextAreaField, TextField } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Card, ErrorBox, PageHeader } from '@/components/ui';
import * as fieldStyles from '@/components/Field.css';
import { formatNumber, today } from '@/lib/format';
import * as styles from './MovementPage.css';

export type MovementFormType = 'inbound' | 'outbound' | 'transfer';

const CONFIG: Record<
  MovementFormType,
  {
    title: string;
    description: string;
    verb: string;
    needsFrom: boolean;
    needsTo: boolean;
    needsPartner: boolean;
    defaultFrom?: string;
    defaultTo?: string;
  }
> = {
  inbound: {
    title: '입고 등록',
    description: '매입처에서 들어온 제품을 창고에 등록해요',
    verb: '입고',
    needsFrom: false,
    needsTo: true,
    needsPartner: true,
  },
  outbound: {
    title: '출고 등록',
    description: '창고별로 하루 동안 나간 제품 수량을 합계로 입력해요',
    verb: '출고',
    needsFrom: true,
    needsTo: false,
    needsPartner: false,
  },
  transfer: {
    title: '창고 이동',
    description: '스타팩 → 쿠팡 입고, 쿠팡 반출 → 스타팩처럼 창고끼리 옮길 때 써요',
    verb: '이동',
    needsFrom: true,
    needsTo: true,
    needsPartner: false,
    defaultFrom: 'STARPACK',
    defaultTo: 'COUPANG',
  },
};

interface ItemDraft {
  key: number;
  productId: string;
  quantity: string;
}

function pickDefault(warehouses: Warehouse[], code?: string): string {
  const match = code ? warehouses.find((w) => w.code === code) : undefined;
  return String((match ?? warehouses[0])?.id ?? '');
}

export function MovementPage({ type }: { type: MovementFormType }) {
  const config = CONFIG[type];
  const toast = useToast();

  const warehouses = useWarehouses();
  const products = useProducts();
  const partners = usePartners();
  const currentStock = useStock();
  const createMovements = useCreateMovements();

  const keyRef = useRef(1);
  const newItem = (): ItemDraft => ({ key: keyRef.current++, productId: '', quantity: '' });

  const [movedOn, setMovedOn] = useState(today());
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [memo, setMemo] = useState('');
  const [items, setItems] = useState<ItemDraft[]>(() => [newItem()]);
  const [submitted, setSubmitted] = useState(false);

  // 창고 목록을 받으면 기본 창고를 채워둔다
  useEffect(() => {
    const list = warehouses.data;
    if (!list?.length) return;
    if (config.needsFrom) setFromId((prev) => prev || pickDefault(list, config.defaultFrom));
    if (config.needsTo) setToId((prev) => prev || pickDefault(list, config.defaultTo));
  }, [warehouses.data, config]);

  const activeProducts = useMemo(
    () => (products.data ?? []).filter((p) => p.isActive),
    [products.data],
  );
  const activePartners = (partners.data ?? []).filter((p) => p.isActive);

  /** 출발 창고의 현재 재고 (출고·이동 시 참고용) */
  const fromStock = useMemo(() => {
    const map = new Map<number, number>();
    if (!fromId) return map;
    for (const level of currentStock.data ?? []) {
      if (level.warehouseId === Number(fromId)) map.set(level.productId, level.quantity);
    }
    return map;
  }, [currentStock.data, fromId]);

  const filledItems = items.filter((item) => item.productId || item.quantity);
  const totalQuantity = filledItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const validationError = (() => {
    if (config.needsFrom && !fromId) return '출발 창고를 선택해주세요';
    if (config.needsTo && !toId) return '도착 창고를 선택해주세요';
    if (config.needsFrom && config.needsTo && fromId === toId) return '출발 창고와 도착 창고가 같아요';
    if (config.needsPartner && !partnerId) return '매입처를 선택해주세요';
    if (filledItems.length === 0) return '제품을 하나 이상 입력해주세요';
    if (filledItems.some((item) => !item.productId)) return '제품을 선택해주세요';
    if (filledItems.some((item) => !(Number(item.quantity) > 0))) return '수량을 1개 이상 입력해주세요';
    const ids = filledItems.map((item) => item.productId);
    if (new Set(ids).size !== ids.length) return '같은 제품이 두 번 들어갔어요. 한 줄로 합쳐주세요';
    return null;
  })();

  const updateItem = (key: number, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const removeItem = (key: number) => {
    setItems((prev) => (prev.length === 1 ? [newItem()] : prev.filter((item) => item.key !== key)));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (validationError) return;

    const input: CreateMovementsInput = {
      type,
      movedOn,
      fromWarehouseId: config.needsFrom ? Number(fromId) : null,
      toWarehouseId: config.needsTo ? Number(toId) : null,
      partnerId: config.needsPartner ? Number(partnerId) : null,
      memo,
      items: filledItems.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      })),
    };

    createMovements.mutate(input, {
      onSuccess: () => {
        toast(`${filledItems.length}종 ${formatNumber(totalQuantity)}개를 ${config.verb}했어요`);
        setItems([newItem()]);
        setMemo('');
        setSubmitted(false);
      },
    });
  };

  const warehouseOptions = (warehouses.data ?? []).map((w) => (
    <option key={w.id} value={w.id}>
      {w.name}
    </option>
  ));

  return (
    <div>
      {type !== 'transfer' && (
        <nav className={styles.segment} aria-label="입고/출고 전환">
          <NavLink to="/inbound" className={styles.segmentItem}>
            입고
          </NavLink>
          <NavLink to="/outbound" className={styles.segmentItem}>
            출고
          </NavLink>
        </nav>
      )}
      <PageHeader title={config.title} description={config.description} />

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Card title="기본 정보">
          <div className={styles.fields}>
            <TextField
              label={type === 'outbound' ? '출고일' : '날짜'}
              type="date"
              value={movedOn}
              max={today()}
              onChange={(e) => e.target.value && setMovedOn(e.target.value)}
            />
            {config.needsPartner && (
              <SelectField label="매입처" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                <option value="">선택해주세요</option>
                {activePartners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
            )}
            {config.needsFrom && (
              <SelectField
                label={type === 'outbound' ? '출고 창고' : '보내는 창고'}
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
              >
                <option value="">선택해주세요</option>
                {warehouseOptions}
              </SelectField>
            )}
            {config.needsTo && (
              <SelectField
                label={type === 'inbound' ? '입고 창고' : '받는 창고'}
                value={toId}
                onChange={(e) => setToId(e.target.value)}
              >
                <option value="">선택해주세요</option>
                {warehouseOptions}
              </SelectField>
            )}
          </div>
          {products.data && activeProducts.length === 0 && (
            <p className={fieldStyles.message} style={{ marginTop: 12 }}>
              등록된 제품이 없어요. 기준 정보에서 제품을 먼저 등록해야 {config.verb}할 수 있어요.
            </p>
          )}
          {config.needsPartner && partners.data && activePartners.length === 0 && (
            <p className={fieldStyles.message} style={{ marginTop: 12 }}>
              등록된 매입처가 없어요. 기준 정보에서 먼저 추가해주세요.
            </p>
          )}
        </Card>

        <Card title="제품">
          <div className={styles.itemsHeader} aria-hidden>
            <span>제품</span>
            <span>수량</span>
            <span />
          </div>

          {items.map((item) => {
            const stock = item.productId && fromId ? (fromStock.get(Number(item.productId)) ?? 0) : null;
            const exceeds = stock !== null && Number(item.quantity) > stock;
            return (
              <div key={item.key} className={styles.itemRow}>
                <SelectField
                  aria-label="제품"
                  value={item.productId}
                  onChange={(e) => updateItem(item.key, { productId: e.target.value })}
                  hint={stock !== null ? `현재 재고 ${formatNumber(stock)}개` : undefined}
                  error={exceeds ? `재고(${formatNumber(stock)}개)보다 많아요` : null}
                >
                  <option value="">제품 선택</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </SelectField>
                <TextField
                  aria-label="수량"
                  inputMode="numeric"
                  placeholder="0"
                  className={styles.quantityInput}
                  value={item.quantity}
                  onChange={(e) => updateItem(item.key, { quantity: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                />
                <Button
                  variant="ghost"
                  className={styles.removeButton}
                  onClick={() => removeItem(item.key)}
                  aria-label="이 줄 삭제"
                >
                  <Icon name="close" size={18} />
                </Button>
              </div>
            );
          })}

          <Button
            variant="secondary"
            fullWidth
            className={styles.addRow}
            onClick={() => setItems((prev) => [...prev, newItem()])}
          >
            <Icon name="plus" size={18} />
            제품 추가
          </Button>
        </Card>

        <Card>
          <TextAreaField
            label="메모 (선택)"
            placeholder={type === 'inbound' ? '예: 발주번호, 인보이스 번호' : '예: 쿠팡 반출 요청 건'}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={500}
          />
        </Card>

        {submitted && validationError && <ErrorBox error={new Error(validationError)} />}
        {createMovements.error && <ErrorBox error={createMovements.error} />}

        <div className={styles.submitBar}>
          <p className={styles.summary}>
            <span className={styles.summaryStrong}>{filledItems.length}종</span> ·{' '}
            <span className={styles.summaryStrong}>{formatNumber(totalQuantity)}개</span>
          </p>
          <Button
            type="submit"
            size="lg"
            className={styles.submitButton}
            loading={createMovements.isPending}
            disabled={filledItems.length === 0}
          >
            {config.verb} 등록
          </Button>
        </div>
      </form>
    </div>
  );
}
