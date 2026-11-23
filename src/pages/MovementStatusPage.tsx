import { useMemo, useState } from 'react';
import { NavLink } from 'react-router';
import { useCancelScheduledMovements, useMovements, usePendingMovements } from '@/api/queries';
import { isPending, type Movement } from '@/api/types';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Badge, Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { MovementEditDialog } from '@/features/inventory/MovementEditDialog';
import { describeRoute, formatSchedule, movementBadge } from '@/features/inventory/movement';
import { downloadCsv } from '@/lib/csv';
import { addDays, formatDateLabel, formatNumber, today } from '@/lib/format';
import { MovementSubTabs } from './MovementPage';
import * as styles from './MovementPage.css';
import * as s from './pages.css';

const VERB = { inbound: '입고', outbound: '출고' } as const;

/** 같은 번에 등록한 묶음(batch) 단위로 */
function groupByBatch(list: Movement[]) {
  const map = new Map<string, Movement[]>();
  for (const m of list) {
    const group = map.get(m.batchId) ?? [];
    group.push(m);
    map.set(m.batchId, group);
  }
  return [...map.values()];
}

export function MovementStatusPage({ type }: { type: 'inbound' | 'outbound' }) {
  const verb = VERB[type];
  const toast = useToast();
  const [from, setFrom] = useState(addDays(today(), -6));
  const [to, setTo] = useState(today());
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [editing, setEditing] = useState<Movement | null>(null);

  const pending = usePendingMovements(type);
  const movements = useMovements({ from, to, type });
  const cancel = useCancelScheduledMovements();

  const pendingBatches = useMemo(() => groupByBatch(pending.data ?? []), [pending.data]);

  /** 반영된 기록만 날짜별로 (오늘 날짜의 아직 안 된 예정 건은 위 '예정' 에서 보여줌) */
  const done = useMemo(() => (movements.data ?? []).filter((m) => !isPending(m)), [movements.data]);
  const grouped = useMemo(() => {
    const map = new Map<string, Movement[]>();
    for (const m of done) {
      const group = map.get(m.movedOn) ?? [];
      group.push(m);
      map.set(m.movedOn, group);
    }
    return [...map.entries()];
  }, [done]);
  const total = done.reduce((sum, m) => sum + m.quantity, 0);
  const pendingTotal = (pending.data ?? []).reduce((sum, m) => sum + m.quantity, 0);

  const handleCancel = (batch: Movement[]) => {
    const batchId = batch[0].batchId;
    if (cancelling !== batchId) {
      setCancelling(batchId);
      return;
    }
    cancel.mutate(batchId, {
      onSuccess: (count) => {
        toast(`${verb} 예정 ${count}건을 취소했어요`);
        setCancelling(null);
      },
    });
  };

  const handleDownload = () => {
    downloadCsv(
      `${verb}현황_${from}_${to}.csv`,
      ['날짜', '제품명', 'SKU', '경로', '수량', '메모', '작성자'],
      done.map((m) => [m.movedOn, m.product.name, m.product.sku, describeRoute(m), m.quantity, m.memo ?? '', m.createdBy]),
    );
  };

  return (
    <div className={styles.page}>
      <nav className={styles.segment} aria-label="입고/출고 전환">
        <NavLink to="/inbound/status" className={styles.segmentItem}>
          입고
        </NavLink>
        <NavLink to="/outbound/status" className={styles.segmentItem}>
          출고
        </NavLink>
      </nav>
      <PageHeader title={`${verb} 현황`} description={`${verb} 예정 건과 ${verb}된 기록을 확인해요`} />
      <MovementSubTabs type={type} />

      <div className={s.stack}>
        <Card>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>
              {verb} 예정 <span className={s.muted}>{pendingBatches.length}건 · {formatNumber(pendingTotal)}개</span>
            </h2>
          </div>
          {pending.error && <ErrorBox error={pending.error} />}
          {pending.isLoading ? (
            <Skeleton height={48} />
          ) : pendingBatches.length === 0 ? (
            <EmptyState title={`${verb} 예정 건이 없어요`} description={`${verb} 입력에서 '예정 건이에요'를 체크하고 등록하세요`} />
          ) : (
            <ul>
              {pendingBatches.map((batch) => {
                const first = batch[0];
                const badge = movementBadge(first);
                const sum = batch.reduce((acc, m) => acc + m.quantity, 0);
                return (
                  <li key={first.batchId} className={s.listItem}>
                    <div className={s.listMain}>
                      <p className={s.listTitle}>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        {formatSchedule(first.scheduledAt as string)}
                      </p>
                      <p className={s.listMeta}>
                        {describeRoute(first)} · {first.createdBy}
                        {first.memo && ` · ${first.memo}`}
                      </p>
                      <ul className={styles.batchItems}>
                        {batch.map((m) => (
                          <li key={m.id}>
                            <button type="button" className={styles.batchItem} onClick={() => setEditing(m)}>
                              <span className={styles.batchName}>{m.product.name}</span>
                              <span className={styles.batchQty}>{formatNumber(m.quantity)}개</span>
                              <Icon name="edit" size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={styles.rowActions}>
                      <span className={s.listRight}>{formatNumber(sum)}개</span>
                      <Button
                        size="sm"
                        variant={cancelling === first.batchId ? 'danger' : 'weak'}
                        onClick={() => handleCancel(batch)}
                        loading={cancel.isPending && cancelling === first.batchId}
                      >
                        {cancelling === first.batchId ? '정말 취소' : '예정 취소'}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {cancel.error && <ErrorBox error={cancel.error} />}
        </Card>

        <Card>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>
              {verb} 기록 <span className={s.muted}>{formatNumber(total)}개</span>
            </h2>
            <Button variant="weak" size="sm" onClick={handleDownload} disabled={done.length === 0}>
              <Icon name="download" size={16} />
              엑셀
            </Button>
          </div>
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
          </div>
          {movements.error && <ErrorBox error={movements.error} />}
          {movements.isLoading ? (
            <Skeleton height={48} />
          ) : grouped.length === 0 ? (
            <EmptyState title="기록이 없어요" description="기간을 바꿔보세요" />
          ) : (
            grouped.map(([date, items]) => (
              <section key={date}>
                <h3 className={s.groupLabel}>
                  {formatDateLabel(date)} · {formatNumber(items.reduce((acc, m) => acc + m.quantity, 0))}개
                </h3>
                <ul>
                  {items.map((m) => (
                    <li key={m.id} className={s.listItem}>
                      <div className={s.listMain}>
                        <p className={s.listTitle}>
                          {m.scheduledAt && <Badge tone="grey">예정 반영</Badge>}
                          {m.product.name}
                        </p>
                        <p className={s.listMeta}>
                          {describeRoute(m)} · {m.createdBy}
                          {m.scheduledAt && ` · ${formatSchedule(m.scheduledAt)} 반영`}
                          {m.memo && ` · ${m.memo}`}
                        </p>
                      </div>
                      <div className={styles.rowActions}>
                        <span className={s.listRight}>{formatNumber(m.quantity)}개</span>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(m)} aria-label={`${m.product.name} 수정`}>
                          <Icon name="edit" size={16} />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </Card>
      </div>

      {editing && <MovementEditDialog key={editing.id} movement={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
