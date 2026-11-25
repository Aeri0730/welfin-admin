import { useState } from 'react';
import { useDeleteReturn, useUpdateReturns } from '@/api/queries';
import { newInvoice } from '@/api/returns';
import {
  CARRIER_LABEL,
  isKnownChannel,
  RETURN_CHANNEL_LABEL,
  RETURN_KIND_LABEL,
  returnChannel,
  RETURN_STATUS_LABEL,
  type Carrier,
  type ReturnChannel,
  type ReturnItem,
  type ReturnKind,
  type ReturnStatus,
} from '@/api/types';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Dropdown, type DropdownOption } from '@/components/Dropdown';
import { SelectField, TextAreaField, TextField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { Icon } from '@/components/Icon';
import { ErrorBox } from '@/components/ui';
import { digits, formatPhone } from './parse';
import { invoicesOf } from './status';
import * as s from '@/pages/ReturnsPage.css';

const CHANNEL_OPTIONS: Array<DropdownOption<ReturnChannel>> = [
  { value: 'starpack', label: RETURN_CHANNEL_LABEL.starpack },
  { value: 'ezadmin', label: RETURN_CHANNEL_LABEL.ezadmin },
];

export function ReturnEditDialog({ item, onClose }: { item: ReturnItem; onClose: () => void }) {
  const toast = useToast();
  const updateReturns = useUpdateReturns();
  const deleteReturn = useDeleteReturn();

  const [recipient, setRecipient] = useState(item.recipient);
  const [phone, setPhone] = useState(item.phone ?? '');
  const [address, setAddress] = useState(item.address ?? '');
  const [productText, setProductText] = useState(item.productText);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [kind, setKind] = useState<ReturnKind | ''>(item.kind ?? '');
  const [reason, setReason] = useState(item.reason ?? '');
  const [carrier, setCarrier] = useState<Carrier | ''>(item.carrier ?? 'cj');
  /** 반송장 전부, 처음 송장부터 (마지막이 최근 송장) */
  const [invoices, setInvoices] = useState<string[]>(() => {
    const list = invoicesOf(item).map((invoice) => invoice.invoiceNo).reverse();
    return list.length ? list : [''];
  });
  const setInvoiceAt = (index: number, value: string) =>
    setInvoices((prev) => prev.map((v, i) => (i === index ? value : v)));
  const removeInvoiceAt = (index: number) =>
    setInvoices((prev) => (prev.length === 1 ? [''] : prev.filter((_, i) => i !== index)));
  /** 저장돼 있던 송장의 배송조회 결과 (번호로 찾기) */
  const knownInvoices = new Map(invoicesOf(item).map((invoice) => [invoice.invoiceNo, invoice]));
  const [originalInvoiceNo, setOriginalInvoiceNo] = useState(item.originalInvoiceNo ?? '');
  const [status, setStatus] = useState<ReturnStatus>(item.status);
  const [memo, setMemo] = useState(item.memo ?? '');
  /** 접수처는 고르는 즉시 저장 (양품화처럼) */
  const [channel, setChannel] = useState(returnChannel(item));
  const channelSave = useUpdateReturns();
  const [rerequestCount, setRerequestCount] = useState(String(item.rerequestCount + 1));
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** 양품화는 누르는 즉시 저장 (다른 칸 저장과 별개) */
  const [restocked, setRestocked] = useState(item.restocked);
  const restock = useUpdateReturns();

  const toggleRestocked = () => {
    const next = !restocked;
    setRestocked(next);
    restock.mutate([{ current: item, patch: { restocked: next } }], {
      onSuccess: () => toast(next ? '양품화로 표시했어요' : '양품화 표시를 지웠어요'),
      onError: () => setRestocked(!next),
    });
  };

  const changeChannel = (next: string) => {
    const prev = channel;
    setChannel(next);
    channelSave.mutate([{ current: item, patch: { channel: next } }], {
      onSuccess: () => toast(`접수처를 ${isKnownChannel(next) ? RETURN_CHANNEL_LABEL[next] : next}(으)로 바꿨어요`),
      onError: () => setChannel(prev),
    });
  };

  const handleSave = () => {
    const numbers = invoices.map(digits).filter(Boolean);
    const invoice = numbers.length ? numbers[numbers.length - 1] : null;
    // 최근 송장을 뺀 나머지 (최근 것이 앞). 안 바뀌었으면 보내지 않는다 (0025 실행 전에도 다른 칸은 저장되게)
    const previousNumbers = numbers.slice(0, -1).reverse();
    const previousChanged = previousNumbers.join() !== item.previousInvoices.map((i) => i.invoiceNo).join();
    // 송장을 새로 넣었는데 상태를 안 건드렸으면 '회수중'으로 자동 전환(api 쪽에서 처리)
    const statusChanged = status !== item.status;
    updateReturns.mutate(
      [
        {
          current: item,
          patch: {
            recipient: recipient.trim() || item.recipient,
            phone: phone.trim() ? formatPhone(phone) : null,
            address: address.trim() || null,
            productText: productText.trim() || item.productText,
            quantity: Math.max(1, Number(quantity) || 1),
            kind: kind || null,
            reason: reason.trim() || null,
            carrier: carrier || null,
            invoiceNo: invoice,
            previousInvoices: previousChanged
              ? previousNumbers.map((no) => knownInvoices.get(no) ?? newInvoice(no, carrier || null))
              : undefined,
            // 안 바뀌었으면 보내지 않는다 (0022 실행 전에도 다른 칸은 저장되게)
            originalInvoiceNo:
              (digits(originalInvoiceNo) || null) !== item.originalInvoiceNo ? digits(originalInvoiceNo) || null : undefined,
            status: statusChanged ? status : undefined,
            memo: memo.trim() || null,
            rerequestCount: Math.max(1, Number(rerequestCount) || 1) - 1,
          },
        },
      ],
      {
        onSuccess: () => {
          toast('저장했어요');
          onClose();
        },
      },
    );
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteReturn.mutate(item.id, {
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
      title={
        <span className={s.dialogTitle}>
          {item.recipient} 님 회수 건{item.mgmtNo ? ` · ${item.mgmtNo}` : ''}
          <Dropdown
            variant="chip"
            tone={channel === 'ezadmin' ? 'blue' : channel === 'starpack' ? 'grey' : 'purple'}
            ariaLabel="접수처"
            value={channel}
            options={CHANNEL_OPTIONS}
            onChange={changeChannel}
            custom={{ title: '직접 입력', placeholder: '예: 쿠팡, 자사몰', maxLength: 40 }}
          />
        </span>
      }
      headerAction={
        <Button
          size="sm"
          variant={restocked ? 'primary' : 'weak'}
          onClick={toggleRestocked}
          loading={restock.isPending}
          aria-pressed={restocked}
        >
          {restocked ? '✓ 양품화' : '양품화'}
        </Button>
      }
      footer={
        <>
          <Button variant="danger" onClick={handleDelete} loading={deleteReturn.isPending}>
            {confirmDelete ? '정말 삭제' : '삭제'}
          </Button>
          <span style={{ flex: 1 }} />
          <Button variant="weak" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={handleSave} loading={updateReturns.isPending}>
            저장
          </Button>
        </>
      }
    >
      <div className={s.formGrid}>
        <TextField label="수령자" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        <TextField label="연락처" value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} />
        <TextField label="주소" containerClassName={s.full} value={address} onChange={(e) => setAddress(e.target.value)} />
        <TextField label="제품" value={productText} onChange={(e) => setProductText(e.target.value)} />
        <TextField
          label="수량"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
        <SelectField label="반품/교환" value={kind} onChange={(e) => setKind(e.target.value as ReturnKind | '')}>
          <option value="">미지정</option>
          {(Object.keys(RETURN_KIND_LABEL) as ReturnKind[]).map((key) => (
            <option key={key} value={key}>
              {RETURN_KIND_LABEL[key]}
            </option>
          ))}
        </SelectField>
        <TextField label="사유" value={reason} onChange={(e) => setReason(e.target.value)} />
        <SelectField label={invoices.length > 1 ? '택배사 (최근 송장)' : '택배사'} value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)}>
          {(Object.keys(CARRIER_LABEL) as Carrier[]).map((key) => (
            <option key={key} value={key}>
              {CARRIER_LABEL[key]}
            </option>
          ))}
        </SelectField>
        <div className={s.invoiceFields}>
          {invoices.map((value, index) => {
            const isLatest = index === invoices.length - 1;
            const known = knownInvoices.get(digits(value));
            const status = known?.tracking.label ?? (known?.tracking.error ? '조회 실패' : null);
            const hint = [
              isLatest && invoices.length > 1 ? '최근 송장' : null,
              status && `배송조회 ${status}${known?.tracking.location ? ` · ${known.tracking.location}` : ''}`,
              isLatest && carrier === 'direct' ? '직접발송은 자동 배송조회가 안 돼요. 도착하면 회수완료를 눌러주세요' : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <div key={index} className={s.invoiceFieldRow}>
                <TextField
                  containerClassName={s.invoiceFieldGrow}
                  label={invoices.length > 1 ? `${index + 1}번째 송장` : '회수 송장번호'}
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setInvoiceAt(index, e.target.value)}
                  hint={hint || undefined}
                />
                {invoices.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeInvoiceAt(index)} aria-label={`${index + 1}번째 송장 빼기`}>
                    <Icon name="close" size={16} />
                  </Button>
                )}
              </div>
            );
          })}
          {invoices[invoices.length - 1].trim() && (
            <Button
              variant="weak"
              size="sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setInvoices((prev) => [...prev, ''])}
            >
              <Icon name="plus" size={16} />
              재접수 송장 추가
            </Button>
          )}
        </div>
        <TextField
          label="원송장번호"
          inputMode="numeric"
          placeholder="처음 고객에게 보낸 송장"
          value={originalInvoiceNo}
          onChange={(e) => setOriginalInvoiceNo(e.target.value)}
        />
        <SelectField
          label="진행 상태"
          value={status}
          onChange={(e) => setStatus(e.target.value as ReturnStatus)}
        >
          {(Object.keys(RETURN_STATUS_LABEL) as ReturnStatus[]).map((key) => (
            <option key={key} value={key}>
              {RETURN_STATUS_LABEL[key]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="접수 차수"
          inputMode="numeric"
          value={rerequestCount}
          onChange={(e) => setRerequestCount(e.target.value.replace(/\D/g, '').slice(0, 2))}
          hint="1 = 최초 접수, 2 = 재접수. 3차 접수까지 했는데 집화가 안 되면 장기 미수로 보여요"
        />
        <TextAreaField label="메모" containerClassName={s.full} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      {restocked && item.restockedAt && (
        <p style={{ marginTop: 8, fontSize: 13 }}>양품화 처리 {item.restockedAt.slice(0, 10)}</p>
      )}
      {(updateReturns.error || deleteReturn.error || restock.error || channelSave.error) && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox error={updateReturns.error ?? deleteReturn.error ?? restock.error ?? channelSave.error} />
        </div>
      )}
    </Dialog>
  );
}
