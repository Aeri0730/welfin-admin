import { useEffect, useMemo, useState } from 'react';
import { useSaveStorageFees, useStorageFees } from '@/api/queries';
import { STORAGE_KIND_LABEL, type StorageFee, type StorageKind } from '@/api/types';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { Card, ErrorBox } from '@/components/ui';
import { addDays, formatDateLabel, formatNumber } from '@/lib/format';
import * as s from './StorageFeeCard.css';

const KINDS: StorageKind[] = ['pallet', 'rack'];
/** 기록이 하나도 없을 때 쓰는 단가 (엑셀 기준, 부가세 포함) */
const DEFAULT_PRICE: Record<StorageKind, number> = { pallet: 550, rack: 165 };

const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 9);
const formatInput = (value: string) => (value ? formatNumber(Number(value)) : '');

type Draft = Record<StorageKind, { quantity: string; unitPrice: string }>;

/** 그날 기록, 없으면 가장 최근 기록(수량·단가)을 그대로 가져온다 */
function initialDraft(fees: StorageFee[], date: string): Draft {
  const result = {} as Draft;
  for (const kind of KINDS) {
    const latest = fees
      .filter((fee) => fee.kind === kind && fee.storedOn <= date)
      .sort((a, b) => b.storedOn.localeCompare(a.storedOn))[0];
    result[kind] = {
      quantity: latest ? String(latest.quantity) : '',
      unitPrice: String(latest ? latest.unitPrice : DEFAULT_PRICE[kind]),
    };
  }
  return result;
}

export function StorageFeeCard({ date, className }: { date: string; className?: string }) {
  const toast = useToast();
  const monthStart = `${date.slice(0, 7)}-01`;
  const lookbackStart = addDays(date, -45);
  const from = lookbackStart < monthStart ? lookbackStart : monthStart;
  const fees = useStorageFees(from, date);
  const save = useSaveStorageFees();

  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    if (fees.data && !draft) setDraft(initialDraft(fees.data, date));
  }, [fees.data, draft, date]);

  const savedToday = (fees.data ?? []).some((fee) => fee.storedOn === date);

  const lines = KINDS.map((kind) => {
    const quantity = Number(draft?.[kind].quantity || 0);
    const unitPrice = Number(draft?.[kind].unitPrice || 0);
    return { kind, quantity, unitPrice, total: quantity * unitPrice };
  });
  const dayTotal = lines.reduce((sum, line) => sum + line.total, 0);

  /** 이번 달 1일 ~ 기준일 누적 (기준일은 입력 중인 값으로 계산) */
  const monthTotal = useMemo(() => {
    const before = (fees.data ?? [])
      .filter((fee) => fee.storedOn >= monthStart && fee.storedOn < date)
      .reduce((sum, fee) => sum + fee.quantity * fee.unitPrice, 0);
    return before + dayTotal;
  }, [fees.data, monthStart, date, dayTotal]);

  const update = (kind: StorageKind, field: 'quantity' | 'unitPrice', value: string) =>
    setDraft((prev) => (prev ? { ...prev, [kind]: { ...prev[kind], [field]: onlyDigits(value) } } : prev));

  const handleSave = () => {
    save.mutate(
      lines.map((line) => ({ storedOn: date, kind: line.kind, quantity: line.quantity, unitPrice: line.unitPrice })),
      { onSuccess: () => toast(`${formatDateLabel(date)} 보관비를 저장했어요`) },
    );
  };

  const month = Number(date.slice(5, 7));

  return (
    <Card className={className}>
      <div className={s.head}>
        <h2 className={s.title}>일일 보관비</h2>
        <span className={s.vat}>{formatDateLabel(date)} · 부가세 포함</span>
      </div>

      {lines.map((line) => (
        <div key={line.kind} className={s.kind}>
          <div className={s.kindHead}>
            {STORAGE_KIND_LABEL[line.kind]}
            <span className={s.kindAmount}>{formatNumber(line.total)}원</span>
          </div>
          <div className={s.inputs}>
            <TextField
              label="수량(EA)"
              inputMode="numeric"
              placeholder="0"
              value={formatInput(draft?.[line.kind].quantity ?? '')}
              onChange={(e) => update(line.kind, 'quantity', e.target.value)}
            />
            <TextField
              label="단가(원)"
              inputMode="numeric"
              placeholder="0"
              value={formatInput(draft?.[line.kind].unitPrice ?? '')}
              onChange={(e) => update(line.kind, 'unitPrice', e.target.value)}
            />
          </div>
        </div>
      ))}

      <div className={s.totals}>
        <div className={s.totalLine}>
          <span>오늘 총 금액</span>
          <span>{formatNumber(dayTotal)}원</span>
        </div>
        <div className={s.totalLine}>
          <span>
            {month}월 누적 ({month}/1 ~ {date.slice(5).replace('-', '/')})
          </span>
          <span className={s.totalStrong}>{formatNumber(monthTotal)}원</span>
        </div>
      </div>

      {(fees.error || save.error) && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox error={fees.error ?? save.error} />
        </div>
      )}
      <div className={s.actions}>
        <Button fullWidth onClick={handleSave} loading={save.isPending} disabled={!draft}>
          {savedToday ? '수정 저장' : '저장'}
        </Button>
      </div>
    </Card>
  );
}
