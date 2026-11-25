import { useState } from 'react';
import type { OrderRequest } from '@/api/orderRequests';
import { useOrderRequests, useSetOrderConfirmed } from '@/api/queries';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { useProfile } from '@/features/auth/session';
import { ConfirmChip } from '@/features/orders/ConfirmChip';
import { OrderRequestDialog } from '@/features/orders/OrderRequestDialog';
import * as s from '@/features/orders/orders.css';
import { downloadCsv } from '@/lib/csv';
import { cx } from '@/lib/cx';
import { formatDateLabel, formatNumber, today } from '@/lib/format';
import * as p from './pages.css';

/** 엑셀 칸 (발주처에 보내는 형식 그대로. 신청자는 넣지 않는다) */
const EXCEL_HEADER = ['고유번호', '수령자', '우편번호', '주소', '전화번호', '휴대폰', '상세요구사항', '판매처상품명', '상품옵션', '가격', '수량'];

const toExcelRow = (o: OrderRequest) => [
  o.id,
  o.recipient,
  o.zipCode ?? '',
  o.address,
  o.phone ?? '',
  o.mobile ?? '',
  o.requestNote ?? '',
  o.productName,
  o.productOption ?? '',
  o.price ?? '',
  o.quantity,
];

/** 표에서는 고유번호 앞 8자리만 (전체는 엑셀·마우스 올리면) */
const shortId = (id: string) => id.slice(0, 8).toUpperCase();
const dash = (value: string | null) => value || '-';

