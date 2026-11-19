import { useState } from 'react';
import { CARRIER_LABEL, RETURN_KIND_LABEL, RETURN_STATUS_LABEL, type ReturnItem, type ReturnStatus } from '@/api/types';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/ui';
import { carrierTrackingUrl, daysSince, formatTime, isOverdue, isTrackable, STATUS_TONE, trackingTone } from './status';
import * as s from '@/pages/ReturnsPage.css';

interface ReturnRowProps {
  item: ReturnItem;
  todayString: string;
  productName?: string;
  busy: boolean;
  onStatus: (item: ReturnItem, status: ReturnStatus) => void;
  onEdit: (item: ReturnItem) => void;
  onRefresh: (item: ReturnItem) => void;
}

export function ReturnRow({ item, todayString, productName, busy, onStatus, onEdit, onRefresh }: ReturnRowProps) {
  const [open, setOpen] = useState(false);
  const days = daysSince(item.receivedOn, todayString);
  const overdue = isOverdue(item, todayString);
  const link = item.invoiceNo ? carrierTrackingUrl(item.carrier, item.invoiceNo) : null;
  const t = item.tracking;

  return (
    <li className={s.item}>
      <div className={s.itemMain}>
        <p className={s.itemTitle}>
          {item.recipient}
          <Badge tone={STATUS_TONE[item.status]}>{RETURN_STATUS_LABEL[item.status]}</Badge>
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
        </p>
        {item.address && <p className={s.itemMeta}>{item.address}</p>}
        {item.memo && <p className={s.itemMeta}>메모: {item.memo}</p>}
      </div>

      <div className={s.tracking}>
        {item.invoiceNo ? (
          <>
            <p className={s.invoiceLine}>
              {item.carrier ? CARRIER_LABEL[item.carrier] : '택배사 미지정'} {item.invoiceNo}
              {link && (
                <a className={s.smallLink} href={link} target="_blank" rel="noreferrer">
                  택배사에서 보기
                </a>
              )}
            </p>
            {isTrackable(item) ? (
              <div className={s.trackLine}>
                <Badge tone={trackingTone(t.code)}>{t.label ?? (t.error ? '조회 실패' : '조회 전')}</Badge>
                {t.location && <span>{t.location}</span>}
                {t.time && <span>{formatTime(t.time)}</span>}
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
            {t.checkedAt && <p className={s.itemMeta}>조회 {formatTime(t.checkedAt)}</p>}
            {open && (
              <ol className={s.timeline}>
                {t.events.map((event, index) => (
                  <li key={`${event.time}-${index}`} className={s.timelineItem}>
                    <span className={s.timelineHead}>{event.label}</span>
                    {event.location && ` · ${event.location}`}
                    {event.time && ` · ${formatTime(event.time)}`}
                    {event.description && <div>{event.description}</div>}
                  </li>
                ))}
              </ol>
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
