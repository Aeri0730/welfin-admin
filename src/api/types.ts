/**
 * 화면에서 사용하는 도메인 타입.
 * 백엔드가 Supabase → Spring 으로 바뀌어도 이 타입은 유지한다.
 */

export type Role = 'admin' | 'staff';

export interface Profile {
  id: string;
  name: string;
  role: Role;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
}

export interface Partner {
  id: number;
  name: string;
  memo: string | null;
  isActive: boolean;
}

/** 판매처 (쿠팡, 스마트스토어 등). 출고 때 고른다 */
export interface SalesChannel {
  id: number;
  name: string;
  memo: string | null;
  isActive: boolean;
}

/** 제품 사용 계절 */
export type ProductCategory = 'winter' | 'summer' | 'etc';

/** 이 순서대로 정렬·표시한다 */
export const PRODUCT_CATEGORY_LABEL: Record<ProductCategory, string> = {
  winter: '겨울',
  summer: '여름',
  etc: '4계절',
};

export const PRODUCT_CATEGORY_ORDER = Object.keys(PRODUCT_CATEGORY_LABEL) as ProductCategory[];

export interface Product {
  id: number;
  sku: string;
  name: string;
  safetyStock: number;
  isActive: boolean;
  /** 입고단가(원). 재고금액 = 수량 × 입고단가 */
  unitCost: number;
  category: ProductCategory;
  /** 매출 탭 '주요 제품 재고' 순서. null 이면 안 보임 */
  reportOrder: number | null;
  /** 이지어드민 상품코드 (보관비 엑셀) */
  ezadminCode: string | null;
  /** 팔레트 1개 / 경량랙 1칸에 들어가는 수량. 0 또는 null 이면 그 방식으로 보관하지 않음 */
  palletCapacity: number | null;
  rackCapacity: number | null;
  /** 보관비 계산에서 제외 (가입고 등) */
  storageExempt: boolean;
}

export interface StockLevel {
  productId: number;
  warehouseId: number;
  quantity: number;
}

export type MovementType = 'inbound' | 'outbound' | 'transfer' | 'adjust';

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  inbound: '입고',
  outbound: '출고',
  transfer: '이동',
  adjust: '조정',
};

export interface Movement {
  id: number;
  batchId: string;
  type: MovementType;
  movedOn: string;
  quantity: number;
  memo: string | null;
  createdAt: string;
  product: { id: number; name: string; sku: string };
  fromWarehouse: { id: number; name: string } | null;
  toWarehouse: { id: number; name: string } | null;
  partner: { id: number; name: string } | null;
  /** 출고한 판매처 (고르지 않았으면 null) */
  salesChannel: { id: number; name: string } | null;
  createdBy: string;
  /** 예정 시각 (비어 있으면 즉시 반영된 기록) */
  scheduledAt: string | null;
}

/** 아직 예정 시각이 안 돼서 재고에 반영되지 않은 기록인지 */
export const isPending = (m: Pick<Movement, 'scheduledAt'>, now = Date.now()) =>
  Boolean(m.scheduledAt && new Date(m.scheduledAt).getTime() > now);

export interface MovementFilter {
  from: string;
  to: string;
  type?: MovementType;
  warehouseId?: number;
}

export interface CreateMovementsInput {
  type: MovementType;
  movedOn: string;
  fromWarehouseId: number | null;
  toWarehouseId: number | null;
  partnerId: number | null;
  /** 출고 판매처 (선택) */
  salesChannelId?: number | null;
  memo: string;
  items: Array<{ productId: number; quantity: number }>;
  /** 재고가 부족해도 저장 (사용자가 확인 모달에서 '네' 를 누른 경우) */
  allowNegative?: boolean;
  /** 예정 시각 (ISO). 미래면 그 시각 이후에 재고에 반영 */
  scheduledAt?: string | null;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  safetyStock: number;
  unitCost: number;
  category: ProductCategory;
}

export interface ProductPatch {
  name?: string;
  safetyStock?: number;
  unitCost?: number;
  category?: ProductCategory;
  reportOrder?: number | null;
  ezadminCode?: string | null;
  palletCapacity?: number | null;
  rackCapacity?: number | null;
  storageExempt?: boolean;
}

export interface CreatePartnerInput {
  name: string;
  memo: string;
}

/* ------------------------------------------------------------------ */
/* 반품·교환 회수                                                        */
/* ------------------------------------------------------------------ */

export type ReturnStatus = 'requested' | 'in_transit' | 'collected' | 'inspected';
export type ReturnKind = 'return' | 'exchange';
export type Carrier = 'cj' | 'lotte' | 'direct';

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: '송장 미등록',
  in_transit: '회수중',
  collected: '회수완료',
  inspected: '검수완료',
};

