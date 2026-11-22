import { useEffect, useMemo, useRef, useState } from 'react';
import { useProducts, useRefreshTracking, useReturns, useUpdateReturns } from '@/api/queries';
import { RETURN_CHANNEL_LABEL, RETURN_STATUS_LABEL, returnChannel, type ReturnItem, type ReturnStatus } from '@/api/types';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Field';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { ReturnEditDialog } from '@/features/returns/ReturnEditDialog';
import { ReturnInput } from '@/features/returns/ReturnInput';
import { ReturnRow } from '@/features/returns/ReturnRow';
import { FILTERS, isTrackable, matchesFilter, matchesSearch, OVERDUE_ATTEMPT, attemptLabel, attemptOf, type ReturnFilter } from '@/features/returns/status';
import { downloadCsv } from '@/lib/csv';
import { today } from '@/lib/format';
import * as s from './ReturnsPage.css';
import * as p from './pages.css';

const NOTICE_KEY = 'welfin.returns.noticeHiddenOn';
/** 배송조회를 이 시간보다 오래 전에 했으면 페이지에 들어올 때 다시 조회 */
const STALE_MS = 2 * 60 * 60 * 1000;

function readHiddenOn(): string | null {
  try {
    return localStorage.getItem(NOTICE_KEY);
  } catch {
    return null;
  }
}

