import { useState } from 'react';
import { useDeleteReturn, useUpdateReturns } from '@/api/queries';
import {
  CARRIER_LABEL,
  RETURN_KIND_LABEL,
  RETURN_STATUS_LABEL,
  type Carrier,
  type ReturnItem,
  type ReturnKind,
  type ReturnStatus,
} from '@/api/types';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { SelectField, TextAreaField, TextField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { ErrorBox } from '@/components/ui';
import { digits, formatPhone } from './parse';
import * as s from '@/pages/ReturnsPage.css';

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
  const [invoiceNo, setInvoiceNo] = useState(item.invoiceNo ?? '');
  const [status, setStatus] = useState<ReturnStatus>(item.status);
  const [memo, setMemo] = useState(item.memo ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    const invoice = digits(invoiceNo) || null;
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
            status: statusChanged ? status : undefined,
            memo: memo.trim() || null,
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
      title={`${item.recipient} 님 회수 건${item.mgmtNo ? ` · ${item.mgmtNo}` : ''}`}
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
        <SelectField label="택배사" value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)}>
          {(Object.keys(CARRIER_LABEL) as Carrier[]).map((key) => (
            <option key={key} value={key}>
              {CARRIER_LABEL[key]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="회수 송장번호"
          inputMode="numeric"
          value={invoiceNo}
          onChange={(e) => setInvoiceNo(e.target.value)}
          hint={carrier === 'direct' ? '직접발송은 자동 배송조회가 안 돼요. 도착하면 회수완료를 눌러주세요' : undefined}
        />
        <SelectField
          label="진행 상태"
          containerClassName={s.full}
          value={status}
          onChange={(e) => setStatus(e.target.value as ReturnStatus)}
        >
          {(Object.keys(RETURN_STATUS_LABEL) as ReturnStatus[]).map((key) => (
            <option key={key} value={key}>
              {RETURN_STATUS_LABEL[key]}
            </option>
          ))}
        </SelectField>
        <TextAreaField label="메모" containerClassName={s.full} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      {(updateReturns.error || deleteReturn.error) && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox error={updateReturns.error ?? deleteReturn.error} />
        </div>
      )}
    </Dialog>
  );
}
