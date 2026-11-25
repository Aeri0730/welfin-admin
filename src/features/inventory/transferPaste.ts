import type { Product } from '@/api/types';

/** 쿠팡 입고 안내 한 덩어리를 읽은 결과 (모달에서 고칠 수 있게 전부 문자열) */
export interface TransferDraft {
  key: number;
  center: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  arrivalTime: string;
  productText: string;
  productId: string;
  quantity: string;
  poNo: string;
  shipMethod: string;
  pallets: string;
  truckTon: string;
  vehicleCost: string;
  outNo: string;
  vehicleNo: string;
  driver: string;
  address: string;
  raw: string;
}

let nextKey = 1;

export const emptyTransferDraft = (date: string): TransferDraft => ({
  key: nextKey++,
  center: '',
  date,
  arrivalTime: '',
  productText: '',
  productId: '',
  quantity: '',
  poNo: '',
  shipMethod: '',
  pallets: '',
  truckTon: '',
  vehicleCost: '',
  outNo: '',
  vehicleNo: '',
  driver: '',
  address: '',
  raw: '',
});

/** '입고일정: 26년 11월 27일 (금)' · '2026-11-27' · '11/27' → YYYY-MM-DD */
function parseDate(text: string, fallbackYear: number): string {
  const ko = text.match(/(?:(\d{2,4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  const iso = text.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  const short = text.match(/(\d{1,2})\s*[/.]\s*(\d{1,2})/);
  let y: number;
  let m: string;
  let d: string;
  if (ko) {
    y = ko[1] ? Number(ko[1].length === 2 ? `20${ko[1]}` : ko[1]) : fallbackYear;
    [m, d] = [ko[2], ko[3]];
  } else if (iso) {
    [y, m, d] = [Number(iso[1]), iso[2], iso[3]];
  } else if (short) {
    [y, m, d] = [fallbackYear, short[1], short[2]];
  } else {
    return '';
  }
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** '라벨 : 값' 줄에서 값 (라벨 여러 개 중 먼저 맞는 것) */
function field(text: string, labels: string[]): string {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*[:：]\\s*(.+)`));
    if (match) return match[1].trim();
  }
  return '';
}

/** 붙여넣은 제품명에 들어 있는 품번(SKU)이나 이름으로 우리 제품 찾기 */
export function matchProduct(text: string, products: Product[]): Product | undefined {
  const upper = text.toUpperCase();
  const bySku = products
    .filter((p) => p.sku && upper.includes(p.sku.toUpperCase()))
    // WELFIN-01 과 WELFIN-014 처럼 겹치면 긴 품번이 맞다
    .sort((a, b) => b.sku.length - a.sku.length)[0];
  if (bySku) return bySku;
  const normalize = (s: string) => s.toLowerCase().replace(/[\s()[\]]/g, '');
  const target = normalize(text);
  return products.find((p) => normalize(p.name) && target.includes(normalize(p.name)));
}

/** 한 덩어리 → 초안 */
function parseBlock(raw: string, products: Product[], fallbackDate: string): TransferDraft {
  const draft = emptyTransferDraft(fallbackDate);
  draft.raw = raw.trim();

  const header = raw.match(/\[\s*쿠팡\s*[-–—]?\s*([^\]]+)\]/);
  if (header) draft.center = header[1].trim();

  const dateText = field(raw, ['입고\\s*일정', '입고일']);
  if (dateText) draft.date = parseDate(dateText, Number(fallbackDate.slice(0, 4))) || fallbackDate;

  draft.productText = field(raw, ['제품명', '상품명', '품목']);
  const product = draft.productText ? matchProduct(draft.productText, products) : undefined;
  if (product) draft.productId = String(product.id);

  draft.poNo = field(raw, ['쿠팡\\s*발주번호', '발주번호']).replace(/\D/g, '');
  draft.quantity = field(raw, ['수량']).replace(/[^\d]/g, '');

  const method = field(raw, ['출고\\s*방법']);
  if (method) {
    draft.shipMethod = method.replace(/\(.*\)/, '').trim();
    const plt = method.match(/(\d+)\s*PLT/i);
    if (plt) draft.pallets = plt[1];
  }

  draft.address = field(raw, ['입고\\s*주소\\s*및\\s*입고\\s*담당자', '입고\\s*주소']);
  draft.outNo = field(raw, ['스타팩\\s*출고번호', '출고번호']).replace(/\D/g, '');
  draft.vehicleNo = field(raw, ['차량\\s*정보', '차량번호']);
  draft.driver = field(raw, ['기사님\\s*정보', '기사\\s*정보', '기사님', '기사']);

  // '도착예상시간 17:10' 처럼 콜론 없이 쓰기도 해서 라벨 뒤 숫자를 바로 찾는다
  const time = raw.match(/(?:도착\s*예상\s*시간|도착\s*시간|입고\s*시간)\s*[:：]?\s*(\d{1,2})\s*[:시]\s*(\d{2})?/);
  if (time) draft.arrivalTime = `${time[1].padStart(2, '0')}:${time[2] ?? '00'}`;

  const ton = raw.match(/(\d+(?:\.\d+)?)\s*(?:톤|T)\b/i);
  if (ton && !/PLT/i.test(ton[0])) draft.truckTon = `${ton[1]}T`;

  return draft;
}

/**
 * 쿠팡 입고 안내 붙여넣기 → 건별 초안.
 * '[쿠팡- 안성5센터]' 머리말마다 한 건. 머리말이 없으면 통째로 한 건.
 * 한 줄로 이어 붙인 글도 읽을 수 있게 라벨 앞에서 줄을 나눈다.
 */
export function parseTransferPaste(text: string, products: Product[], fallbackDate: string): TransferDraft[] {
  const LABELS = [
    '입고\\s*일정',
    '제품명',
    '쿠팡\\s*발주번호',
    '수량\\s*[:：]',
    '출고\\s*방법',
    '입고\\s*주소',
    '스타팩\\s*출고번호',
    '(?<!스타팩\\s*)출고번호',
    '차량\\s*정보',
    '기사님\\s*정보',
    '도착\\s*예상\\s*시간',
  ];
  const normalized = text
    .replace(/\r/g, '')
    .replace(new RegExp(`\\s+(?=(?:${LABELS.join('|')}))`, 'g'), '\n')
    .replace(/-{3,}/g, '\n');

  const blocks = normalized
    .split(/(?=\[\s*쿠팡)/)
    .map((b) => b.trim())
    .filter((b) => /[가-힣\w]/.test(b));
  return blocks.map((b) => parseBlock(b, products, fallbackDate)).filter((d) => d.productText || d.quantity || d.center);
}
