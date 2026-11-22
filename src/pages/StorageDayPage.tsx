import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useStorageDays } from '@/api/queries';
import { storageDayAmount } from '@/api/types';
import { Button } from '@/components/Button';
import { Card, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { StorageProducts } from '@/features/storage/StorageProducts';
import { addDays, formatDateLabel, formatNumber, today } from '@/lib/format';
import * as p from './pages.css';
import * as s from './StoragePage.css';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 보관비 > 날짜별 '일일 보관비 전체 내역' (제품별 계산 + 메모지) */
export function StorageDayPage() {
  const { date = '' } = useParams();
  const navigate = useNavigate();
  const valid = DATE_RE.test(date);
  const query = useStorageDays(valid ? date : today(), valid ? date : today());

  if (!valid) return <Navigate to="/stock/storage" replace />;

  const all = query.data ?? [];
  const day = all.find((d) => d.storedOn === date);
  const recorded = day?.recorded ? day : undefined;
  const isLast = date >= today();

  return (
    <div className={p.stack}>
      <PageHeader
        title={`${formatDateLabel(date)} 보관비`}
        description={
          <Link to="/stock/storage" className={p.linkText}>
            ‹ 보관비 일자별 목록
          </Link>
        }
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" variant="weak" onClick={() => navigate(`/stock/storage/${addDays(date, -1)}`)}>
              ‹ 전날
            </Button>
            <Button size="sm" variant="weak" disabled={isLast} onClick={() => navigate(`/stock/storage/${addDays(date, 1)}`)}>
              다음날 ›
            </Button>
          </div>
        }
      />

      {query.error && <ErrorBox error={query.error} />}

      {query.isLoading ? (
        <Skeleton height={88} />
      ) : (
        <div className={p.cardGrid}>
          <Card>
            <p className={p.statLabel}>일일금액 (부가세 포함)</p>
            <p className={p.statValue}>
              {recorded ? formatNumber(storageDayAmount(recorded)) : '-'}
              {recorded && <span className={p.statUnit}>원</span>}
            </p>
            {recorded?.reportedDaily != null && recorded.reportedDaily !== storageDayAmount(recorded) && (
              <p className={s.warn}>업체 {formatNumber(recorded.reportedDaily)}원</p>
            )}
          </Card>
          <Card>
            <p className={p.statLabel}>업체 기준 팔레트 · 경량랙</p>
            <p className={p.statValue}>
              {recorded ? `${formatNumber(recorded.palletQty)} · ${formatNumber(recorded.rackQty)}` : '-'}
            </p>
          </Card>
          <Card>
            <p className={p.statLabel}>업체 누적금액</p>
            <p className={p.statValue}>
              {recorded?.reportedTotal != null ? formatNumber(recorded.reportedTotal) : '-'}
              {recorded?.reportedTotal != null && <span className={p.statUnit}>원</span>}
            </p>
          </Card>
        </div>
      )}

      {!query.isLoading && (
        <StorageProducts key={date} date={date} reported={recorded} memo={day?.memo ?? null} />
      )}
    </div>
  );
}