export const RETURN_KIND_LABEL: Record<ReturnKind, string> = {
  return: '반품',
  exchange: '교환',
};

/** 관리번호가 있으면 이지어드민, 없으면 스타팩 접수 */
export type ReturnChannel = 'ezadmin' | 'starpack';

export const RETURN_CHANNEL_LABEL: Record<ReturnChannel, string> = {
  ezadmin: '이지어드민',
  starpack: '스타팩',
};

/** 접수처 값: 직접 지정한 값이 있으면 그것, 없으면 관리번호 유무로 판단 ('ezadmin' | 'starpack' | 직접 입력한 이름) */
export const returnChannel = (item: { mgmtNo: string | null; channel: string | null }): string =>
  item.channel?.trim() || (item.mgmtNo ? 'ezadmin' : 'starpack');

export const isKnownChannel = (value: string): value is ReturnChannel => value in RETURN_CHANNEL_LABEL;

/** 화면에 보일 접수처 이름 */
export const returnChannelLabel = (item: { mgmtNo: string | null; channel: string | null }): string => {
  const value = returnChannel(item);
  return isKnownChannel(value) ? RETURN_CHANNEL_LABEL[value] : value;
};

export const CARRIER_LABEL: Record<Carrier, string> = {
  cj: 'CJ대한통운',
  lotte: '롯데택배',
  direct: '직접발송',
};

export interface TrackingEvent {
  time: string | null;
  code: string;
  label: string;
  location: string | null;
  description: string | null;
}

/** 회수 반송장 한 개 (배송조회 결과 포함) */
export interface ReturnInvoice {
  carrier: Carrier | null;
  invoiceNo: string;
  enteredAt: string | null;
  tracking: {
    code: string | null;
    label: string | null;
    location: string | null;
    time: string | null;
    checkedAt: string | null;
    error: string | null;
  };
}

export interface ReturnItem {
  id: number;
  receivedOn: string;
  sourceFormat: 1 | 2;
  mgmtNo: string | null;
  orderNo: string | null;
  orderedAt: string | null;
  shippedAt: string | null;
  recipient: string;
  phone: string | null;
  address: string | null;
  productText: string;
  sku: string | null;
  quantity: number;
  kind: ReturnKind | null;
  reason: string | null;
  carrier: Carrier | null;
  invoiceNo: string | null;
  status: ReturnStatus;
  collectedAt: string | null;
  inspectedAt: string | null;
  tracking: {
    code: string | null;
    label: string | null;
    location: string | null;
    time: string | null;
    events: TrackingEvent[];
    checkedAt: string | null;
    error: string | null;
  };
  memo: string | null;
  /** 재접수 차수 (0 = 최초 접수) */
  rerequestCount: number;
  /** 양품화 여부 */
  restocked: boolean;
  restockedAt: string | null;
  /** 직접 지정한 접수처 (null 이면 관리번호 유무로 판단) */
  channel: string | null;
  /** 원송장번호 (처음 보낸 출고 송장, 참고용) */
  originalInvoiceNo: string | null;
  /** 재접수 전에 쓰던 반송장들 (최근 것이 앞). 지금 송장은 invoiceNo·tracking */
  previousInvoices: ReturnInvoice[];
  createdAt: string;
}

/** 접수 등록 시 한 줄 */
export interface NewReturnInput {
  receivedOn: string;
  sourceFormat: 1 | 2;
  mgmtNo: string | null;
  orderNo: string | null;
  orderedAt: string | null;
  shippedAt: string | null;
  recipient: string;
  phone: string | null;
  address: string | null;
  productText: string;
  sku: string | null;
  quantity: number;
  kind: ReturnKind | null;
  reason: string | null;
}

export interface ReturnPatch {
  recipient?: string;
  phone?: string | null;
  address?: string | null;
  productText?: string;
  quantity?: number;
  kind?: ReturnKind | null;
  reason?: string | null;
  carrier?: Carrier | null;
  invoiceNo?: string | null;
  status?: ReturnStatus;
  memo?: string | null;
  rerequestCount?: number;
  restocked?: boolean;
  /** null = 관리번호 유무로 자동 판단 */
  channel?: string | null;
  originalInvoiceNo?: string | null;
  /** 이전 반송장 목록 통째로 바꾸기 (재접수로 새 송장이 나오면 지금 송장을 앞에 넣어서 보낸다) */
  previousInvoices?: ReturnInvoice[];
}

/* ---------- 매출 ---------- */

export interface DailySales {
  salesOn: string;
  warehouseId: number;
  amount: number;
  quantity: number;
  memo: string | null;
}

