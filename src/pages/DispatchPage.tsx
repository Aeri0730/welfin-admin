import { useState } from 'react';
import { useDeleteDispatch, useDispatches, useSaveDispatch } from '@/api/queries';
import type { Dispatch, DispatchItem } from '@/api/types';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { TextField } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { cx } from '@/lib/cx';
import { downloadCsv } from '@/lib/csv';
import { formatDateLabel, formatNumber, today } from '@/lib/format';
import * as p from './pages.css';
import * as s from './SettlementPage.css';

/** 목록 한 줄 요약: 'A 10개' 또는 'A 외 2종 · 25개' */
function summarize(d: Dispatch) {
  const [first] = d.items;
  if (d.items.length <= 1) return `${first?.productText ?? d.productText} ${formatNumber(d.quantity)}개`;
  return `${first.productText} 외 ${d.items.length - 1}종 · ${formatNumber(d.quantity)}개`;
}

/** 표의 제품 칸: 상품이 여러 개면 줄마다 '이름 × 수량' */
function DispatchProducts({ items }: { items: DispatchItem[] }) {
  if (items.length <= 1) return <>{items[0]?.productText}</>;
  return (
    <>
      {items.map((i, index) => (
        <span key={index} className={s.itemLine}>
          {i.productText} × {formatNumber(i.quantity)}
        </span>
      ))}
    </>
  );
}

