import { useMemo, useState } from 'react';
import { useMovements, usePendingMovements, useTransferDetails } from '@/api/queries';
import type { TransferDetail } from '@/api/transfers';
import { isPending, type Movement } from '@/api/types';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { Badge, Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { TransferEditDialog } from '@/features/inventory/TransferEditDialog';
import { downloadCsv } from '@/lib/csv';
import { cx } from '@/lib/cx';
import { addDays, formatDateLabel, formatNumber, today } from '@/lib/format';
import { matchesKeyword } from '@/lib/search';
import { MovementSubTabs } from './MovementPage';
import * as styles from './MovementPage.css';
import * as p from './pages.css';
import * as s from './SettlementPage.css';

/** 이동 한 건 = 같은 번에 등록한 묶음(batch) */
interface TransferRow {
  batchId: string;
  lines: Movement[];
  date: string;
  pending: boolean;
  quantity: number;
  productNames: string;
}

function toRows(list: Movement[]): TransferRow[] {
  const map = new Map<string, Movement[]>();
  for (const m of list) map.set(m.batchId, [...(map.get(m.batchId) ?? []), m]);
  return [...map.values()].map((lines) => ({
    batchId: lines[0].batchId,
    lines,
    date: lines[0].movedOn,
    pending: isPending(lines[0]),
    quantity: lines.reduce((sum, m) => sum + m.quantity, 0),
    productNames: lines.map((m) => m.product.name).join(', '),
  }));
}

/** 예정은 가까운 날부터, 끝난 건은 최근부터 */
function sortRows(rows: TransferRow[]) {
  const upcoming = rows.filter((r) => r.pending).sort((a, b) => a.date.localeCompare(b.date));
  const done = rows.filter((r) => !r.pending).sort((a, b) => b.date.localeCompare(a.date));
  return [...upcoming, ...done];
}

const dash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '-' : value;
const won = (value: number | null | undefined) =>
  value === null || value === undefined ? '-' : formatNumber(value);

export function TransferStatusPage() {
  const [from, setFrom] = useState(addDays(today(), -29));
  const [to, setTo] = useState(today());
  const [editing, setEditing] = useState<TransferRow | null>(null);
  const [keyword, setKeyword] = useState('');

  const pending = usePendingMovements('transfer');
  const movements = useMovements({ from, to, type: 'transfer' });

  const allRows = useMemo(() => {
    const byId = new Map<number, Movement>();
    for (const m of [...(pending.data ?? []), ...(movements.data ?? [])]) byId.set(m.id, m);
    return sortRows(toRows([...byId.values()]));
  }, [pending.data, movements.data]);

  const details = useTransferDetails(allRows.map((r) => r.batchId));
  const detailOf = (row: TransferRow): TransferDetail | undefined => details.data?.[row.batchId];
  const rows = allRows.filter((r) => {
    const d = detailOf(r);
    return matchesKeyword(keyword, [
      r.productNames,
      ...r.lines.map((m) => m.product.sku),
      ...r.lines.map((m) => m.memo),
      d?.center,
      d?.poNo,
      d?.outNo,
      d?.vehicleNo,
      d?.driver,
      d?.address,
    ]);
  });

  const pendingCount = rows.filter((r) => r.pending).length;
  const totalCost = rows.reduce((sum, r) => sum + (detailOf(r)?.vehicleCost ?? 0), 0);

  const handleDownload = () =>
    downloadCsv(
      `이동내역_${from}_${to}.csv`,
      ['날짜', '상태', '입고시간', '센터', '품목', '수량', 'PLT', '입고트럭', '차량비용', '쿠팡 발주번호', '스타팩 출고번호'],
      rows.map((r) => {
        const d = detailOf(r);
        return [
          r.date,
          r.pending ? '예정' : '완료',
          d?.arrivalTime ?? '',
          d?.center ?? '',
          r.productNames,
          r.quantity,
          d?.pallets ?? '',
          d?.truckTon ?? '',
          d?.vehicleCost ?? '',
          d?.poNo ?? '',
          d?.outNo ?? '',
        ];
      }),
    );

  const loading = pending.isLoading || movements.isLoading;
  const error = pending.error ?? movements.error ?? details.error;

  return (
    <div className={styles.page}>
      <PageHeader title="이동 내역" description="창고 이동(쿠팡 입고) 예정 건과 끝난 건을 한눈에 봐요" />
      <MovementSubTabs type="transfer" />

      <Card>
        <div className={p.sectionHeader}>
          <h2 className={p.sectionTitle}>
            이동 {rows.length}건{' '}
            <span className={p.muted}>
              예정 {pendingCount}건 · 차량비용 {formatNumber(totalCost)}원
            </span>
          </h2>
          <Button variant="weak" size="sm" onClick={handleDownload} disabled={rows.length === 0}>
            <Icon name="download" size={16} />
            엑셀
          </Button>
        </div>
        <div className={p.filterBar}>
          <TextField label="시작일" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          <TextField label="종료일" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
          <TextField
            label="검색"
            type="search"
            placeholder="제품 · 센터 · 발주번호 · 차량 · 기사"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            containerClassName={p.filterWide}
          />
        </div>
        <p className={p.listMeta} style={{ marginBottom: 8 }}>
          예정 건은 기간과 상관없이 맨 위에 모두 보여요
        </p>

        {error && <ErrorBox error={error} />}
        {loading ? (
          <Skeleton height={200} />
        ) : rows.length === 0 ? (
          <EmptyState title="이동 내역이 없어요" description="이동 입력에서 등록하거나 기간을 바꿔보세요" />
        ) : (
          <>
            <div className={cx(p.tableWrap, p.responsiveOnly.desktop)}>
              <table className={p.table}>
                <thead>
                  <tr>
                    <th className={p.th}>날짜</th>
                    <th className={p.th}>입고시간</th>
                    <th className={p.th}>센터</th>
                    <th className={p.th}>품목</th>
                    <th className={cx(p.th, p.num)}>수량</th>
                    <th className={cx(p.th, p.num)}>PLT</th>
                    <th className={p.th}>입고트럭(t)</th>
                    <th className={cx(p.th, p.num)}>차량비용</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const d = detailOf(r);
                    return (
                      <tr key={r.batchId} className={s.clickRow} onClick={() => setEditing(r)}>
                        <td className={cx(p.td, s.nowrap)}>
                          {r.pending && <Badge tone="blue">예정</Badge>} {formatDateLabel(r.date)}
                        </td>
                        <td className={cx(p.td, s.nowrap)}>{dash(d?.arrivalTime)}</td>
                        <td className={cx(p.td, p.strong, s.nowrap)}>{dash(d?.center)}</td>
                        <td className={cx(p.td, p.wrapCell)}>{r.productNames}</td>
                        <td className={cx(p.td, p.num)}>{formatNumber(r.quantity)}</td>
                        <td className={cx(p.td, p.num)}>{dash(d?.pallets)}</td>
                        <td className={p.td}>{dash(d?.truckTon)}</td>
                        <td className={cx(p.td, p.num, p.strong)}>{won(d?.vehicleCost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className={p.responsiveOnly.mobile}>
              {rows.map((r) => {
                const d = detailOf(r);
                const extra = [
                  d?.pallets != null ? `${d.pallets}PLT` : null,
                  d?.truckTon,
                  d?.vehicleCost != null ? `${formatNumber(d.vehicleCost)}원` : null,
                ].filter(Boolean);
                return (
                  <li key={r.batchId} className={cx(p.listItem, s.clickRow)} onClick={() => setEditing(r)}>
                    <div className={p.listMain}>
                      <p className={p.listTitle}>
                        {r.pending && <Badge tone="blue">예정</Badge>}
                        {d?.center ?? r.lines[0].toWarehouse?.name ?? '이동'}
                      </p>
                      <p className={p.listMeta}>
                        {formatDateLabel(r.date)}
                        {d?.arrivalTime && ` ${d.arrivalTime}`} · {r.productNames}
                      </p>
                      {extra.length > 0 && <p className={p.listMeta}>{extra.join(' · ')}</p>}
                    </div>
                    <span className={p.listRight}>{formatNumber(r.quantity)}개</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {editing && (
        <TransferEditDialog key={editing.batchId} batch={editing.lines} detail={detailOf(editing)} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
