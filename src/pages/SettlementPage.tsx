import { useState } from 'react';
import { useDeleteSettlement, useSaveSettlement, useSettlements } from '@/api/queries';
import {
  settlementAutoTotal,
  settlementRemaining,
  settlementTotal,
  type Settlement,
  type SettlementInput,
  type SettlementKind,
} from '@/api/types';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { SelectField, TextField } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Badge, Card, EmptyState, ErrorBox, PageHeader, Skeleton, type BadgeTone } from '@/components/ui';
import { daysSince } from '@/features/returns/status';
import { cx } from '@/lib/cx';
import { downloadCsv } from '@/lib/csv';
import { formatDateLabel, formatNumber, today } from '@/lib/format';
import * as p from './pages.css';
import * as s from './SettlementPage.css';

const COPY: Record<SettlementKind, { title: string; description: string; unitLabel: string; returnLabel: string }> = {
  receivable: {
    title: '판매처 대금 수령',
    description: '웰핀이 판매처에서 받을 돈이에요. 총 금액 = 판매수량 × 공급가 − 반품비 − 반품택배비',
    unitLabel: '공급가',
    returnLabel: '반품비',
  },
  consign: {
    title: '거래처 입금 일정',
    description: '수수료를 떼고 거래처가 웰핀에 입금하는 돈이에요. 총 금액 = 판매수량 × 정산단가 − 반품금액',
    unitLabel: '정산단가',
    returnLabel: '반품금액',
  },
};

type Filter = 'open' | 'done' | 'all';

function statusOf(item: Settlement): { label: string; tone: BadgeTone } {
  const total = settlementTotal(item);
  if (total > 0 && settlementRemaining(item) <= 0) return { label: '입금 완료', tone: 'green' };
  if (!item.dueOn) return { label: '일정 미정', tone: 'grey' };
  const left = -daysSince(item.dueOn, today());
  if (left < 0) return { label: `${-left}일 지남`, tone: 'red' };
  if (left === 0) return { label: '오늘 입금', tone: 'orange' };
  return { label: `D-${left}`, tone: 'blue' };
}