/** 스타팩 불량 제품 반품 정보 및 배차비 */
export function DispatchPage() {
  const query = useDispatches();
  const [month, setMonth] = useState('');
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<Dispatch | 'new' | null>(null);

  const all = query.data ?? [];
  const q = keyword.trim().toLowerCase();
  const rows = all
    .filter((d) => !month || (d.shippedOn ?? d.requestedOn ?? '').startsWith(month))
    .filter((d) => !q || [d.partner, d.productText, d.vehicleNo, d.vehicleType, d.memo].some((v) => v?.toLowerCase().includes(q)));

  const fareSum = rows.reduce((sum, d) => sum + d.fare, 0);
  const qtySum = rows.reduce((sum, d) => sum + d.quantity, 0);

  const handleDownload = () =>
    downloadCsv(
      `배차비_${month || today()}.csv`,
      ['출고 요청 날짜', '실 출고 날짜', '거래처', '제품', '수량', '차량번호', '적재량', '운임(VAT 별도)', '메모'],
      rows.map((d) => [d.requestedOn ?? '', d.shippedOn ?? '', d.partner, d.items.map((i) => `${i.productText} × ${i.quantity}`).join(' / '), d.quantity, d.vehicleNo ?? '', d.vehicleType ?? '', d.fare, d.memo ?? '']),
    );

  return (
    <div className={p.stack}>
      <PageHeader
        title="배차비"
        description="스타팩 불량 제품 반품 정보와 배차 운임이에요 (운임은 VAT 별도)"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="weak" size="sm" onClick={handleDownload} disabled={rows.length === 0}>
              <Icon name="download" size={16} />
              엑셀
            </Button>
            <Button size="sm" onClick={() => setEditing('new')}>
              <Icon name="plus" size={16} />
              추가
            </Button>
          </div>
        }
      />

      {query.error && <ErrorBox error={query.error} />}

      <div className={p.cardGrid}>
        <Card>
          <p className={p.statLabel}>운임 합계 (VAT 별도)</p>
          <p className={p.statValue}>
            {formatNumber(fareSum)}
            <span className={p.statUnit}>원</span>
          </p>
        </Card>
        <Card>
          <p className={p.statLabel}>VAT 포함</p>
          <p className={p.statValue}>
            {formatNumber(Math.round(fareSum * 1.1))}
            <span className={p.statUnit}>원</span>
          </p>
        </Card>
        <Card>
          <p className={p.statLabel}>배차 {rows.length}건 · 수량</p>
          <p className={p.statValue}>
            {formatNumber(qtySum)}
            <span className={p.statUnit}>개</span>
          </p>
        </Card>
      </div>

      <Card>
        <div className={p.filterBar}>
          <TextField label="월 (비우면 전체)" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <TextField
            label="검색"
            placeholder="거래처 · 제품 · 차량번호"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            containerClassName={p.filterWide}
          />
        </div>
      </Card>

      <Card>
        {query.isLoading ? (
          <Skeleton height={200} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={all.length === 0 ? '등록된 배차가 없어요' : '조건에 맞는 배차가 없어요'}
            description={all.length === 0 ? "오른쪽 위 '추가'로 넣어주세요" : undefined}
          />
        ) : (
          <>
            <div className={cx(p.tableWrap, p.responsiveOnly.desktop)}>
              <table className={p.table}>
                <thead>
                  <tr>
                    <th className={p.th}>출고 요청</th>
                    <th className={p.th}>실 출고</th>
                    <th className={p.th}>거래처</th>
                    <th className={p.th}>제품</th>
                    <th className={cx(p.th, p.num)}>수량</th>
                    <th className={p.th}>차량번호</th>
                    <th className={p.th}>적재량</th>
                    <th className={cx(p.th, p.num)}>운임 (VAT 별도)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id} className={s.clickRow} onClick={() => setEditing(d)}>
                      <td className={cx(p.td, s.nowrap)}>{d.requestedOn ? formatDateLabel(d.requestedOn) : '-'}</td>
                      <td className={cx(p.td, s.nowrap)}>{d.shippedOn ? formatDateLabel(d.shippedOn) : '-'}</td>
                      <td className={cx(p.td, p.strong)}>{d.partner}</td>
                      <td className={cx(p.td, p.wrapCell, s.productCell)}>
                        <DispatchProducts items={d.items} />
                        {d.memo && <span className={s.sub}>{d.memo}</span>}
                      </td>
                      <td className={cx(p.td, p.num)}>{formatNumber(d.quantity)}</td>
                      <td className={cx(p.td, s.nowrap)}>{d.vehicleNo ?? '-'}</td>
                      <td className={p.td}>{d.vehicleType ?? '-'}</td>
                      <td className={cx(p.td, p.num, p.strong)}>{formatNumber(d.fare)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className={p.responsiveOnly.mobile}>
              {rows.map((d) => (
                <li key={d.id} className={cx(p.listItem, s.clickRow)} onClick={() => setEditing(d)}>
                  <div className={p.listMain}>
                    <p className={p.listTitle}>{d.partner}</p>
                    <p className={p.listMeta}>
                      {d.shippedOn ? formatDateLabel(d.shippedOn) : '출고 전'} · {summarize(d)}
                    </p>
                    <p className={p.listMeta}>{[d.vehicleNo, d.vehicleType].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className={p.listRight}>{formatNumber(d.fare)}원</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {editing && <DispatchDialog item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

const digits = (value: string) => value.replace(/\D/g, '').slice(0, 12);
const money = (value: string) => (value ? formatNumber(Number(value)) : '');

function DispatchDialog({ item, onClose }: { item: Dispatch | null; onClose: () => void }) {
  const toast = useToast();
  const save = useSaveDispatch();
  const remove = useDeleteDispatch();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    requestedOn: item?.requestedOn ?? today(),
    shippedOn: item?.shippedOn ?? '',
    partner: item?.partner ?? '',
    vehicleNo: item?.vehicleNo ?? '',
    vehicleType: item?.vehicleType ?? '',
    fare: item ? String(item.fare) : '',
    memo: item?.memo ?? '',
  });
  const set = (key: keyof typeof f, value: string) => setF((prev) => ({ ...prev, [key]: value }));

  /** 상품 줄 (수량은 입력 중 문자열) */
  const [items, setItems] = useState<Array<{ productText: string; quantity: string }>>(
    item?.items.length
      ? item.items.map((i) => ({ productText: i.productText, quantity: String(i.quantity) }))
      : [{ productText: '', quantity: '' }],
  );
  const setItem = (index: number, patch: Partial<{ productText: string; quantity: string }>) =>
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const addItem = () => setItems((prev) => [...prev, { productText: '', quantity: '' }]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const filled = items.filter((i) => i.productText.trim());
  const totalQty = filled.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

  const handleSave = () => {
    if (!f.partner.trim() || filled.length === 0) {
      setError('거래처와 제품을 적어주세요');
      return;
    }
    setError(null);
    save.mutate(
      {
        id: item?.id,
        requestedOn: f.requestedOn || null,
        shippedOn: f.shippedOn || null,
        partner: f.partner,
        items: filled.map((i) => ({ productText: i.productText, quantity: Number(i.quantity || 0) })),
        vehicleNo: f.vehicleNo,
        vehicleType: f.vehicleType,
        fare: Number(f.fare || 0),
        memo: f.memo,
      },
      {
        onSuccess: () => {
          toast('저장했어요');
          onClose();
        },
      },
    );
  };

  const handleDelete = () => {
    if (!item) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    remove.mutate(item.id, {
      onSuccess: () => {
        toast('삭제했어요');
        onClose();
      },
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={item ? '배차 수정' : '배차 추가'}
      footer={
        <div className={s.footer}>
          {item && (
            <Button variant="danger" onClick={handleDelete} loading={remove.isPending}>
              {confirmDelete ? '정말 삭제' : '삭제'}
            </Button>
          )}
          <span className={s.spacer} />
          <Button variant="weak" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={handleSave} loading={save.isPending}>
            저장
          </Button>
        </div>
      }
    >
      <div className={s.formGrid}>
        <TextField label="출고 요청 날짜" type="date" value={f.requestedOn} onChange={(e) => set('requestedOn', e.target.value)} />
        <TextField label="실 출고 날짜" type="date" value={f.shippedOn} onChange={(e) => set('shippedOn', e.target.value)} />
        <TextField label="거래처" placeholder="양일상사" value={f.partner} onChange={(e) => set('partner', e.target.value)} />

        <div className={s.itemsHead}>
          <span>상품{filled.length > 1 && ` ${filled.length}종 · 합계 ${formatNumber(totalQty)}개`}</span>
          <Button size="sm" variant="weak" onClick={addItem}>
            <Icon name="plus" size={14} />
            상품 추가
          </Button>
        </div>
        <div className={s.itemList}>
          {items.map((row, index) => (
            <div key={index} className={s.itemRow}>
              <TextField
                aria-label={`상품 ${index + 1}`}
                placeholder="WELFIN-009 웰핀 에어팬"
                value={row.productText}
                autoFocus={index > 0 && index === items.length - 1 && !row.productText}
                onChange={(e) => setItem(index, { productText: e.target.value })}
              />
              <TextField
                aria-label={`상품 ${index + 1} 수량`}
                placeholder="수량"
                inputMode="numeric"
                value={money(row.quantity)}
                onChange={(e) => setItem(index, { quantity: digits(e.target.value) })}
              />
              <button
                type="button"
                className={s.itemRemove}
                aria-label={`상품 ${index + 1} 빼기`}
                disabled={items.length === 1}
                onClick={() => removeItem(index)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          ))}
        </div>

        <TextField label="차량번호" placeholder="경기80아1929" value={f.vehicleNo} onChange={(e) => set('vehicleNo', e.target.value)} />
        <TextField label="적재량" placeholder="화성 1T" value={f.vehicleType} onChange={(e) => set('vehicleType', e.target.value)} />
        <TextField label="운임 (VAT 별도, 원)" inputMode="numeric" value={money(f.fare)} onChange={(e) => set('fare', digits(e.target.value))} />
        <TextField label="메모" value={f.memo} onChange={(e) => set('memo', e.target.value)} containerClassName={s.full} />
      </div>
      {(error || save.error || remove.error) && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox error={error ? new Error(error) : (save.error ?? remove.error)} />
        </div>
      )}
    </Dialog>
  );
}
