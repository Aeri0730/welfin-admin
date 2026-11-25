import { useState } from 'react';
import { CARRIER_LABEL, RETURN_KIND_LABEL, type ReturnInvoice, RETURN_STATUS_LABEL, returnChannel, returnChannelLabel, type ReturnItem, type ReturnStatus } from '@/api/types';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Badge, type BadgeTone } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import {
  attemptLabel,
  attemptOf,
  carrierTrackingUrl,
  daysSince,
  isAtPickup,
  isDelivered,
  isOverdue,
  isReturning,
  isTrackableCarrier,
  isUncollected,
  STATUS_TONE,
  trackingTone,
} from './status';
import * as s from '@/pages/ReturnsPage.css';

/**
 * 상태 칩은 하나만: 회수 송장이 나온 건은 배송조회 상태에 따라
 * 미집화 / 집화출발 / 도착(배송완료) / 회수중 중 하나로 보여준다.
 * 회수중 탭 조건(isReturning)과 같은 기준이다.
 */
function statusChip(item: ReturnItem): { label: string; tone: BadgeTone } {
  // 송장이 여러 개면 하나라도 이동 중일 때 회수중
  if (item.status === 'in_transit' && !isReturning(item)) {
    if (isUncollected(item)) return { label: '미집화', tone: 'orange' };
    if (isDelivered(item)) return { label: '도착', tone: 'green' };
    if (isAtPickup(item)) return { label: '집화출발', tone: 'purple' };
  }
  return { label: RETURN_STATUS_LABEL[item.status], tone: STATUS_TONE[item.status] };
}

/** 목록에 보이는 반송장 수 (최근 송장 포함). 더 있으면 수정 모달에서 본다 */
const INVOICES_SHOWN = 3;

/** 재접수 전에 쓰던 반송장 한 줄: 몇 번째 · 택배사 송장 · 마지막 배송조회 상태 */
function PreviousInvoice({ invoice, order }: { invoice: ReturnInvoice; order: number }) {
  const t = invoice.tracking;
  const link = carrierTrackingUrl(invoice.carrier, invoice.invoiceNo);
  return (
    <p className={s.prevInvoice}>
      <span className={s.invoiceOrder}>{order}번째</span>
      {invoice.carrier ? CARRIER_LABEL[invoice.carrier] : '택배사 미지정'} {invoice.invoiceNo}
      {isTrackableCarrier(invoice.carrier) && (
        <Badge tone={trackingTone(t.code)}>{t.label ?? (t.error ? '조회 실패' : '조회 전')}</Badge>
      )}
      {t.location && <span>{t.location}</span>}
      {t.time && <span>{formatDateTime(t.time)}</span>}
      {link && (
        <a className={s.smallLink} href={link} target="_blank" rel="noreferrer">
          택배사에서 보기
        </a>
      )}
    </p>
  );
}

/** 접수처 칩 색: 직접 입력한 접수처는 보라 */
const CHANNEL_TONE: Record<string, BadgeTone | undefined> = { ezadmin: 'blue', starpack: 'grey' };

interface ReturnRowProps {
  item: ReturnItem;
  todayString: string;
  productName?: string;
  busy: boolean;
  onStatus: (item: ReturnItem, status: ReturnStatus) => void;
  onEdit: (item: ReturnItem) => void;
  onRefresh: (item: ReturnItem) => void;
  /** 넘기면 체크박스가 보인다 (일괄 처리용) */
  selected?: boolean;
  onSelect?: (item: ReturnItem) => void;
}

