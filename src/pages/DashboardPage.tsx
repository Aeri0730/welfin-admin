import { useMemo } from 'react';
import { Link } from 'react-router';
import { useMovements } from '@/api/queries';
import { MOVEMENT_LABEL } from '@/api/types';
import { Icon } from '@/components/Icon';
import { Badge, Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { useProfile } from '@/features/auth/session';
import { MOVEMENT_TONE, describeRoute } from '@/features/inventory/movement';
import { useStockMatrix } from '@/features/inventory/useStockMatrix';
import { cx } from '@/lib/cx';
import { formatDateLabel, formatNumber, today } from '@/lib/format';
import * as s from './pages.css';

export function DashboardPage() {
  const date = today();
  const { data: profile } = useProfile();
  const { rows, warehouses, isLoading, error } = useStockMatrix();
  const todayMovements = useMovements({ from: date, to: date });

  const warehouseSummary = useMemo(() => {
    const movements = todayMovements.data ?? [];
    return warehouses.map((warehouse) => {
      const total = rows.reduce((sum, row) => sum + (row.byWarehouse[warehouse.id] ?? 0), 0);
      const inQty = movements
        .filter((m) => m.toWarehouse?.id === warehouse.id)
        .reduce((sum, m) => sum + m.quantity, 0);
      const outQty = movements
        .filter((m) => m.fromWarehouse?.id === warehouse.id)
        .reduce((sum, m) => sum + m.quantity, 0);
      return { warehouse, total, inQty, outQty };
    });
  }, [warehouses, rows, todayMovements.data]);

  const lowStock = rows
    .filter((row) => row.isLow)
    .sort((a, b) => a.total / a.product.safetyStock - b.total / b.product.safetyStock);

  return (
    <div className={s.stack}>
      <PageHeader
        title={profile ? `${profile.name}님, 안녕하세요` : '안녕하세요'}
        description={`${formatDateLabel(date)} 재고 현황이에요`}
      />

      {error && <ErrorBox error={error} />}

      <div className={s.cardGrid}>
        {isLoading
          ? [0, 1].map((i) => (
              <Card key={i}>
                <Skeleton width={80} />
                <Skeleton height={34} width={140} style={{ marginTop: 10 }} />
              </Card>
            ))
          : warehouseSummary.map(({ warehouse, total, inQty, outQty }) => (
              <Card key={warehouse.id}>
                <p className={s.statLabel}>{warehouse.name} 재고</p>
                <p className={s.statValue}>
                  {formatNumber(total)}
                  <span className={s.statUnit}>개</span>
                </p>
                <div className={s.statRow}>
                  <div>
                    <p className={s.statMini}>오늘 들어옴</p>
                    <p className={cx(s.statMiniValue, s.plus)}>+{formatNumber(inQty)}</p>
                  </div>
                  <div>
                    <p className={s.statMini}>오늘 나감</p>
                    <p className={cx(s.statMiniValue, s.minus)}>-{formatNumber(outQty)}</p>
                  </div>
                </div>
              </Card>
            ))}
      </div>

      <div className={s.quickActions}>
        <Link to="/inbound" className={s.quickAction}>
          <span className={s.quickIcon}>
            <Icon name="inbound" size={20} />
          </span>
          입고 등록
        </Link>
        <Link to="/outbound" className={s.quickAction}>
          <span className={s.quickIcon}>
            <Icon name="outbound" size={20} />
          </span>
          출고 등록
        </Link>
        <Link to="/transfer" className={s.quickAction}>
          <span className={s.quickIcon}>
            <Icon name="transfer" size={20} />
          </span>
          창고 이동
        </Link>
      </div>

      <div className={s.twoColumn}>
        <Card>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>안전재고 미달 {lowStock.length > 0 && `${lowStock.length}개`}</h2>
            <Link to="/stock" className={s.linkText}>
              전체 재고
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState title="부족한 제품이 없어요" />
          ) : (
            <ul>
              {lowStock.slice(0, 8).map((row) => (
                <li key={row.product.id} className={s.listItem}>
                  <div className={s.listMain}>
                    <p className={s.listTitle}>{row.product.name}</p>
                    <p className={s.listMeta}>안전재고 {formatNumber(row.product.safetyStock)}개</p>
                  </div>
                  <span className={cx(s.listRight, s.minus)}>{formatNumber(row.total)}개</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>오늘 입출고</h2>
            <Link to="/history" className={s.linkText}>
              전체 내역
            </Link>
          </div>
          {todayMovements.data?.length === 0 ? (
            <EmptyState title="아직 오늘 기록이 없어요" />
          ) : (
            <ul>
              {(todayMovements.data ?? []).slice(0, 8).map((m) => (
                <li key={m.id} className={s.listItem}>
                  <div className={s.listMain}>
                    <p className={s.listTitle}>
                      <Badge tone={MOVEMENT_TONE[m.type]}>{MOVEMENT_LABEL[m.type]}</Badge>
                      {m.product.name}
                    </p>
                    <p className={s.listMeta}>
                      {describeRoute(m)} · {m.createdBy}
                    </p>
                  </div>
                  <span className={s.listRight}>{formatNumber(m.quantity)}개</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
