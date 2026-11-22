import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStorageDays } from '@/api/queries';
import { storageDayAmount } from '@/api/types';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { StorageEntry } from '@/features/storage/StorageEntry';
import { MemoChip } from '@/features/storage/MemoChip';
import { cx } from '@/lib/cx';
import { downloadCsv } from '@/lib/csv';
import { addDays, formatDateLabel, formatNumber, today } from '@/lib/format';
import * as p from './pages.css';
import * as s from './StoragePage.css';

const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
function monthEnd(date: string) {
  const [year, month] = date.split('-').map(Number);
  const last = new Date(year, month, 0).getDate();
  return `${date.slice(0, 7)}-${String(last).padStart(2, '0')}`;
}
function shiftMonth(date: string, delta: number) {
  const [year, month] = date.split('-').map(Number);
  const target = new Date(year, month - 1 + delta, 1);
  const first = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-01`;
  const end = monthEnd(first);
  const t = today();
  return end < t ? end : t < first ? first : t;
}

export function StoragePage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(today());
  const openDay = (day: string) => navigate(`/stock/storage/${day}`);
  const from = monthStart(date);
  const to = monthEnd(date);
  // 이번 달 + 지난달 (새 날짜에 직전 기록의 수량·단가를 미리 채우려고)
  const query = useStorageDays(addDays(from, -31), to);

  const all = useMemo(() => query.data ?? [], [query.data]);
  const month = useMemo(
    () => all.filter((day) => day.recorded && day.storedOn >= from && day.storedOn <= to),
    [all, from, to],
  );

  const rows = useMemo(() => {
    let running = 0;
    return month.map((day) => {
      const amount = storageDayAmount(day);
      running += amount;
      return { day, amount, total: running, diff: day.reportedTotal !== null ? day.reportedTotal - running : null };
    });
  }, [month]);

  const monthBefore = rows.filter((row) => row.day.storedOn < date).reduce((sum, row) => sum + row.amount, 0);
  const monthTotal = rows.at(-1)?.total ?? 0;
  const lastReported = [...month].reverse().find((day) => day.reportedTotal !== null);
  const monthLabel = `${Number(from.slice(5, 7))}월`;

  const handleDownload = () =>
    downloadCsv(
      `보관비_${from.slice(0, 7)}.csv`,
      ['날짜', '팔레트', '팔레트 단가', '경량랙', '경량랙 단가', '일일금액', '누적금액', '업체 일일금액', '업체 누적금액', '메모'],
      rows.map(({ day, amount, total }) => [
        day.storedOn,
        day.palletQty,
        day.palletPrice,
        day.rackQty,
        day.rackPrice,
        amount,
        total,
        day.reportedDaily ?? '',
        day.reportedTotal ?? '',
        day.memo ?? '',
      ]),
    );

  return (
    <div className={p.stack}>
      <PageHeader
        title="보관비"
        description="스타팩 일일 보관비를 기록하고 누적금액을 맞춰봐요 (팔레트 · 경량랙, 부가세 포함)"
        actions={
          <Button variant="weak" size="sm" onClick={handleDownload} disabled={rows.length === 0}>
            <Icon name="download" size={16} />
            엑셀 다운로드
          </Button>
        }
      />

      {query.error && <ErrorBox error={query.error} />}

      <div className={p.cardGrid}>
        <Card>
          <p className={p.statLabel}>{monthLabel} 누적 (계산)</p>
          <p className={p.statValue}>
            {formatNumber(monthTotal)}
            <span className={p.statUnit}>원</span>
          </p>
        </Card>
        <Card>
          <p className={p.statLabel}>업체 누적{lastReported ? ` (${lastReported.storedOn.slice(5).replace('-', '/')})` : ''}</p>
          <p className={p.statValue}>
            {lastReported ? formatNumber(lastReported.reportedTotal ?? 0) : '-'}
            {lastReported && <span className={p.statUnit}>원</span>}
          </p>
        </Card>
        <Card>
          <p className={p.statLabel}>기록 {rows.length}일 · 하루 평균</p>
          <p className={p.statValue}>
            {rows.length ? formatNumber(Math.round(monthTotal / rows.length)) : '-'}
            {rows.length > 0 && <span className={p.statUnit}>원</span>}
          </p>
        </Card>
      </div>

      <div className={s.layout}>
        {query.isLoading ? (
          <Card>
            <Skeleton height={320} />
          </Card>
        ) : (
          <StorageEntry
            key={`${date}:${query.dataUpdatedAt}`}
            date={date}
            onDateChange={setDate}
            days={all}
            monthBefore={monthBefore}
            className={s.entry}
          />
        )}

        <Card>
          <div className={s.sectionHead}>
            <h2 className={s.sectionTitle}>{from.slice(0, 4)}년 {monthLabel} 일자별</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" variant="weak" onClick={() => setDate(shiftMonth(date, -1))} aria-label="지난달">
                ‹ 지난달
              </Button>
              <Button size="sm" variant="weak" onClick={() => setDate(shiftMonth(date, 1))} disabled={to >= today()} aria-label="다음달">
                다음달 ›
              </Button>
            </div>
          </div>

          {query.isLoading ? (
            <Skeleton height={240} />
          ) : rows.length === 0 ? (
            <EmptyState title={`${monthLabel} 기록이 없어요`} description="일일 보관비 입력에서 팔레트·경량랙 수를 넣어주세요" />
          ) : (
            <>
              <div className={cx(p.tableWrap, p.responsiveOnly.desktop)}>
                <table className={p.table}>
                  <thead>
                    <tr>
                      <th className={p.th}>날짜</th>
                      <th className={cx(p.th, p.num)}>팔레트</th>
                      <th className={cx(p.th, p.num)}>경량랙</th>
                      <th className={cx(p.th, p.num)}>일일금액</th>
                      <th className={cx(p.th, p.num)}>누적</th>
                      <th className={cx(p.th, p.num)}>업체 누적</th>
                      <th className={p.th}>메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ day, amount, total, diff }) => (
                      <tr
                        key={day.storedOn}
                        className={cx(s.clickRow, day.storedOn === date && s.selectedRow)}
                        onClick={() => openDay(day.storedOn)}
                        title="눌러서 일일 보관비 전체 내역 보기"
                      >
                        <td className={cx(p.td, s.compactTd)}>{formatDateLabel(day.storedOn)}</td>
                        <td className={cx(p.td, s.compactTd, p.num)}>{formatNumber(day.palletQty)}</td>
                        <td className={cx(p.td, s.compactTd, p.num)}>{formatNumber(day.rackQty)}</td>
                        <td className={cx(p.td, s.compactTd, p.num)}>
                          {formatNumber(amount)}
                          {day.reportedDaily !== null && day.reportedDaily !== amount && (
                            <div className={s.warn}>업체 {formatNumber(day.reportedDaily)}</div>
                          )}
                        </td>
                        <td className={cx(p.td, s.compactTd, p.num, p.strong)}>{formatNumber(total)}</td>
                        <td className={cx(p.td, s.compactTd, p.num)}>
                          {day.reportedTotal === null ? (
                            <span className={s.missing}>-</span>
                          ) : (
                            <>
                              {formatNumber(day.reportedTotal)}
                              {diff !== 0 && (
                                <div className={s.warn}>
                                  {diff! > 0 ? '+' : '-'}
                                  {formatNumber(Math.abs(diff!))}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td className={cx(p.td, s.compactTd)}>{day.memo && <MemoChip memo={day.memo} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={p.responsiveOnly.mobile}>
                {[...rows].reverse().map(({ day, amount, total, diff }) => (
                  <div
                    key={day.storedOn}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openDay(day.storedOn)}
                    className={cx(p.listItem, s.clickRow, day.storedOn === date && s.selectedRow)}
                    onClick={() => openDay(day.storedOn)}
                  >
                    <div className={p.listMain}>
                      <p className={p.listTitle}>{formatDateLabel(day.storedOn)}</p>
                      <p className={p.listMeta}>
                        팔레트 {day.palletQty} · 경량랙 {day.rackQty}
                      </p>
                      {day.memo && (
                        <div style={{ marginTop: 4 }}>
                          <MemoChip memo={day.memo} />
                        </div>
                      )}
                    </div>
                    <div className={p.listRight}>
                      <div className={p.strong}>{formatNumber(amount)}원</div>
                      <div className={diff ? s.warn : p.muted}>누적 {formatNumber(total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

    </div>
  );
}