export function ReturnRow({
  item,
  todayString,
  productName,
  busy,
  onStatus,
  onEdit,
  onRefresh,
  selected,
  onSelect,
}: ReturnRowProps) {
  const [open, setOpen] = useState(false);
  const days = daysSince(item.receivedOn, todayString);
  const overdue = isOverdue(item);
  const chip = statusChip(item);
  const link = item.invoiceNo ? carrierTrackingUrl(item.carrier, item.invoiceNo) : null;
  const t = item.tracking;
  const previous = item.previousInvoices;
  /** 송장 전체 개수 (최근 송장이 n번째) */
  const invoiceCount = previous.length + (item.invoiceNo ? 1 : 0);
  const shownPrevious = previous.slice(0, INVOICES_SHOWN - 1);
  const hiddenCount = previous.length - shownPrevious.length;

  return (
    <li className={s.item}>
      <div className={s.itemMain}>
        <p className={s.itemTitle}>
          {onSelect && (
            <input
              type="checkbox"
              className={s.checkbox}
              checked={Boolean(selected)}
              onChange={() => onSelect(item)}
              aria-label={`${item.recipient} 선택`}
            />
          )}
          {item.recipient}
          <Badge tone={CHANNEL_TONE[returnChannel(item)] ?? 'purple'}>{returnChannelLabel(item)}</Badge>
          <Badge tone={chip.tone}>{chip.label}</Badge>
          {item.restocked && <Badge tone="green">양품화</Badge>}
          {item.rerequestCount > 0 && (
            <Badge tone={overdue ? 'red' : 'orange'}>{attemptLabel(attemptOf(item.rerequestCount))}</Badge>
          )}
          {item.kind && (
            <Badge tone={item.kind === 'return' ? 'orange' : 'blue'}>
              {RETURN_KIND_LABEL[item.kind]}
              {item.reason ? ` · ${item.reason}` : ''}
            </Badge>
          )}
          {item.status !== 'inspected' && item.status !== 'collected' && (
            <Badge tone={overdue ? 'red' : 'grey'}>D+{days}</Badge>
          )}
        </p>
        <p className={s.itemProduct}>
          {productName ?? item.productText} × {item.quantity}
        </p>
        <p className={s.itemMeta}>
          접수 {item.receivedOn}
          {item.mgmtNo && ` · 관리번호 ${item.mgmtNo}`}
          {item.orderNo && ` · ${item.orderNo}`}
          {item.phone && ` · ${item.phone}`}
          {item.status === 'inspected' && item.inspectedAt && ` · 검수 ${formatDateTime(item.inspectedAt)}`}
        </p>
        {item.address && <p className={s.itemMeta}>{item.address}</p>}
        {item.memo && (
          <p className={s.itemMeta} style={{ whiteSpace: 'pre-line' }}>
            메모: {item.memo}
          </p>
        )}
      </div>

      <div className={s.tracking}>
        {item.invoiceNo ? (
          <>
            <p className={s.invoiceLine}>
              {invoiceCount > 1 && <span className={s.invoiceOrder}>{invoiceCount}번째</span>}
              {item.carrier ? CARRIER_LABEL[item.carrier] : '택배사 미지정'} {item.invoiceNo}
              {link && (
                <a className={s.smallLink} href={link} target="_blank" rel="noreferrer">
                  택배사에서 보기
                </a>
              )}
            </p>
            {isTrackableCarrier(item.carrier) ? (
              <div className={s.trackLine}>
                <Badge tone={trackingTone(t.code)}>{t.label ?? (t.error ? '조회 실패' : '조회 전')}</Badge>
                {t.location && <span>{t.location}</span>}
                {t.time && <span>{formatDateTime(t.time)}</span>}
                {t.events.length > 0 && (
                  <button type="button" className={s.linkButton} onClick={() => setOpen((v) => !v)}>
                    {open ? '경로 접기' : `이동 경로 ${t.events.length}`}
                  </button>
                )}
                <button
                  type="button"
                  className={s.linkButton}
                  onClick={() => onRefresh(item)}
                  disabled={busy}
                  aria-label="배송조회 새로고침"
                >
                  새로고침
                </button>
              </div>
            ) : (
              <p className={s.itemMeta}>자동 조회 안 됨 · 도착하면 회수완료를 눌러주세요</p>
            )}
            {t.error && <p className={s.errorText}>{t.error}</p>}
            {t.checkedAt && <p className={s.itemMeta}>조회 {formatDateTime(t.checkedAt)}</p>}
            {open && (
              <ol className={s.timeline}>
                {t.events.map((event, index) => (
                  <li key={`${event.time}-${index}`} className={s.timelineItem}>
                    <span className={s.timelineHead}>{event.label}</span>
                    {event.location && ` · ${event.location}`}
                    {event.time && ` · ${formatDateTime(event.time)}`}
                    {event.description && <div>{event.description}</div>}
                  </li>
                ))}
              </ol>
            )}
            {shownPrevious.map((invoice, index) => (
              <PreviousInvoice key={`${invoice.invoiceNo}-${index}`} invoice={invoice} order={invoiceCount - 1 - index} />
            ))}
            {hiddenCount > 0 && (
              <button type="button" className={s.linkButton} style={{ alignSelf: 'flex-start' }} onClick={() => onEdit(item)}>
                이전 송장 {hiddenCount}개 더 보기
              </button>
            )}
          </>
        ) : (
          <p className={s.itemMeta}>회수 송장 미등록</p>
        )}
      </div>

      <div className={s.itemActions}>
        {(item.status === 'requested' || item.status === 'in_transit') && (
          <Button size="sm" variant="secondary" onClick={() => onStatus(item, 'collected')} disabled={busy}>
            회수완료
          </Button>
        )}
        {item.status === 'collected' && (
          <Button size="sm" onClick={() => onStatus(item, 'inspected')} disabled={busy}>
            검수완료
          </Button>
        )}
        {item.status === 'inspected' && (
          <Button size="sm" variant="weak" onClick={() => onStatus(item, 'collected')} disabled={busy}>
            검수 취소
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onEdit(item)} aria-label="수정">
          <Icon name="edit" size={16} />
        </Button>
      </div>
    </li>
  );
}