/** 금일 발주 신청 */
export function OrderRequestsPage() {
  const date = today();
  const query = useOrderRequests(date);
  const [editing, setEditing] = useState<OrderRequest | 'new' | null>(null);
  const profile = useProfile().data;
  const canConfirm = profile?.canConfirmOrders === true;
  /** 확인 권한이 없을 때 칩을 누르면 보여줄 이유 */
  const noConfirmReason =
    profile?.canConfirmOrders === null
      ? '발주 확인 칸이 아직 없어요. supabase/migrations/0028_order_confirm.sql 을 실행해주세요'
      : `발주 확인은 김다영·박애리만 할 수 있어요 (지금 로그인: ${profile?.name ?? '-'})`;

  const rows = query.data ?? [];
  const totalQty = rows.reduce((sum, o) => sum + o.quantity, 0);
  const confirmedCount = rows.filter((o) => o.confirmedAt !== null).length;
  const pendingIds = rows.filter((o) => o.confirmedAt === null).map((o) => o.id);

  const toast = useToast();
  const confirmAll = useSetOrderConfirmed();
  const handleConfirmAll = () =>
    confirmAll.mutate(
      { ids: pendingIds, confirmed: true },
      {
        onSuccess: (count) => toast(`${count}건을 확인했어요`),
        onError: (error) => toast(error.message),
      },
    );

  const handleDownload = () => downloadCsv(`발주신청_${date}.csv`, EXCEL_HEADER, rows.map(toExcelRow));

  return (
    <div className={p.stack}>
      <PageHeader
        title="발주 신청"
        description="금일 2시까지 신청한 발주를 모아서 봐요. 줄을 누르면 고치거나 송장번호를 넣을 수 있어요"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={s.todayLabel}>{formatDateLabel(date)}</span>
            <Button variant="weak" size="sm" onClick={handleDownload} disabled={rows.length === 0}>
              <Icon name="download" size={16} />
              엑셀
            </Button>
            <Button size="sm" onClick={() => setEditing('new')}>
              <Icon name="plus" size={16} />
              발주 요청하기
            </Button>
          </div>
        }
      />

      {query.error && <ErrorBox error={query.error} />}

      <Card>
        <div className={p.sectionHeader}>
          <h2 className={p.sectionTitle}>
            금일 발주 신청 {rows.length}건{' '}
            <span className={p.muted}>
              수량 {formatNumber(totalQty)}개 · 확인 {confirmedCount}/{rows.length}
            </span>
          </h2>
          {canConfirm && pendingIds.length > 0 && (
            <Button variant="weak" size="sm" onClick={handleConfirmAll} loading={confirmAll.isPending}>
              <Icon name="check" size={16} />
              전체 확인 처리하기 ({pendingIds.length}건)
            </Button>
          )}
        </div>

        {query.isLoading ? (
          <Skeleton height={200} />
        ) : rows.length === 0 ? (
          <EmptyState title="오늘 신청한 발주가 없어요" description="오른쪽 위 '발주 요청하기'로 신청해주세요" />
        ) : (
          <>
            <div className={cx(p.tableWrap, p.responsiveOnly.desktop)}>
              <table className={p.table}>
                <thead>
                  <tr>
                    <th className={p.th}>확인</th>
                    <th className={p.th}>고유번호</th>
                    <th className={p.th}>수령자</th>
                    <th className={p.th}>우편번호</th>
                    <th className={p.th}>주소</th>
                    <th className={p.th}>전화번호</th>
                    <th className={p.th}>휴대폰</th>
                    <th className={p.th}>상세요구사항</th>
                    <th className={p.th}>판매처상품명</th>
                    <th className={p.th}>상품옵션</th>
                    <th className={cx(p.th, p.num)}>가격</th>
                    <th className={cx(p.th, p.num)}>수량</th>
                    <th className={p.th}>송장번호</th>
                    <th className={p.th}>신청자</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className={s.clickRow} onClick={() => setEditing(o)}>
                      <td className={p.td}>
                        <ConfirmChip order={o} canConfirm={canConfirm} noConfirmReason={noConfirmReason} />
                      </td>
                      <td className={p.td} title={o.id}>
                        <span className={s.code}>{shortId(o.id)}</span>
                      </td>
                      <td className={cx(p.td, p.strong, s.nowrap)}>{o.recipient}</td>
                      <td className={cx(p.td, s.nowrap)}>{dash(o.zipCode)}</td>
                      <td className={cx(p.td, s.longCell)}>{o.address}</td>
                      <td className={cx(p.td, s.nowrap)}>{dash(o.phone)}</td>
                      <td className={cx(p.td, s.nowrap)}>{dash(o.mobile)}</td>
                      <td className={cx(p.td, s.longCell)}>{dash(o.requestNote)}</td>
                      <td className={cx(p.td, s.longCell)}>{o.productName}</td>
                      <td className={cx(p.td, s.longCell)}>{dash(o.productOption)}</td>
                      <td className={cx(p.td, p.num)}>{o.price === null ? '-' : formatNumber(o.price)}</td>
                      <td className={cx(p.td, p.num, p.strong)}>{formatNumber(o.quantity)}</td>
                      <td className={cx(p.td, s.nowrap)}>{dash(o.invoiceNo)}</td>
                      <td className={cx(p.td, s.nowrap)}>{dash(o.requester)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className={p.responsiveOnly.mobile}>
              {rows.map((o) => (
                <li key={o.id} className={cx(p.listItem, s.clickRow)} onClick={() => setEditing(o)}>
                  <div className={p.listMain}>
                    <p className={p.listTitle}>
                      {o.recipient} <span className={s.code}>{shortId(o.id)}</span>
                    </p>
                    <p className={p.listMeta}>
                      {o.productName}
                      {o.productOption && ` · ${o.productOption}`}
                    </p>
                    <p className={p.listMeta}>
                      {[o.zipCode && `(${o.zipCode})`, o.address].filter(Boolean).join(' ')}
                    </p>
                    <p className={p.listMeta}>
                      {[o.mobile, o.phone, o.requester && `신청 ${o.requester}`].filter(Boolean).join(' · ')}
                    </p>
                    {o.requestNote && <p className={p.listMeta}>{o.requestNote}</p>}
                    {o.invoiceNo && <p className={p.listMeta}>송장 {o.invoiceNo}</p>}
                  </div>
                  <div className={p.listRight} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <ConfirmChip order={o} canConfirm={canConfirm} noConfirmReason={noConfirmReason} />
                    {formatNumber(o.quantity)}개
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {editing && <OrderRequestDialog item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
