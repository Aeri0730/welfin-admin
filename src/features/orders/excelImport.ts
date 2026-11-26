import type { OrderRequestInput } from '@/api/orderRequests';
import type { Product } from '@/api/types';

/** 엑셀 양식 칸 (발주처에 보내는 엑셀과 같은 이름, 고유번호는 자동이라 뺌) */
export const IMPORT_HEADER = ['수령자', '우편번호', '주소', '전화번호', '휴대폰', '상세요구사항', '판매처상품명', '상품옵션', '가격', '수량'];

/** 칸 이름 → 같은 뜻으로 쓰는 다른 이름들 */
const COLUMN_NAMES = {
  recipient: ['수령자', '수취인', '받는분', '받는사람', '이름'],
  zipCode: ['우편번호'],
  address: ['주소', '배송지', '수령자주소'],
  phone: ['전화번호', '전화'],
  mobile: ['휴대폰', '휴대폰번호', '핸드폰', '연락처'],
  requestNote: ['상세요구사항', '요구사항', '배송메모', '메모'],
  productName: ['판매처상품명', '상품명', '제품명', '제품'],
  productOption: ['상품옵션', '옵션'],
  price: ['가격', '금액', '단가'],
  quantity: ['수량'],
} as const;

type Field = keyof typeof COLUMN_NAMES;

const squash = (text: string) => text.toLowerCase().replace(/\s+/g, '');

/** 엑셀 한 줄을 읽은 결과. product 가 없으면 화면에서 직접 고른다 */
export interface ImportDraft {
  /** 엑셀 몇 번째 줄 */
  line: number;
  recipient: string;
  zipCode: string;
  address: string;
  phone: string;
  mobile: string;
  requestNote: string;
  /** 엑셀에 적힌 상품명 그대로 */
  productText: string;
  productOption: string;
  price: number | null;
  quantity: number;
  productId: number | null;
}

/** 머리글 줄 찾기: 수령자·주소 칸이 있는 첫 줄 */
function findHeader(table: string[][]): { row: number; cols: Record<Field, number> } | null {
  for (let row = 0; row < Math.min(table.length, 10); row++) {
    const cells = table[row].map((cell) => squash(cell));
    const cols = Object.fromEntries(
      (Object.keys(COLUMN_NAMES) as Field[]).map((field) => [
        field,
        cells.findIndex((cell) => COLUMN_NAMES[field].some((name) => cell === squash(name))),
      ]),
    ) as Record<Field, number>;
    if (cols.recipient >= 0 && cols.address >= 0) return { row, cols };
  }
  return null;
}

/** 엑셀이 숫자로 바꿔 앞자리 0이 빠진 전화번호를 되살린다 (1012345678 → 01012345678) */
function phoneText(value: string): string {
  const text = value.trim();
  if (/^\d{9,10}$/.test(text) && !text.startsWith('0')) return `0${text}`;
  return text;
}

/** 우편번호도 숫자로 바뀌면 앞 0이 빠진다 (6236 → 06236) */
function zipText(value: string): string {
  const text = value.trim();
  return /^\d{4}$/.test(text) ? `0${text}` : text;
}

const toNumber = (value: string) => {
  const digits = value.replace(/[^\d.]/g, '');
  return digits ? Number(digits) : null;
};

/** 엑셀 상품명으로 우리 제품 찾기 (이름 또는 SKU 가 띄어쓰기 무시하고 같을 때) */
export function matchProduct(text: string, products: Product[]): Product | undefined {
  const key = squash(text);
  if (!key) return undefined;
  return products.find((p) => squash(p.name) === key || squash(p.sku) === key);
}

/** 엑셀 표 → 신청 줄들. 머리글을 못 찾으면 null */
export function parseOrderTable(table: string[][], products: Product[]): ImportDraft[] | null {
  const header = findHeader(table);
  if (!header) return null;
  const cell = (row: string[], field: Field) => (header.cols[field] >= 0 ? (row[header.cols[field]] ?? '').trim() : '');

  return table.slice(header.row + 1).flatMap((row, i) => {
    if (row.every((value) => !value.trim())) return [];
    const productText = cell(row, 'productName');
    return [
      {
        line: header.row + i + 2,
        recipient: cell(row, 'recipient'),
        zipCode: zipText(cell(row, 'zipCode')),
        address: cell(row, 'address'),
        phone: phoneText(cell(row, 'phone')),
        mobile: phoneText(cell(row, 'mobile')),
        requestNote: cell(row, 'requestNote'),
        productText,
        productOption: cell(row, 'productOption'),
        price: toNumber(cell(row, 'price')),
        quantity: toNumber(cell(row, 'quantity')) ?? 1,
        productId: matchProduct(productText, products)?.id ?? null,
      },
    ];
  });
}

/** 저장 못 하는 이유 (발주 요청하기 모달과 같은 기준) */
export function draftProblem(d: ImportDraft): string | null {
  if (!d.recipient) return '수령자 없음';
  if (!d.address) return '주소 없음';
  if (!d.phone && !d.mobile) return '연락처 없음';
  if (!d.productId) return '상품을 골라주세요';
  if (!(d.quantity > 0)) return '수량 없음';
  return null;
}

export function toInput(d: ImportDraft, requestedOn: string, products: Product[]): OrderRequestInput {
  const product = products.find((p) => p.id === d.productId);
  return {
    requestedOn,
    recipient: d.recipient,
    zipCode: d.zipCode,
    address: d.address,
    phone: d.phone,
    mobile: d.mobile,
    requestNote: d.requestNote,
    productId: d.productId!,
    productName: product?.name ?? d.productText,
    productOption: d.productOption,
    price: d.price,
    quantity: d.quantity,
  };
}