const dateShort = (d: string | null) => (d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}` : '-');

export function SettlementPage({ kind }: { kind: SettlementKind }) {
  const copy = COPY[kind];
  const query = useSettlements(kind);
  const [filter, setFilter] = useState<Filter>('all');
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<Settlement | 'new' | null>(null);

  const all = query.data ?? [];
  const q = keyword.trim().toLowerCase();
  const rows = all
    .filter((item) => (filter === 'all' ? true : filter === 'open' ? settlementRemaining(item) > 0 : settlementRemaining(item) <= 0))
    .filter((item) => !q || [item.agency, item.seller, item.productText, item.memo].some((v) => v?.toLowerCase().includes(q)));

  const sum = (fn: (item: Settlement) => number) => rows.reduce((acc, item) => acc + fn(item), 0);
  const totalSum = sum(settlementTotal);
  const receivedSum = sum((item) => item.receivedAmount);
  const remainingSum = sum((item) => Math.max(0, settlementRemaining(item)));

  const handleDownload = () =>
    downloadCsv(
      `${copy.title}_${today()}.csv`,
      [
        '묶음', '판매자', '제품명', '발주일', '확정 오더', '최종발주수량', '반품수량', '네이버', '웰핀사이트', '최종 판매수량',
        copy.unitLabel, '수수료율(%)', copy.returnLabel, '반품택배비', '총 금액', '업체 입금금액', '잔금', '입금예정일', '일정', '메모',
      ],
      rows.map((item) => [
        item.agency ?? '', item.seller, item.productText, item.orderedOn ?? '', item.orderQty, item.finalOrderQty ?? '',
        item.returnQty, item.naverQty ?? '', item.siteQty ?? '', item.soldQty, item.unitPrice, item.commissionRate ?? '',
        item.returnAmount, item.returnShipping, settlementTotal(item), item.receivedAmount, settlementRemaining(item),
        item.dueOn ?? '', item.scheduleNote ?? '', item.memo ?? '',
      ]),
    );

  return (
    <div className={p.stack}>
      <PageHeader
        title={copy.title}
        description={copy.description}
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
          <p className={p.statLabel}>총 금액</p>
          <p className={p.statValue}>
            {formatNumber(totalSum)}
            <span className={p.statUnit}>원</span>
          </p>
        </Card>
        <Card>
          <p className={p.statLabel}>입금 받은 금액</p>
          <p className={p.statValue}>
            {formatNumber(receivedSum)}
            <span className={p.statUnit}>원</span>
          </p>
        </Card>
        <Card>
          <p className={p.statLabel}>남은 금액</p>
          <p className={cx(p.statValue, remainingSum > 0 && p.minus)}>
            {formatNumber(remainingSum)}
            <span className={p.statUnit}>원</span>
          </p>
        </Card>
      </div>

      <Card>
        <div className={p.filterBar}>
          <SelectField label="보기" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="all">전체</option>
            <option value="open">잔금 남은 건</option>
            <option value="done">입금 완료</option>
          </SelectField>
          <TextField
            label="검색"
            placeholder="판매자 · 제품명 · 메모"
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
            title={all.length === 0 ? '등록된 내역이 없어요' : '조건에 맞는 내역이 없어요'}
            description={all.length === 0 ? "오른쪽 위 '추가'로 넣어주세요" : undefined}
          />
        ) : (
          <>
            <div className={cx(p.tableWrap, p.responsiveOnly.desktop)}>
              <table className={p.table}>
                <thead>
                  <tr>
                    <th className={p.th}>판매자</th>
                    <th className={p.th}>제품명</th>
                    <th className={cx(p.th, p.num)}>확정 오더</th>
                    <th className={cx(p.th, p.num)}>판매수량</th>
                    <th className={cx(p.th, p.num)}>{copy.unitLabel}</th>
                    <th className={cx(p.th, p.num)}>{kind === 'receivable' ? '반품비 · 택배비' : copy.returnLabel}</th>
                    <th className={cx(p.th, p.num)}>총 금액</th>
                    <th className={cx(p.th, p.num)}>입금</th>
                    <th className={cx(p.th, p.num)}>잔금</th>
                    <th className={p.th}>입금예정일</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => {
                    const status = statusOf(item);
                    const remain = settlementRemaining(item);
                    return (
                      <tr key={item.id} className={s.clickRow} onClick={() => setEditing(item)}>
                        <td className={p.td}>
                          <span className={p.strong}>{item.seller}</span>
                          {item.agency && <span className={s.sub}>{item.agency}</span>}
                        </td>
                        <td className={cx(p.td, p.wrapCell)}>
                          {item.productText}
                          {item.memo && <span className={s.sub}>{item.memo}</span>}
                        </td>
                        <td className={cx(p.td, p.num)}>
                          {formatNumber(item.orderQty)}
                          {item.orderedOn && <span className={s.sub}>{dateShort(item.orderedOn)} 발주</span>}
                        </td>
                        <td className={cx(p.td, p.num)}>
                          {formatNumber(item.soldQty)}
                          {kind === 'receivable' && item.returnQty > 0 && <span className={s.sub}>반품 {item.returnQty}</span>}
                          {kind === 'consign' && (item.naverQty !== null || item.siteQty !== null) && (
                            <span className={s.sub}>
                              네이버 {item.naverQty ?? 0} · 사이트 {item.siteQty ?? 0}
                            </span>
                          )}
                        </td>
                        <td className={cx(p.td, p.num)}>
                          {formatNumber(item.unitPrice)}
                          {item.commissionRate !== null && <span className={s.sub}>수수료 {item.commissionRate}%</span>}
                        </td>
                        <td className={cx(p.td, p.num)}>
                          {formatNumber(item.returnAmount)}
                          {item.returnShipping > 0 && <span className={s.sub}>택배 {formatNumber(item.returnShipping)}</span>}
                        </td>
                        <td className={cx(p.td, p.num, p.strong)}>{formatNumber(settlementTotal(item))}</td>
                        <td className={cx(p.td, p.num)}>{formatNumber(item.receivedAmount)}</td>
                        <td className={cx(p.td, p.num, remain > 0 && s.remaining)}>{remain > 0 ? formatNumber(remain) : '-'}</td>
                        <td className={cx(p.td, s.nowrap)}>
                          {item.dueOn ? formatDateLabel(item.dueOn) : '-'}
                          <span className={s.sub}>
                            <Badge tone={status.tone}>{status.label}</Badge>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className={p.responsiveOnly.mobile}>
              {rows.map((item) => {
                const status = statusOf(item);
                const remain = settlementRemaining(item);
                return (
                  <li key={item.id} className={cx(p.listItem, s.clickRow)} onClick={() => setEditing(item)}>
                    <div className={p.listMain}>
                      <p className={p.listTitle}>
                        {item.seller}
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </p>
                      <p className={p.listMeta}>
                        {item.productText} · {formatNumber(item.soldQty)}개
                        {item.dueOn && ` · ${dateShort(item.dueOn)} 입금`}
                      </p>
                    </div>
                    <div className={p.listRight}>
                      <div className={p.strong}>{formatNumber(settlementTotal(item))}원</div>
                      {remain > 0 && <div className={s.remaining}>잔금 {formatNumber(remain)}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {editing && (
        <SettlementDialog kind={kind} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

/* ---------- 추가 · 수정 ---------- */

const digits = (value: string) => value.replace(/\D/g, '').slice(0, 13);
const money = (value: string) => (value ? formatNumber(Number(value)) : '');
const optNum = (value: string) => (value === '' ? null : Number(value));
const str = (value: number | null) => (value === null ? '' : String(value));

function SettlementDialog({ kind, item, onClose }: { kind: SettlementKind; item: Settlement | null; onClose: () => void }) {
  const copy = COPY[kind];
  const toast = useToast();
  const save = useSaveSettlement();
  const remove = useDeleteSettlement();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [f, setF] = useState({
    agency: item?.agency ?? '',
    seller: item?.seller ?? '',
    productText: item?.productText ?? '',
    orderedOn: item?.orderedOn ?? '',
    orderQty: item ? String(item.orderQty) : '',
    finalOrderQty: str(item?.finalOrderQty ?? null),
    returnQty: item?.returnQty ? String(item.returnQty) : '',
    naverQty: str(item?.naverQty ?? null),
    siteQty: str(item?.siteQty ?? null),
    soldQty: item ? String(item.soldQty) : '',
    unitPrice: item ? String(item.unitPrice) : '',
    commissionRate: item?.commissionRate != null ? String(item.commissionRate) : kind === 'consign' ? '25' : '',
    returnAmount: item?.returnAmount ? String(item.returnAmount) : '',
    returnShipping: item?.returnShipping ? String(item.returnShipping) : '',
    totalAmount: str(item?.totalAmount ?? null),
    receivedAmount: item?.receivedAmount ? String(item.receivedAmount) : '',
    dueOn: item?.dueOn ?? '',
    scheduleNote: item?.scheduleNote ?? '',
    memo: item?.memo ?? '',
  });
  type Key = keyof typeof f;
  const set = (key: Key, value: string) => setF((prev) => ({ ...prev, [key]: value }));
  const num = (key: Key) => ({ value: money(f[key]), onChange: (e: { target: { value: string } }) => set(key, digits(e.target.value)), inputMode: 'numeric' as const, placeholder: '0' });

  const auto = settlementAutoTotal({
    soldQty: Number(f.soldQty || 0),
    unitPrice: Number(f.unitPrice || 0),
    returnAmount: Number(f.returnAmount || 0),
    returnShipping: Number(f.returnShipping || 0),
  });
  const total = f.totalAmount === '' ? auto : Number(f.totalAmount);
  const remain = total - Number(f.receivedAmount || 0);

  const handleSave = () => {
    if (!f.seller.trim() || !f.productText.trim()) {
      setError('판매자와 제품명을 적어주세요');
      return;
    }
    setError(null);
    const input: SettlementInput = {
      id: item?.id,
      kind,
      agency: f.agency,
      seller: f.seller,
      productText: f.productText,
      orderedOn: f.orderedOn || null,
      orderQty: Number(f.orderQty || 0),
      finalOrderQty: optNum(f.finalOrderQty),
      returnQty: Number(f.returnQty || 0),
      naverQty: optNum(f.naverQty),
      siteQty: optNum(f.siteQty),
      soldQty: Number(f.soldQty || 0),
      unitPrice: Number(f.unitPrice || 0),
      commissionRate: f.commissionRate === '' ? null : Number(f.commissionRate),
      returnAmount: Number(f.returnAmount || 0),
      returnShipping: Number(f.returnShipping || 0),
      totalAmount: optNum(f.totalAmount),
      receivedAmount: Number(f.receivedAmount || 0),
      dueOn: f.dueOn || null,
      scheduleNote: f.scheduleNote,
      memo: f.memo,
    };
    save.mutate(input, {
      onSuccess: () => {
        toast('저장했어요');
        onClose();
      },
    });
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
      wide
      onClose={onClose}
      title={item ? `${copy.title} 수정` : `${copy.title} 추가`}
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
        <TextField label="판매자" placeholder={kind === 'consign' ? '리뷰머신' : '삼프로TV'} value={f.seller} onChange={(e) => set('seller', e.target.value)} />
        <TextField label="묶음 (선택)" placeholder={kind === 'consign' ? '블랜드펀치' : '리씽크'} value={f.agency} onChange={(e) => set('agency', e.target.value)} />
        <TextField label="발주일" type="date" value={f.orderedOn} onChange={(e) => set('orderedOn', e.target.value)} />
        <TextField label="제품명" value={f.productText} onChange={(e) => set('productText', e.target.value)} containerClassName={s.full} />

        <p className={s.groupTitle}>수량</p>
        <TextField label="확정 오더" {...num('orderQty')} />
        {kind === 'receivable' ? (
          <>
            <TextField label="최종 발주수량" {...num('finalOrderQty')} placeholder="" />
            <TextField label="반품수량" {...num('returnQty')} />
          </>
        ) : (
          <>
            <TextField label="네이버 판매" {...num('naverQty')} placeholder="" />
            <TextField label="웰핀사이트 판매" {...num('siteQty')} placeholder="" />
          </>
        )}
        <TextField label="최종 판매수량" {...num('soldQty')} />

        <p className={s.groupTitle}>금액</p>
        <TextField label={`${copy.unitLabel}(원)`} {...num('unitPrice')} />
        {kind === 'consign' && (
          <TextField
            label="수수료율(%)"
            inputMode="decimal"
            value={f.commissionRate}
            onChange={(e) => set('commissionRate', e.target.value.replace(/[^\d.]/g, '').slice(0, 5))}
          />
        )}
        <TextField label={`${copy.returnLabel}(원)`} {...num('returnAmount')} />
        {kind === 'receivable' && <TextField label="반품택배비(원)" {...num('returnShipping')} />}
        <TextField
          label="총 금액(원)"
          {...num('totalAmount')}
          placeholder={formatNumber(auto)}
          hint={f.totalAmount === '' ? '비워두면 자동 계산' : auto !== total ? `자동 계산 ${formatNumber(auto)}원과 달라요` : undefined}
        />
        <TextField label="업체 입금금액(원)" {...num('receivedAmount')} />

        <p className={s.groupTitle}>일정</p>
        <TextField label={kind === 'consign' ? '최종 정산일' : '입금예정일'} type="date" value={f.dueOn} onChange={(e) => set('dueOn', e.target.value)} />
        <TextField
          label="일정 메모"
          placeholder={kind === 'consign' ? '10/30 최종발송 · 마지막 발주일로 3주 후' : ''}
          value={f.scheduleNote}
          onChange={(e) => set('scheduleNote', e.target.value)}
          containerClassName={s.full}
        />
        <TextField label="메모" placeholder="세금계산서 발행완료 등" value={f.memo} onChange={(e) => set('memo', e.target.value)} containerClassName={s.full} />

        <div className={s.totalBox}>
          <span>
            총 금액 <span className={s.totalStrong}>{formatNumber(total)}원</span>
          </span>
          <span>
            입금 <span className={s.totalStrong}>{formatNumber(Number(f.receivedAmount || 0))}원</span>
          </span>
          <span>
            잔금 <span className={cx(s.totalStrong, remain > 0 && s.remaining)}>{formatNumber(remain)}원</span>
          </span>
        </div>
      </div>
      {(error || save.error || remove.error) && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox error={error ? new Error(error) : (save.error ?? remove.error)} />
        </div>
      )}
    </Dialog>
  );
}
