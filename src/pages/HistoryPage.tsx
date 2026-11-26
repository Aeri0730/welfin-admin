import { useMemo, useState } from 'react';
import { useMovements, useWarehouses } from '@/api/queries';
import { MOVEMENT_LABEL, type Movement, type MovementFilter, type MovementType } from '@/api/types';
import { Button } from '@/components/Button';
import { SelectField, TextField } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { Badge, Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { MOVEMENT_TONE, describeRoute, signedQuantity } from '@/features/inventory/movement';
import { cx } from '@/lib/cx';
import { downloadCsv } from '@/lib/csv';
import { addDays, formatDateLabel, formatNumber, today } from '@/lib/format';
import { matchesKeyword } from '@/lib/search';
import * as s from './pages.css';

function quantityText(m: Movement) {
  const signed = signedQuantity(m);
  if (signed > 0) return { text: `+${formatNumber(signed)}`, className: s.plus };
  if (signed < 0) return { text: formatNumber(signed), className: s.minus };
  return { text: formatNumber(m.quantity), className: undefined };
}

export function HistoryPage() {
  const [from, setFrom] = useState(addDays(today(), -6));
  const [to, setTo] = useState(today());
  const [type, setType] = useState<MovementType | ''>('');
  const [warehouseId, setWarehouseId] = useState('');
  const [keyword, setKeyword] = useState('');

  const filter: MovementFilter = {
    from,
    to,
    type: type || undefined,
    warehouseId: warehouseId ? Number(warehouseId) : undefined,
  };

  const warehouses = useWarehouses();
  const movements = useMovements(filter);
  const list = useMemo(
    () =>
      (movements.data ?? []).filter((m) =>
        matchesKeyword(keyword, [m.product.name, m.product.sku, describeRoute(m), m.memo, m.createdBy]),
      ),
    [movements.data, keyword],
  );

  const totals = useMemo(() => {
    const result: Record<MovementType, number> = { inbound: 0, outbound: 0, transfer: 0, adjust: 0 };
    for (const m of list) result[m.type] += m.quantity;
    return result;
  }, [list]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Movement[]>();
    for (const m of list) {
      const group = groups.get(m.movedOn) ?? [];
      group.push(m);
      groups.set(m.movedOn, group);
    }
    return [...groups.entries()];
  }, [list]);

  const handleDownload = () => {
    downloadCsv(
      `입출고내역_${from}_${to}.csv`,
      ['날짜', '유형', '제품명', 'SKU', '경로', '수량', '메모', '작성자'],
      list.map((m) => [
        m.movedOn,
        MOVEMENT_LABEL[m.type],
        m.product.name,
        m.product.sku,
        describeRoute(m),
        m.quantity,
        m.memo ?? '',
        m.createdBy,
      ]),
    );
  };

  return (
    <div className={s.stack}>
      <PageHeader
        title="입출고 내역"
        description="기간과 창고별로 기록을 확인할 수 있어요"
        actions={
          <Button variant="weak" size="sm" onClick={handleDownload} disabled={list.length === 0}>
            <Icon name="download" size={16} />
            엑셀 다운로드
          </Button>
        }
      />

      <Card>
        <div className={s.filterBar}>
          <TextField
            label="시작일"
            type="date"
            value={from}
            max={to}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
          />
          <TextField
            label="종료일"
            type="date"
            value={to}
            min={from}
            max={today()}
            onChange={(e) => e.target.value && setTo(e.target.value)}
          />
          <SelectField label="유형" value={type} onChange={(e) => setType(e.target.value as MovementType | '')}>
            <option value="">전체</option>
            {(Object.keys(MOVEMENT_LABEL) as MovementType[]).map((key) => (
              <option key={key} value={key}>
                {MOVEMENT_LABEL[key]}
              </option>
            ))}
          </SelectField>
          <SelectField label="창고" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">전체</option>
            {(warehouses.data ?? []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="검색"
            type="search"
            placeholder="제품 · SKU · 경로 · 메모 · 작성자"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            containerClassName={s.filterWide}
          />
        </div>
      </Card>

      <div className={s.cardGrid}>
        {(['inbound', 'outbound', 'transfer'] as const).map((key) => (
          <Card key={key}>
            <p className={s.statLabel}>{MOVEMENT_LABEL[key]} 합계</p>
            <p className={s.statValue}>
              {formatNumber(totals[key])}
              <span className={s.statUnit}>개</span>
            </p>
          </Card>
        ))}
      </div>

      {movements.error && <ErrorBox error={movements.error} />}

      <Card>
        {movements.isLoading ? (
          <div className={s.stack}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={36} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState title="기록이 없어요" description="기간이나 조건을 바꿔보세요" />
        ) : (
          <>
            <div className={cx(s.tableWrap, s.responsiveOnly.desktop)}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th className={s.th}>날짜</th>
                    <th className={s.th}>유형</th>
                    <th className={s.th}>제품</th>
                    <th className={s.th}>경로</th>
                    <th className={cx(s.th, s.num)}>수량</th>
                    <th className={s.th}>메모</th>
                    <th className={s.th}>작성자</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((m) => {
                    const qty = quantityText(m);
                    return (
                      <tr key={m.id}>
                        <td className={s.td}>{m.movedOn}</td>
                        <td className={s.td}>
                          <Badge tone={MOVEMENT_TONE[m.type]}>{MOVEMENT_LABEL[m.type]}</Badge>
                        </td>
                        <td className={s.td}>
                          <p className={s.strong}>{m.product.name}</p>
                          <p className={s.muted}>{m.product.sku}</p>
                        </td>
                        <td className={s.td}>{describeRoute(m)}</td>
                        <td className={cx(s.td, s.num, s.strong, qty.className)}>{qty.text}</td>
                        <td className={cx(s.td, s.wrapCell, s.muted)}>{m.memo ?? ''}</td>
                        <td className={s.td}>{m.createdBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={s.responsiveOnly.mobile}>
              {grouped.map(([date, items]) => (
                <section key={date}>
                  <h3 className={s.groupLabel}>{formatDateLabel(date)}</h3>
                  <ul>
                    {items.map((m) => {
                      const qty = quantityText(m);
                      return (
                        <li key={m.id} className={s.listItem}>
                          <div className={s.listMain}>
                            <p className={s.listTitle}>
                              <Badge tone={MOVEMENT_TONE[m.type]}>{MOVEMENT_LABEL[m.type]}</Badge>
                              {m.product.name}
                            </p>
                            <p className={s.listMeta}>
                              {describeRoute(m)} · {m.createdBy}
                              {m.memo && ` · ${m.memo}`}
                            </p>
                          </div>
                          <span className={cx(s.listRight, qty.className)}>{qty.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
