import { useMemo, useState } from 'react';
import { useCreateMovements, useProducts, useSaveTransferDetail } from '@/api/queries';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { SearchSelectField, TextAreaField, TextField } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { ErrorBox } from '@/components/ui';
import { formatDateLabel, formatNumber, today } from '@/lib/format';
import { TransferDetailFields, toTransferDetail } from './TransferDetailFields';
import { emptyTransferDraft, parseTransferPaste, type TransferDraft } from './transferPaste';
import * as s from './TransferDialog.css';

/** 시간을 안 적었으면 이 시각에 재고에 반영 */
const DEFAULT_ARRIVAL = '09:00';

/** 입고일·시간이 아직 안 왔으면 예정 건으로 등록 */
function scheduleOf(d: TransferDraft): string | null {
  const at = new Date(`${d.date}T${d.arrivalTime || DEFAULT_ARRIVAL}`);
  return at.getTime() > Date.now() ? at.toISOString() : null;
}

function problemOf(d: TransferDraft): string | null {
  if (!d.date) return '입고일을 넣어주세요';
  if (!d.productId) return d.productText ? `'${d.productText}' 에 맞는 제품을 골라주세요` : '제품을 골라주세요';
  if (!(Number(d.quantity) > 0)) return '수량을 넣어주세요';
  return null;
}

/**
 * 쿠팡 입고 안내를 붙여넣어 창고 이동을 한 번에 등록.
 * 안내 한 덩어리 = 이동 1건. 입고일이 아직 안 왔으면 예정으로 등록된다.
 */