/** 창고 밖 매출 (양일상사 · 유니맥스 등 업체 직배송). 매출 실적에만 더해진다 */
export interface SalesExtra {
  salesOn: string;
  name: string;
  amount: number;
  quantity: number;
}

/** as_of 날짜까지의 누적 매출 (엑셀에서 옮겨온 값) */
/** 그날까지의 이번 달 실적 (직접 입력) */
export interface SalesActual {
  actualOn: string;
  amount: number;
}

export interface SalesBaseline {
  amount: number;
  asOf: string;
}

export interface SalesTarget {
  /** '2026'(연간) 또는 '2026-11'(월간) */
  period: string;
  amount: number;
}

export type StorageKind = 'pallet' | 'rack';

export const STORAGE_KIND_LABEL: Record<StorageKind, string> = {
  pallet: '팔레트',
  rack: '경량랙',
};

export interface StorageFee {
  storedOn: string;
  kind: StorageKind;
  quantity: number;
  /** 부가세 포함 단가(원) */
  unitPrice: number;
}

/** 하루 보관비 (팔레트·경량랙 수량·단가 + 업체가 알려준 금액·메모) */
export interface StorageDay {
  storedOn: string;
  palletQty: number;
  palletPrice: number;
  rackQty: number;
  rackPrice: number;
  /** 업체가 알려준 일일금액 / 누적금액 (비교용) */
  reportedDaily: number | null;
  reportedTotal: number | null;
  /** 메모 (한 줄 = 메모지 한 장) */
  memo: string | null;
  /** 팔레트·경량랙 수량이 입력된 날인지 (메모만 있는 날은 false) */
  recorded: boolean;
}

/** 보관비 저장 시점의 제품별 세부 내역 (스타팩 재고 기준) */
export interface StorageItem {
  storedOn: string;
  productId: number;
  stock: number;
  palletCapacity: number | null;
  rackCapacity: number | null;
  pallets: number;
  racks: number;
  amount: number;
  exempt: boolean;
}

/** 팔레트 × 단가 + 경량랙 × 단가 */
export const storageDayAmount = (day: Pick<StorageDay, 'palletQty' | 'palletPrice' | 'rackQty' | 'rackPrice'>) =>
  day.palletQty * day.palletPrice + day.rackQty * day.rackPrice;

/* ---------- 정산 ---------- */

/** receivable: 판매처 대금 수령 / consign: 거래처 입금 일정 (수수료 정산) */
export type SettlementKind = 'receivable' | 'consign';

export interface Settlement {
  id: number;
  kind: SettlementKind;
  /** 리씽크 · 블랜드펀치 같은 묶음 */
  agency: string | null;
  seller: string;
  productText: string;
  orderedOn: string | null;
  orderQty: number;
  finalOrderQty: number | null;
  returnQty: number;
  naverQty: number | null;
  siteQty: number | null;
  soldQty: number;
  /** 공급가 (대금 수령) / 수수료 뗀 정산단가 (거래처 입금) */
  unitPrice: number;
  commissionRate: number | null;
  returnAmount: number;
  returnShipping: number;
  /** null 이면 자동 계산 */
  totalAmount: number | null;
  receivedAmount: number;
  dueOn: string | null;
  scheduleNote: string | null;
  memo: string | null;
}

export type SettlementInput = Omit<Settlement, 'id'> & { id?: number };

/** 판매수량 × 단가 − 반품비 − 반품택배비 */
export const settlementAutoTotal = (s: Pick<Settlement, 'soldQty' | 'unitPrice' | 'returnAmount' | 'returnShipping'>) =>
  Math.max(0, s.soldQty * s.unitPrice - s.returnAmount - s.returnShipping);

export const settlementTotal = (s: Settlement) => s.totalAmount ?? settlementAutoTotal(s);
export const settlementRemaining = (s: Settlement) => settlementTotal(s) - s.receivedAmount;

/** 스타팩 불량 제품 반품 · 배차비 */
/** 배차 1건에 실린 상품 한 줄 */
export interface DispatchItem {
  productText: string;
  quantity: number;
}

export interface Dispatch {
  id: number;
  requestedOn: string | null;
  shippedOn: string | null;
  partner: string;
  /** 상품 이름 모음 (검색·엑셀용 요약) */
  productText: string;
  /** 수량 합계 */
  quantity: number;
  /** 실린 상품들 (예전 건은 productText·quantity 한 줄) */
  items: DispatchItem[];
  vehicleNo: string | null;
  vehicleType: string | null;
  /** 운임 (VAT 별도) */
  fare: number;
  memo: string | null;
}

export type DispatchInput = Omit<Dispatch, 'id' | 'productText' | 'quantity'> & { id?: number };
