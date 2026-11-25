import { useEffect, useMemo, useRef, useState } from 'react';
import type { OrderRequest } from '@/api/orderRequests';
import { useDeleteOrderRequest, useProducts, useSaveOrderRequest } from '@/api/queries';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { SearchSelectField, TextAreaField, TextField } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { ErrorBox } from '@/components/ui';
import { formatPhone } from '@/features/returns/parse';
import { formatNumber, today } from '@/lib/format';
import { loadPostcode, openPostcodePopup } from '@/lib/postcode';
import * as s from './orders.css';

const onlyDigits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max);
const money = (value: string) => (value ? formatNumber(Number(value)) : '');

function initialForm(item: OrderRequest | null) {
  return {
    recipient: item?.recipient ?? '',
    zipCode: item?.zipCode ?? '',
    address: item?.address ?? '',
    phone: item?.phone ?? '',
    mobile: item?.mobile ?? '',
    requestNote: item?.requestNote ?? '',
    productId: item?.productId ? String(item.productId) : '',
    productOption: item?.productOption ?? '',
    price: item?.price === null || item?.price === undefined ? '' : String(item.price),
    quantity: item ? String(item.quantity) : '1',
    invoiceNo: item?.invoiceNo ?? '',
  };
}

type Form = ReturnType<typeof initialForm>;

function problemOf(f: Form): string | null {
  if (!f.recipient.trim()) return '수령자를 적어주세요';
  if (!f.address.trim()) return '주소를 적어주세요';
  if (!f.phone.trim() && !f.mobile.trim()) return '전화번호나 휴대폰 중 하나는 적어주세요';
  if (!f.productId) return '상품을 골라주세요';
  if (!(Number(f.quantity) > 0)) return '수량을 넣어주세요';
  return null;
}

/** 발주 요청하기 / 신청 건 수정 모달. 상품은 우리 제품에서만 고른다 */
export function OrderRequestDialog({ item, onClose }: { item: OrderRequest | null; onClose: () => void }) {
  const toast = useToast();
  const products = useProducts();
  const save = useSaveOrderRequest();
  const remove = useDeleteOrderRequest();
  const [f, setF] = useState(() => initialForm(item));
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<Form>) => setF((prev) => ({ ...prev, ...patch }));
  const [postcodeError, setPostcodeError] = useState<Error | null>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  // 돋보기를 누른 순간 바로 새 창을 열 수 있게 검색 스크립트를 미리 불러 둔다
  useEffect(() => {
    loadPostcode().catch(() => undefined);
  }, []);

  /** 검색으로 고른 주소: 뒤에 상세주소(동·호수)를 이어 쓰도록 주소칸에 커서를 둔다 */
  const handlePostcodeSelect = ({ zipCode, address }: { zipCode: string; address: string }) => {
    set({ zipCode, address: `${address} ` });
    requestAnimationFrame(() => {
      const input = addressRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  };

  const productOptions = useMemo(
    () =>
      (products.data ?? [])
        .filter((p) => p.isActive || String(p.id) === f.productId)
        .map((p) => ({ value: String(p.id), label: p.name, hint: p.sku })),
    [products.data, f.productId],
  );

  const handleSave = () => {
    const message = problemOf(f);
    setProblem(message);
    if (message) return;
    const product = products.data?.find((p) => String(p.id) === f.productId);
    save.mutate(
      {
        id: item?.id,
        requestedOn: item?.requestedOn ?? today(),
        recipient: f.recipient,
        zipCode: f.zipCode,
        address: f.address,
        phone: f.phone.trim() ? formatPhone(f.phone) : '',
        mobile: f.mobile.trim() ? formatPhone(f.mobile) : '',
        requestNote: f.requestNote,
        productId: Number(f.productId),
        // 이름을 바꾸지 않았으면 신청 당시 이름 유지
        productName: product?.name ?? item?.productName ?? '',
        productOption: f.productOption,
        price: f.price ? Number(f.price) : null,
        quantity: Number(f.quantity),
        // 바꾼 경우에만 보낸다
        invoiceNo: f.invoiceNo.trim() !== (item?.invoiceNo ?? '') ? f.invoiceNo : undefined,
      },
      {
        onSuccess: () => {
          toast(item ? '수정했어요' : '발주를 요청했어요');
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

  const error = problem ? new Error(problem) : (postcodeError ?? save.error ?? remove.error);

  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title={item ? '발주 신청 수정' : '발주 요청하기'}
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
            {item ? '저장' : '요청하기'}
          </Button>
        </div>
      }
    >
      <div className={s.formGrid}>
        <p className={s.groupTitle}>받는 분</p>
        <TextField label="수령자" value={f.recipient} onChange={(e) => set({ recipient: e.target.value })} />
        <TextField
          label="전화번호"
          inputMode="tel"
          placeholder="02-000-0000"
          value={f.phone}
          onChange={(e) => set({ phone: e.target.value })}
        />
        <TextField
          label="휴대폰"
          inputMode="tel"
          placeholder="010-0000-0000"
          value={f.mobile}
          onChange={(e) => set({ mobile: e.target.value })}
        />
        <TextField
          label="우편번호"
          inputMode="numeric"
          value={f.zipCode}
          onChange={(e) => set({ zipCode: onlyDigits(e.target.value, 6) })}
          trailing={
            <button
              type="button"
              className={s.iconButton}
              aria-label="우편번호 검색"
              onClick={() => {
                setPostcodeError(null);
                openPostcodePopup(handlePostcodeSelect).catch(setPostcodeError);
              }}
            >
              <Icon name="search" size={18} />
            </button>
          }
        />
        <TextField
          ref={addressRef}
          label="주소"
          placeholder="우편번호 돋보기로 검색한 뒤 동·호수를 이어서 적어주세요"
          containerClassName={s.wide2}
          value={f.address}
          onChange={(e) => set({ address: e.target.value })}
        />

        <p className={s.groupTitle}>상품</p>
        <SearchSelectField
          label="판매처상품명"
          ariaLabel="판매처상품명"
          containerClassName={s.full}
          placeholder="제품 이름이나 품번으로 검색"
          value={f.productId}
          options={productOptions}
          onChange={(productId) => set({ productId })}
          hint="재고에 등록된 제품만 고를 수 있어요"
        />
        <TextField label="상품옵션" value={f.productOption} onChange={(e) => set({ productOption: e.target.value })} />
        <TextField
          label="가격 (원)"
          inputMode="numeric"
          value={money(f.price)}
          onChange={(e) => set({ price: onlyDigits(e.target.value, 12) })}
        />
        <TextField
          label="수량"
          inputMode="numeric"
          value={money(f.quantity)}
          onChange={(e) => set({ quantity: onlyDigits(e.target.value, 6) })}
        />
        <p className={s.groupTitle}>배송</p>
        <TextField
          label="송장번호"
          inputMode="numeric"
          containerClassName={s.wide2}
          placeholder="출고 후 송장번호를 넣어주세요"
          value={f.invoiceNo}
          onChange={(e) => set({ invoiceNo: e.target.value.replace(/[^0-9A-Za-z-]/g, '') })}
        />
        <TextAreaField
          label="상세요구사항"
          containerClassName={s.full}
          rows={3}
          value={f.requestNote}
          onChange={(e) => set({ requestNote: e.target.value })}
        />
      </div>
      {error && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox error={error} />
        </div>
      )}
    </Dialog>
  );
}