export function ReturnsPage() {
  const toast = useToast();
  const todayString = today();
  const returns = useReturns();
  const products = useProducts();
  const updateReturns = useUpdateReturns();
  const refreshTracking = useRefreshTracking();

  const [filter, setFilter] = useState<ReturnFilter>('overdue');
  const [editing, setEditing] = useState<ReturnItem | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [hideToday, setHideToday] = useState(false);
  const [trackingNotice, setTrackingNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const list = useMemo(() => returns.data ?? [], [returns.data]);

  const counts = useMemo(() => {
    const result = Object.fromEntries(FILTERS.map((f) => [f.key, 0])) as Record<ReturnFilter, number>;
    for (const item of list) for (const f of FILTERS) if (matchesFilter(item, f.key, todayString)) result[f.key] += 1;
    return result;
  }, [list, todayString]);

  /** 검색어에 맞는 건 (탭별 숫자와 목록은 이 범위 안에서) */
  const searched = useMemo(() => list.filter((item) => matchesSearch(item, query)), [list, query]);

  const tabCounts = useMemo(() => {
    if (!query.trim()) return counts;
    const result = Object.fromEntries(FILTERS.map((f) => [f.key, 0])) as Record<ReturnFilter, number>;
    for (const item of searched) for (const f of FILTERS) if (matchesFilter(item, f.key, todayString)) result[f.key] += 1;
    return result;
  }, [counts, searched, query, todayString]);

  const visible = useMemo(() => {
    const rows = searched.filter((item) => matchesFilter(item, filter, todayString));
    if (filter === 'inspected') rows.sort((a, b) => (b.inspectedAt ?? '').localeCompare(a.inspectedAt ?? ''));
    return rows;
  }, [searched, filter, todayString]);

  const productNames = useMemo(
    () => new Map((products.data ?? []).map((product) => [product.sku.toUpperCase(), product.name])),
    [products.data],
  );

  /* ---------- 처음 들어왔을 때: 장기 미수 팝업 + 기본 탭 ---------- */
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || !returns.data) return;
    initialized.current = true;
    if (counts.overdue === 0) {
      setFilter(counts.requested > 0 ? 'requested' : 'in_transit');
      return;
    }
    if (readHiddenOn() !== todayString) setNoticeOpen(true);
  }, [returns.data, counts, todayString]);

  const closeNotice = () => {
    if (hideToday) {
      try {
        localStorage.setItem(NOTICE_KEY, todayString);
      } catch {
        // 저장이 안 되는 브라우저면 다음에 다시 뜬다
      }
    }
    setNoticeOpen(false);
  };

  /* ---------- 배송조회 ---------- */
  const runTracking = (items: ReturnItem[], { silent }: { silent: boolean }) => {
    const ids = items.filter(isTrackable).map((item) => item.id);
    if (ids.length === 0) {
      if (!silent) toast('자동 조회할 송장이 없어요');
      return;
    }
    refreshTracking.mutate(ids, {
      onSuccess: (result) => {
        setTrackingNotice(result.failed ? `${result.failed}건 조회 실패: ${result.message ?? ''}` : null);
        if (!silent || result.collected) {
          toast(result.collected ? `${result.collected}건이 배달완료되어 회수완료로 바꿨어요` : `${result.updated}건 조회했어요`);
        }
      },
      onError: (error) => setTrackingNotice(error.message),
    });
  };

  const autoTracked = useRef(false);
  useEffect(() => {
    if (autoTracked.current || !returns.data) return;
    autoTracked.current = true;
    const now = Date.now();
    const stale = returns.data.filter(
      (item) =>
        item.status === 'in_transit' &&
        isTrackable(item) &&
        (!item.tracking.checkedAt || now - new Date(item.tracking.checkedAt).getTime() > STALE_MS),
    );
    runTracking(stale, { silent: true });
  }, [returns.data]);

  /* ---------- 상태 변경 ---------- */
  /* ---------- 회수완료 탭: 선택해서 일괄 검수완료 ---------- */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const bulkMode = filter === 'collected';
  const selectable = bulkMode ? visible.filter((item) => item.status === 'collected') : [];
  const selectedItems = selectable.filter((item) => selectedIds.has(item.id));
  const allSelected = selectable.length > 0 && selectedItems.length === selectable.length;

  const toggleSelect = (item: ReturnItem) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });

  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(selectable.map((item) => item.id)));

  const inspectSelected = () => {
    if (selectedItems.length === 0) return;
    updateReturns.mutate(
      selectedItems.map((item) => ({ current: item, patch: { status: 'inspected' as const } })),
      {
        onSuccess: (count) => {
          toast(`${count}건을 검수완료로 바꿨어요`);
          setSelectedIds(new Set());
        },
      },
    );
  };

  const changeStatus = (item: ReturnItem, status: ReturnStatus) => {
    updateReturns.mutate([{ current: item, patch: { status } }], {
      onSuccess: () => toast(`${item.recipient} 님 건을 ${RETURN_STATUS_LABEL[status]}로 바꿨어요`),
    });
  };

  const handleDownload = () => {
    const label = FILTERS.find((f) => f.key === filter)?.label ?? '';
    downloadCsv(
      `회수_${label}_${todayString}.csv`,
      ['접수일', '접수처', '접수 차수', '상태', '관리번호', '주문번호', '수령자', '연락처', '주소', '제품', '수량', '구분', '사유', '택배사', '회수송장', '배송현황', '메모'],
      visible.map((r) => [
        r.receivedOn,
        RETURN_CHANNEL_LABEL[returnChannel(r)],
        attemptLabel(attemptOf(r.rerequestCount)) ?? '',
        RETURN_STATUS_LABEL[r.status],
        r.mgmtNo ?? '',
        r.orderNo ?? '',
        r.recipient,
        r.phone ?? '',
        r.address ?? '',
        r.productText,
        r.quantity,
        r.kind === 'return' ? '반품' : r.kind === 'exchange' ? '교환' : '',
        r.reason ?? '',
        r.carrier ?? '',
        r.invoiceNo ?? '',
        r.tracking.label ?? '',
        r.memo ?? '',
      ]),
    );
  };

  const busy = updateReturns.isPending || refreshTracking.isPending;

  return (
    <div className={p.stack}>
      <PageHeader
        title="회수"
        description={`반품·교환 회수 접수부터 검수까지 관리해요. ${OVERDUE_ATTEMPT}차 접수까지 했는데 집화가 안 되면 장기 미수로 표시돼요`}
      />

      <ReturnInput existing={list} />

      {returns.error && <ErrorBox error={returns.error} />}
      {trackingNotice && <div className={s.banner}>배송조회: {trackingNotice}</div>}

      <Card>
        <TextField
          type="search"
          aria-label="회수 건 검색"
          placeholder="이름, 연락처, 관리번호, 송장번호, 제품으로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className={s.filterTabs} role="tablist" aria-label="검색 범위">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={s.filterTab({ active })}
                onClick={() => {
                  setFilter(f.key);
                  setSelectedIds(new Set());
                }}
              >
                {f.label}
                <span className={s.filterCount({ active, alert: !active && f.key === 'overdue' && tabCounts.overdue > 0 })}>
                  {tabCounts[f.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className={s.listToolbar}>
          <p className={p.muted}>
            {filter === 'requested' && '전일까지 접수했는데 회수 송장이 아직 없는 건이에요'}
            {filter === 'overdue' && `${OVERDUE_ATTEMPT}차 접수까지 했는데 아직 집화되지 않은 건이에요 (오래된 순)`}
            {filter === 'uncollected' && '회수 송장은 나왔는데 배송조회에 아직 집화처리가 안 잡힌 건이에요'}
            {filter === 'in_transit' && '송장이 있고 미집화 · 집화출발 · 배송완료가 아닌, 실제로 이동 중인 건이에요'}
            {filter === 'collected' && '도착했어요. 실물 확인 후 검수완료를 눌러주세요'}
            {filter === 'inspected' && '최근 30일 동안 검수완료한 건이에요'}
            {filter === 'today' && '오늘 접수한 건이에요. 회수 송장은 보통 다음날 나와요'}
            {filter === 'all' && '진행 중인 건 전부와 최근 30일 검수완료 건이에요'}
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            {(filter === 'in_transit' || filter === 'overdue' || filter === 'uncollected') && (
              <Button
                size="sm"
                variant="weak"
                onClick={() => runTracking(visible, { silent: false })}
                loading={refreshTracking.isPending}
              >
                <Icon name="refresh" size={14} />
                배송조회
              </Button>
            )}
            <Button size="sm" variant="weak" onClick={handleDownload} disabled={visible.length === 0}>
              <Icon name="download" size={14} />
              엑셀
            </Button>
          </div>
        </div>

        {query.trim() && filter !== 'all' && visible.length === 0 && tabCounts.all > 0 && (
          <p className={p.muted} style={{ marginTop: 8 }}>
            이 탭에는 없지만 다른 탭에 {tabCounts.all}건 있어요.{' '}
            <button type="button" className={s.linkButton} onClick={() => setFilter('all')}>
              전체에서 보기
            </button>
          </p>
        )}

        {bulkMode && selectable.length > 0 && (
          <div className={s.bulkBar}>
            <label className={s.checkLabel}>
              <input type="checkbox" className={s.checkbox} checked={allSelected} onChange={toggleAll} />
              전체 선택 ({selectedItems.length}/{selectable.length})
            </label>
            <Button size="sm" onClick={inspectSelected} disabled={selectedItems.length === 0 || busy} loading={updateReturns.isPending}>
              {selectedItems.length > 0 ? `${selectedItems.length}건 검수완료` : '검수완료'}
            </Button>
          </div>
        )}

        {returns.isLoading ? (
          <div className={p.stack} style={{ marginTop: 12 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={72} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState title={query.trim() ? '검색 결과가 없어요' : '해당하는 건이 없어요'} />
        ) : (
          <ul>
            {visible.map((item) => (
              <ReturnRow
                key={item.id}
                item={item}
                todayString={todayString}
                productName={item.sku ? productNames.get(item.sku) : undefined}
                busy={busy}
                onStatus={changeStatus}
                onEdit={setEditing}
                onRefresh={(target) => runTracking([target], { silent: false })}
                selected={bulkMode ? selectedIds.has(item.id) : undefined}
                onSelect={bulkMode && item.status === 'collected' ? toggleSelect : undefined}
              />
            ))}
          </ul>
        )}
        {updateReturns.error && <ErrorBox error={updateReturns.error} />}
      </Card>

      <Dialog
        open={noticeOpen}
        onClose={closeNotice}
        title="장기 미수 건이 있어요"
        footer={
          <>
            <label className={s.checkLabel}>
              <input type="checkbox" checked={hideToday} onChange={(e) => setHideToday(e.target.checked)} />
              오늘 그만보기
            </label>
            <Button
              onClick={() => {
                setFilter('overdue');
                closeNotice();
              }}
            >
              확인
            </Button>
          </>
        }
      >
        <p className={s.noticeCount}>{counts.overdue}건</p>
        <p>
          {OVERDUE_ATTEMPT}차 접수까지 했는데 아직 집화되지 않았어요.
          <br />
          회수를 완료해주세요!
        </p>
      </Dialog>

      {editing && <ReturnEditDialog key={editing.id} item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
