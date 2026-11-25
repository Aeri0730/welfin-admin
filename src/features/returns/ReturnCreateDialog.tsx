import { useState } from 'react';
import { useCreateReturn } from '@/api/queries';
import {
  CARRIER_LABEL,
  RETURN_CHANNEL_LABEL,
  RETURN_KIND_LABEL,
  RETURN_STATUS_LABEL,
  type Carrier,
  type ReturnChannel,
  type ReturnKind,
  type ReturnStatus,
} from '@/api/types';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Dropdown, type DropdownOption } from '@/components/Dropdown';
import { SelectField, TextAreaField, TextField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { ErrorBox } from '@/components/ui';
import { today } from '@/lib/format';
import { digits, findSku, formatPhone } from './parse';
import * as s from '@/pages/ReturnsPage.css';

const CHANNEL_OPTIONS: Array<DropdownOption<ReturnChannel>> = [
  { value: 'starpack', label: RETURN_CHANNEL_LABEL.starpack },
  { value: 'ezadmin', label: RETURN_CHANNEL_LABEL.ezadmin },
];

/** 회수 접수 한 건을 직접 입력 (수정 모달과 같은 모양) */
export function ReturnCreateDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const createReturn = useCreateReturn();

  const [channel, setChannel] = useState<string>('starpack');
  const [receivedOn, setReceivedOn] = useState(today());
  const [mgmtNo, setMgmtNo] = useState('');
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [productText, setProductText] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [kind, setKind] = useState<ReturnKind | ''>('');
  const [reason, setReason] = useState('');
  const [carrier, setCarrier] = useState<Carrier>('cj');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [originalInvoiceNo, setOriginalInvoiceNo] = useState('');
  const [status, setStatus] = useState<ReturnStatus>('requested');
  const [memo, setMemo] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const missing = !recipient.trim() ? '수령자를 입력해주세요' : !productText.trim() ? '제품을 입력해주세요' : null;

  const handleSave = () => {
    setSubmitted(true);
    if (missing) return;
    const product = productText.trim();
    createReturn.mutate(
      {
        input: {
          receivedOn,
          sourceFormat: mgmtNo.trim() ? 1 : 2,
          mgmtNo: mgmtNo.trim() || null,
          orderNo: null,
          orderedAt: null,
          shippedAt: null,
          recipient: recipient.trim(),
          phone: phone.trim() ? formatPhone(phone) : null,
          address: address.trim() || null,
          productText: product,
          sku: findSku(product),
          quantity: Math.max(1, Number(quantity) || 1),
          kind: kind || null,
          reason: reason.trim() || null,
        },
        patch: {
          channel,
          carrier,
          invoiceNo: digits(invoiceNo) || null,
          originalInvoiceNo: digits(originalInvoiceNo) || undefined,
          // 송장만 넣고 상태를 안 건드렸으면 '회수중'으로 자동 전환(api 쪽에서 처리)
          status: status !== 'requested' ? status : undefined,
          memo: memo.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast(`${recipient.trim()} 님 회수 건을 접수했어요`);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog
      open
      wide
      onClose={() => !createReturn.isPending && onClose()}
      title={
        <span className={s.dialogTitle}>
          회수 접수 개별 입력
          <Dropdown
            variant="chip"
            tone={channel === 'ezadmin' ? 'blue' : channel === 'starpack' ? 'grey' : 'purple'}
            ariaLabel="접수처"
            value={channel}
            options={CHANNEL_OPTIONS}
            onChange={setChannel}
            custom={{ title: '직접 입력', placeholder: '예: 쿠팡, 자사몰', maxLength: 40 }}
          />
        </span>
      }
      footer={
        <>
          <span style={{ flex: 1 }} />
          <Button variant="weak" onClick={onClose} disabled={createReturn.isPending}>
            닫기
          </Button>
          <Button onClick={handleSave} loading={createReturn.isPending}>
            접수
          </Button>
        </>
      }
    >
      <div className={s.formGrid}>
        <TextField
          label="접수일"
          type="date"
          value={receivedOn}
          max={today()}
          onChange={(e) => e.target.value && setReceivedOn(e.target.value)}
        />
        <TextField
          label="관리번호 (선택)"
          placeholder="이지어드민 관리번호"
          value={mgmtNo}
          onChange={(e) => setMgmtNo(e.target.value)}
        />
        <TextField label="수령자" value={recipient} autoFocus onChange={(e) => setRecipient(e.target.value)} />
        <TextField label="연락처" value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} />
        <TextField label="주소" containerClassName={s.full} value={address} onChange={(e) => setAddress(e.target.value)} />
        <TextField
          label="제품"
          placeholder="예: WELFIN-014 에어히터"
          value={productText}
          onChange={(e) => setProductText(e.target.value)}
        />
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
        <SelectField label="택배사" value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)}>
          {(Object.keys(CARRIER_LABEL) as Carrier[]).map((key) => (
            <option key={key} value={key}>
              {CARRIER_LABEL[key]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="회수 송장번호 (선택)"
          inputMode="numeric"
          value={invoiceNo}
          onChange={(e) => setInvoiceNo(e.target.value)}
          hint={carrier === 'direct' ? '직접발송은 자동 배송조회가 안 돼요. 도착하면 회수완료를 눌러주세요' : undefined}
        />
        <TextField
          label="원송장번호 (선택)"
          inputMode="numeric"
          placeholder="처음 고객에게 보낸 송장"
          value={originalInvoiceNo}
          onChange={(e) => setOriginalInvoiceNo(e.target.value)}
        />
        <SelectField
          label="진행 상태"
          value={status}
          onChange={(e) => setStatus(e.target.value as ReturnStatus)}
          hint="송장을 넣으면 따로 고르지 않아도 '회수중'으로 바뀌어요"
        >
          {(Object.keys(RETURN_STATUS_LABEL) as ReturnStatus[]).map((key) => (
            <option key={key} value={key}>
              {RETURN_STATUS_LABEL[key]}
            </option>
          ))}
        </SelectField>
        <TextAreaField label="메모" containerClassName={s.full} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      {((submitted && missing) || createReturn.error) && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox error={createReturn.error ?? new Error(missing ?? '')} />
        </div>
      )}
    </Dialog>
  );
}