export function TransferPasteDialog({
  fromId,
  toId,
  fromName,
  toName,
  onClose,
}: {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const products = useProducts();
  const createMovements = useCreateMovements();
  const saveDetail = useSaveTransferDetail();

  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<TransferDraft[]>(() => [emptyTransferDraft(today())]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const productOptions = useMemo(
    () =>
      (products.data ?? [])
        .filter((p) => p.isActive)
        .map((p) => ({ value: String(p.id), label: p.name, hint: p.sku })),
    [products.data],
  );

  const handleRead = () => {
    const parsed = parseTransferPaste(text, products.data ?? [], today());
    if (parsed.length === 0) {
      setError(new Error('읽을 수 있는 입고 안내가 없어요. [쿠팡- 센터] 머리말과 입고일정·제품명·수량 줄이 있는지 확인해주세요'));
      return;
    }
    setError(null);
    setSubmitted(false);
    setDrafts(parsed);
  };

  const update = (key: number, patch: Partial<TransferDraft>) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const remove = (key: number) =>
    setDrafts((prev) => (prev.length === 1 ? [emptyTransferDraft(today())] : prev.filter((d) => d.key !== key)));

  const sameWarehouse = fromId && fromId === toId;
  const hasProblem = drafts.some((d) => problemOf(d));

  const handleSave = async () => {
    setSubmitted(true);
    if (!fromId || !toId || sameWarehouse || hasProblem) return;
    setSaving(true);
    setError(null);
    let done = 0;
    let remaining = drafts;
    try {
      for (const d of drafts) {
        const scheduledAt = scheduleOf(d);
        const batchId = await createMovements.mutateAsync({
          type: 'transfer',
          movedOn: d.date,
          scheduledAt,
          fromWarehouseId: Number(fromId),
          toWarehouseId: Number(toId),
          partnerId: null,
          memo: [d.center && `쿠팡 ${d.center} 입고`, d.poNo && `발주 ${d.poNo}`].filter(Boolean).join(' · '),
          items: [{ productId: Number(d.productId), quantity: Number(d.quantity) }],
          allowNegative: false,
        });
        remaining = remaining.filter((r) => r.key !== d.key);
        done += 1;
        try {
          await saveDetail.mutateAsync(toTransferDetail(batchId, d, d.raw || null));
        } catch (e) {
          throw new Error(`이동은 등록됐지만 센터·PLT 같은 상세는 저장하지 못했어요 (${(e as Error).message})`);
        }
      }
      toast(`창고 이동 ${done}건을 등록했어요`);
      onClose();
    } catch (e) {
      // 등록된 건은 목록에서 빼고, 남은 건을 고쳐서 다시 누를 수 있게
      if (done > 0) toast(`${done}건은 등록했어요`);
      setDrafts(remaining.length ? remaining : [emptyTransferDraft(today())]);
      setError(e as Error);
    } finally {
      setSaving(false);
    }
  };

  const total = drafts.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);

  return (
    <Dialog
      open
      wide
      onClose={() => !saving && onClose()}
      title="쿠팡 입고 붙여넣기"
      footer={
        <div className={s.footer}>
          <span className={s.footNote}>
            {fromName} → {toName} · {drafts.length}건 · {formatNumber(total)}개
          </span>
          <span className={s.spacer} />
          <Button variant="weak" onClick={onClose} disabled={saving}>
            닫기
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {drafts.length}건 등록
          </Button>
        </div>
      }
    >
      <div className={s.pasteRow}>
        <TextAreaField
          label="입고 안내"
          placeholder={'[쿠팡- 안성5센터]\n입고일정: 26년 11월 30일 (월)\n제품명 : WELFIN-014 웰핀 에어히터 프로 2\n수량 : 50대\n출고 방법: 밀크런(4PLT)\n…\n\n여러 건을 한 번에 붙여넣어도 돼요'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          spellCheck={false}
        />
        <div className={s.pasteActions}>
          <Button variant="secondary" size="sm" onClick={handleRead} disabled={!text.trim()}>
            읽어서 채우기
          </Button>
        </div>
      </div>

      <div className={s.list}>
        {drafts.map((d, index) => {
          const scheduledAt = scheduleOf(d);
          const problem = submitted ? problemOf(d) : null;
          return (
            <section key={d.key} className={s.entry}>
              <div className={s.entryHead}>
                <span className={s.entryNo}>{index + 1}</span>
                <span>
                  {d.center || '센터 미정'}
                  {d.date && ` · ${formatDateLabel(d.date)}`}
                  {d.date && (scheduledAt ? ' 입고 예정' : ' 입고')}
                </span>
                <span className={s.spacer} />
                <Button variant="ghost" size="sm" onClick={() => remove(d.key)} aria-label={`${index + 1}번 빼기`}>
                  <Icon name="close" size={16} />
                </Button>
              </div>
              <TransferDetailFields
                value={d}
                onChange={(patch) => update(d.key, patch)}
                leading={
                  <>
                    <TextField
                      label="입고일"
                      type="date"
                      value={d.date}
                      onChange={(e) => update(d.key, { date: e.target.value })}
                    />
                    <SearchSelectField
                      label="품목"
                      ariaLabel="품목"
                      containerClassName={s.wide2}
                      value={d.productId}
                      options={productOptions}
                      onChange={(productId) => update(d.key, { productId })}
                      hint={d.productText && !d.productId ? `안내의 제품명: ${d.productText}` : undefined}
                    />
                    <TextField
                      label="수량"
                      inputMode="numeric"
                      value={d.quantity ? formatNumber(Number(d.quantity)) : ''}
                      onChange={(e) => update(d.key, { quantity: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                    />
                  </>
                }
              />
              {problem && <p className={s.problem}>{problem}</p>}
            </section>
          );
        })}
        <Button variant="weak" onClick={() => setDrafts((prev) => [...prev, emptyTransferDraft(today())])}>
          <Icon name="plus" size={16} />한 건 더 직접 입력
        </Button>
      </div>

      {submitted && sameWarehouse && <ErrorBox error={new Error('보내는 창고와 받는 창고가 같아요. 화면의 기본 정보에서 바꿔주세요')} />}
      {error && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox error={error} />
        </div>
      )}
    </Dialog>
  );
}
