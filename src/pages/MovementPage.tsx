import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { NavLink } from 'react-router';
import {
  useCreateMovements,
  usePartners,
  useProducts,
  useSalesChannels,
  useStock,
  useWarehouses,
} from '@/api/queries';
import type { CreateMovementsInput, Warehouse } from '@/api/types';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { SearchSelectField, SelectField, TextAreaField, TextField } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Card, ErrorBox, PageHeader } from '@/components/ui';
import * as fieldStyles from '@/components/Field.css';
import { formatSchedule } from '@/features/inventory/movement';
import { TransferPasteDialog } from '@/features/inventory/TransferPasteDialog';
import { addDays, formatNumber, today } from '@/lib/format';
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

/** 입고·출고·창고 이동 안의 '입력 | 현황(내역)' 탭 */
export function MovementSubTabs({ type }: { type: MovementFormType }) {
  const verb = CONFIG[type].verb;
  const listLabel = type === 'transfer' ? '내역' : '현황';
  return (
    <nav className={styles.subTabs} aria-label={`${verb} 메뉴`}>
      <NavLink to={`/${type}`} end className={styles.subTab}>
        {verb} 입력
      </NavLink>
      <NavLink to={`/${type}/status`} className={styles.subTab}>
        {verb} {listLabel}
      </NavLink>
    </nav>
  );
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
  const salesChannels = useSalesChannels();
  const currentStock = useStock();
  const createMovements = useCreateMovements();

  const keyRef = useRef(1);
  const newItem = (): ItemDraft => ({ key: keyRef.current++, productId: '', quantity: '' });

  const [movedOn, setMovedOn] = useState(today());
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [salesChannelId, setSalesChannelId] = useState('');
  const [memo, setMemo] = useState('');
  const [items, setItems] = useState<ItemDraft[]>(() => [newItem()]);
  const [submitted, setSubmitted] = useState(false);
  /** 쿠팡 입고 안내 붙여넣기 모달 (창고 이동만) */
  const [pasting, setPasting] = useState(false);
  /** 예정으로 등록: 정한 시각 이후에 재고에 반영 */
  const [scheduled, setScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => `${addDays(today(), 1)}T09:00`);
  /** 재고 부족 확인 모달: 부족한 제품 목록 (서버에서만 알게 된 경우 message) */
  const [shortage, setShortage] = useState<{
    lines: Array<{ name: string; stock: number; quantity: number }>;
    message?: string;
  } | null>(null);

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
  const productOptions = useMemo(
    () => activeProducts.map((p) => ({ value: String(p.id), label: p.name, hint: p.sku })),
    [activeProducts],
  );
  const activePartners = (partners.data ?? []).filter((p) => p.isActive);
  const activeSalesChannels = (salesChannels.data ?? []).filter((c) => c.isActive);

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
    if (scheduled && !(new Date(scheduledAt).getTime() > Date.now())) return '예정 시각은 지금보다 뒤여야 해요';
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

  /** 출발 창고 재고보다 많이 빠지는 줄 */
  const shortLines = config.needsFrom
    ? filledItems.flatMap((item) => {
        const stock = fromStock.get(Number(item.productId)) ?? 0;
        const quantity = Number(item.quantity);
        if (!(quantity > stock)) return [];
        const product = activeProducts.find((p) => p.id === Number(item.productId));
        return [{ name: product?.name ?? '제품', stock, quantity }];
      })
    : [];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (validationError) return;
    // 예정 건은 반영 시점의 재고를 알 수 없어서 확인 없이 저장
    if (!scheduled && shortLines.length > 0) {
      setShortage({ lines: shortLines });
      return;
    }
    save(false);
  };

  const save = (allowNegative: boolean) => {
    const input: CreateMovementsInput = {
      type,
      movedOn: scheduled ? scheduledAt.slice(0, 10) : movedOn,
      scheduledAt: scheduled ? new Date(scheduledAt).toISOString() : null,
      fromWarehouseId: config.needsFrom ? Number(fromId) : null,
      toWarehouseId: config.needsTo ? Number(toId) : null,
      partnerId: config.needsPartner ? Number(partnerId) : null,
      salesChannelId: type === 'outbound' && salesChannelId ? Number(salesChannelId) : null,
      memo,
      items: filledItems.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      })),
      allowNegative,
    };

    createMovements.mutate(input, {
      onSuccess: () => {
        setShortage(null);
        toast(
          scheduled
            ? `${filledItems.length}종 ${formatNumber(totalQuantity)}개를 ${config.verb} 예정으로 등록했어요 (${formatSchedule(new Date(scheduledAt).toISOString())} 반영)`
            : `${filledItems.length}종 ${formatNumber(totalQuantity)}개를 ${config.verb}했어요`,
        );
        setItems([newItem()]);
        setMemo('');
        setSubmitted(false);
      },
      onError: (error) => {
        // 화면 재고는 넉넉했는데 그 사이 다른 출고로 서버에서 부족해진 경우에도 확인을 받는다
        if (!allowNegative && config.needsFrom && error.message.startsWith('재고가 부족해요')) {
          createMovements.reset();
          setShortage({ lines: [], message: error.message });
        } else {
          setShortage(null);
        }
      },
    });
  };

  const warehouseName = (id: string) => warehouses.data?.find((w) => String(w.id) === id)?.name ?? '창고 미선택';

  const warehouseOptions = (warehouses.data ?? []).map((w) => (
    <option key={w.id} value={w.id}>
      {w.name}
    </option>
  ));

  return (
    <div className={styles.page}>
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
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          type === 'transfer' && (
            <Button onClick={() => setPasting(true)}>
              <Icon name="plus" size={16} />
              쿠팡 입고 붙여넣기
            </Button>
          )
        }
      />
      <MovementSubTabs type={type} />

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Card title="기본 정보">
          <div className={styles.fields}>
            {scheduled ? (
              <TextField
                label={`${config.verb} 예정 시각`}
                type="datetime-local"
                value={scheduledAt}
                min={`${today()}T00:00`}
                onChange={(e) => e.target.value && setScheduledAt(e.target.value)}
                hint="이 시각이 지나면 재고에 반영돼요"
              />
            ) : (
              <TextField
                label={type === 'outbound' ? '출고일' : '날짜'}
                type="date"
                value={movedOn}
                max={today()}
                onChange={(e) => e.target.value && setMovedOn(e.target.value)}
              />
            )}
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
            {type === 'outbound' && (
              <SelectField label="판매처 (선택)" value={salesChannelId} onChange={(e) => setSalesChannelId(e.target.value)}>
                <option value="">선택 안 함</option>
                {activeSalesChannels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
          <div className={styles.scheduleBox}>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} />
              아직 {config.verb}되지 않은 예정 건이에요
            </label>
            {scheduled && (
              <p className={fieldStyles.message}>
                예정 시각 전까지는 재고에 더하거나 빼지 않고, 홈과 {config.verb} 현황에 &lsquo;{config.verb} 예정&rsquo;으로 보여요.
              </p>
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
                <SearchSelectField
                  ariaLabel="제품"
                  value={item.productId}
                  options={productOptions}
                  onChange={(productId) => updateItem(item.key, { productId })}
                  hint={stock !== null ? `현재 재고 ${formatNumber(stock)}개` : undefined}
                  error={exceeds ? `재고(${formatNumber(stock)}개)보다 많아요` : null}
                />
                <TextField
                  aria-label="수량"
                  inputMode="numeric"
                  placeholder="수량"
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
            {scheduled ? `${config.verb} 예정 등록` : `${config.verb} 등록`}
          </Button>
        </div>
      </form>

      {pasting && (
        <TransferPasteDialog
          fromId={fromId}
          toId={toId}
          fromName={warehouseName(fromId)}
          toName={warehouseName(toId)}
          onClose={() => setPasting(false)}
        />
      )}

      <Dialog
        open={shortage !== null}
        onClose={() => !createMovements.isPending && setShortage(null)}
        title={`재고가 부족한데 ${config.verb}할까요?`}
        footer={
          <>
            <span style={{ flex: 1 }} />
            <Button variant="weak" onClick={() => setShortage(null)} disabled={createMovements.isPending}>
              아니요
            </Button>
            <Button onClick={() => save(true)} loading={createMovements.isPending}>
              네, {config.verb}할게요
            </Button>
          </>
        }
      >
        {shortage?.message && <p>{shortage.message}</p>}
        {shortage && shortage.lines.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            {shortage.lines.map((line) => (
              <li key={line.name}>
                {line.name}: 재고 {formatNumber(line.stock)}개 · {config.verb} {formatNumber(line.quantity)}개 →{' '}
                <strong>{formatNumber(line.stock - line.quantity)}개</strong>
              </li>
            ))}
          </ul>
        )}
        <p style={{ marginTop: 12 }}>
          {config.verb}하면 재고가 마이너스로 남아요. 나중에 입고나 재고 조정으로 맞춰주세요.
        </p>
      </Dialog>
    </div>
  );
}
