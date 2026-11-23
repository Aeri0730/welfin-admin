import type { Product } from '@/api/types';
import { readJson, writeJson } from '@/lib/storage';
import { sumBy } from '@/lib/sum';

/**
 * 사이트 재고 비교 — 셀메이트·이카운트·이지어드민에서 받은 재고 엑셀을 읽어
 * 우리 재고와 한 표로 비교한다.
 *
 * 각 사이트 엑셀은 열 위치가 조금씩 달라서, 머리글 이름으로 상품명·수량 열을 찾는다.
 * 못 찾으면 화면에서 직접 고르게 한다.
 */

export type SiteKey = 'sellmate' | 'ecount' | 'ezadmin';

export const SITE_KEYS: SiteKey[] = ['sellmate', 'ecount', 'ezadmin'];

interface SiteConfig {
  label: string;
  /** 앞에 있을수록 우선. 머리글이 정확히 같으면 먼저, 아니면 포함되는 것 */
  nameHeaders: string[];
  qtyHeaders: string[];
  codeHeaders: string[];
  /** 이 이름으로 시작하는 줄은 재고가 아니라서 뺀다 */
  exclude?: RegExp;
}

export const SITES: Record<SiteKey, SiteConfig> = {
  sellmate: {
    label: '셀메이트',
    nameHeaders: ['상품명', '품목명'],
    qtyHeaders: ['정상재고', '현재고', '현재재고', '재고수량', '재고'],
    codeHeaders: ['상품코드'],
  },
  ecount: {
    label: '이카운트',
    nameHeaders: ['품목명[규격]', '품목명', '상품명'],
    qtyHeaders: ['재고수량', '현재고', '재고'],
    codeHeaders: ['품목코드'],
  },
  ezadmin: {
    label: '이지어드민',
    nameHeaders: ['상품명', '품목명'],
    qtyHeaders: ['현재재고', '정상재고', '재고수량', '재고'],
    codeHeaders: ['상품코드'],
    // 포장 박스·임시 출고용 가상 상품
    exclude: /^(#?스타팩박스|기타발송건|기타출고)/,
  },
};

/** 셀 값을 문자열 표로 받은 시트 */
export type Table = string[][];

export interface ColumnPick {
  headerRow: number;
  nameCol: number;
  qtyCol: number;
  codeCol: number | null;
}

export interface SiteRow {
  /** 사이트에 적힌 상품명 그대로 */
  name: string;
  code: string | null;
  quantity: number;
  /** 표에서 직접 고친 경우 파일에 있던 원래 값 (새로 넣은 줄은 null) */
  original?: number | null;
}

export interface SiteData {
  fileName: string;
  uploadedAt: string;
  rows: SiteRow[];
}

const squash = (value: string) => value.replace(/\s+/g, '');

function findCol(header: string[], candidates: string[], exclude: number[] = []): number {
  const cells = header.map(squash);
  for (const c of candidates) {
    const i = cells.findIndex((cell, idx) => cell === c && !exclude.includes(idx));
    if (i >= 0) return i;
  }
  for (const c of candidates) {
    const i = cells.findIndex((cell, idx) => cell.includes(c) && !exclude.includes(idx));
    if (i >= 0) return i;
  }
  return -1;
}

/** 앞 20줄에서 머리글 줄과 상품명·수량 열을 찾는다. 못 찾으면 null */
export function detectColumns(table: Table, site: SiteKey): ColumnPick | null {
  const config = SITES[site];
  for (let r = 0; r < Math.min(table.length, 20); r += 1) {
    const header = table[r];
    const nameCol = findCol(header, config.nameHeaders);
    if (nameCol < 0) continue;
    const qtyCol = findCol(header, config.qtyHeaders, [nameCol]);
    if (qtyCol < 0) continue;
    const codeCol = findCol(header, config.codeHeaders, [nameCol, qtyCol]);
    return { headerRow: r, nameCol, qtyCol, codeCol: codeCol >= 0 ? codeCol : null };
  }
  return null;
}

export function parseQuantity(value: string): number | null {
  const text = value.replace(/[,\s개]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Math.round(Number(text));
}

/** 머리글 아래 줄을 읽어 상품별 수량으로 (같은 상품명은 합산, 합계 줄은 제외) */
export function extractRows(table: Table, pick: ColumnPick, site: SiteKey): SiteRow[] {
  const exclude = SITES[site].exclude;
  const map = new Map<string, SiteRow>();
  for (const row of table.slice(pick.headerRow + 1)) {
    const name = (row[pick.nameCol] ?? '').trim();
    if (!name || /^(합계|총계|소계|총합계)$/.test(squash(name))) continue;
    if (exclude?.test(squash(name))) continue;
    const quantity = parseQuantity(row[pick.qtyCol] ?? '');
    if (quantity === null) continue;
    const code = pick.codeCol !== null ? (row[pick.codeCol] ?? '').trim() || null : null;
    const prev = map.get(name);
    if (prev) prev.quantity += quantity;
    else map.set(name, { name, code, quantity });
  }
  return [...map.values()];
}

/** 엑셀에서 복사해 붙여넣은 글 → 표 */
export function tableFromPaste(text: string): Table {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => line.split('\t').map((cell) => cell.trim()));
}

/** 파일(.xlsx .xls .csv) → 시트마다 표. 엑셀 라이브러리는 필요할 때만 불러온다 */
export async function tablesFromFile(file: File): Promise<Table[]> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  return workbook.SheetNames.map((sheetName) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      blankrows: false,
      raw: true,
    });
    return rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))));
  });
}

/**
 * 비교용 이름 정리.
 * "2. (스타팩) WELFIN-015 에어히터" / "[부품] WELFIN-015 에어히터" → "welfin015에어히터"
 */
export function normalizeName(value: string): string {
  let text = value.trim();
  for (;;) {
    const next = text.replace(/^(\d+\s*[.)]\s*|\([^)]*\)\s*|\[[^\]]*\]\s*)/, '');
    if (next === text) break;
    text = next;
  }
  return text.toLowerCase().replace(/[\s_\-()[\]{}.,·/~:'"]/g, '');
}

/** 사이트 상품명 → 우리 제품 직접 연결 (사이트별, 정리된 이름 기준). null 은 '연결 안 함' */
export type AliasMap = Record<SiteKey, Record<string, number | null>>;

export interface Match {
  productId: number | null;
  /** 이름이 완전히 같지 않아 추정으로 연결된 것 */
  guessed: boolean;
}

export function createMatcher(products: Product[], aliases: AliasMap) {
  const byName = new Map<string, Product>();
  const byCode = new Map<string, Product>();
  const candidates = products
    .map((p) => ({ product: p, key: normalizeName(p.name) }))
    .filter((c) => c.key.length >= 6)
    .sort((a, b) => b.key.length - a.key.length);
  for (const p of products) {
    byName.set(normalizeName(p.name), p);
    if (p.ezadminCode) byCode.set(p.ezadminCode.trim().toLowerCase(), p);
    byCode.set(p.sku.trim().toLowerCase(), p);
  }

  return (site: SiteKey, row: Pick<SiteRow, 'name' | 'code'>): Match => {
    const key = normalizeName(row.name);
    const alias = aliases[site]?.[key];
    if (alias !== undefined) return { productId: alias, guessed: false };
    if (row.code) {
      const p = byCode.get(row.code.trim().toLowerCase());
      if (p) return { productId: p.id, guessed: false };
    }
    const exact = byName.get(key);
    if (exact) return { productId: exact.id, guessed: false };
    // 우리 제품명이 사이트 이름 안에 들어 있으면 가장 긴 것으로 추정
    const contained = candidates.find((c) => key.includes(c.key) || c.key.includes(key));
    if (contained && key.length >= 6) return { productId: contained.product.id, guessed: true };
    return { productId: null, guessed: false };
  };
}

export interface CompareRow {
  key: string;
  name: string;
  productId: number | null;
  /** 매출 탭 '주요 제품' 순서. 있으면 맨 위에 고정 */
  pinOrder: number | null;
  ours: number | null;
  sites: Partial<Record<SiteKey, { quantity: number; names: string[]; guessed: boolean; edited: boolean }>>;
}

export function buildCompare(
  products: Product[],
  ourStock: Map<number, number>,
  data: Partial<Record<SiteKey, SiteData>>,
  match: (site: SiteKey, row: SiteRow) => Match,
): CompareRow[] {
  const productById = new Map(products.map((p) => [p.id, p]));
  const rows = new Map<string, CompareRow>();

  const ensure = (key: string, name: string, productId: number | null) => {
    let row = rows.get(key);
    if (!row) {
      const product = productId !== null ? productById.get(productId) : undefined;
      row = {
        key,
        name: product?.name ?? name,
        productId,
        pinOrder: product?.reportOrder ?? null,
        ours: productId !== null ? (ourStock.get(productId) ?? 0) : null,
        sites: {},
      };
      rows.set(key, row);
    }
    return row;
  };

  // 우리 제품: 재고가 있거나 주요 제품이면 보여준다
  for (const p of products) {
    if (!p.isActive && !ourStock.get(p.id)) continue;
    if ((ourStock.get(p.id) ?? 0) !== 0 || p.reportOrder !== null) ensure(`p:${p.id}`, p.name, p.id);
  }

  for (const site of SITE_KEYS) {
    for (const siteRow of data[site]?.rows ?? []) {
      const m = match(site, siteRow);
      const key = m.productId !== null ? `p:${m.productId}` : `n:${normalizeName(siteRow.name)}`;
      const row = ensure(key, siteRow.name, m.productId);
      const cell = row.sites[site] ?? { quantity: 0, names: [], guessed: false, edited: false };
      cell.quantity += siteRow.quantity;
      cell.names.push(siteRow.name);
      cell.guessed ||= m.guessed;
      cell.edited ||= siteRow.original !== undefined;
      row.sites[site] = cell;
    }
  }

  return sortRows([...rows.values()], (row) =>
    Math.max(row.ours ?? -Infinity, ...SITE_KEYS.map((s) => row.sites[s]?.quantity ?? -Infinity)),
  );
}

/** 주요 제품(매출 탭 순서)이 맨 위, 나머지는 수량 많은 순 */
export function sortRows<T extends { pinOrder: number | null; name: string }>(rows: T[], quantity: (row: T) => number): T[] {
  return [...rows].sort((a, b) => {
    if (a.pinOrder !== null || b.pinOrder !== null) {
      if (a.pinOrder === null) return 1;
      if (b.pinOrder === null) return -1;
      return a.pinOrder - b.pinOrder;
    }
    return quantity(b) - quantity(a) || a.name.localeCompare(b.name, 'ko');
  });
}

/** 업로드된 사이트 중 우리 재고(또는 서로)와 수량이 다른지 */
export function hasDiff(row: CompareRow, uploaded: SiteKey[]): boolean {
  const values = uploaded.map((s) => row.sites[s]?.quantity ?? 0);
  if (row.ours !== null) return values.some((v) => v !== row.ours);
  return new Set(values).size > 1;
}

// ---------------------------------------------------------------------
// 브라우저 저장 (하루에 여러 번 열어도 마지막 업로드가 남도록)
// ---------------------------------------------------------------------
const DATA_KEY = 'welfin.siteStock.data.v1';
const ALIAS_KEY = 'welfin.siteStock.alias.v1';

export const loadSiteData = () => readJson<Partial<Record<SiteKey, SiteData>>>(DATA_KEY, {});
export const saveSiteData = (data: Partial<Record<SiteKey, SiteData>>) => writeJson(DATA_KEY, data);

export const loadAliases = () =>
  readJson<AliasMap>(ALIAS_KEY, { sellmate: {}, ecount: {}, ezadmin: {} });
export const saveAliases = (aliases: AliasMap) => writeJson(ALIAS_KEY, aliases);

/**
 * 표에서 사이트 수량을 직접 고친다.
 * names: 그 칸에 합쳐진 사이트 상품명들 (없으면 새 줄을 fallbackName 으로 추가)
 * 여러 줄이 합쳐진 칸이면 첫 줄로 차이를 몰아준다.
 */
export function editSiteQuantity(data: SiteData, names: string[], fallbackName: string, value: number): SiteData {
  const rows = data.rows.map((r) => ({ ...r }));
  const targets = rows.filter((r) => names.includes(r.name));
  if (targets.length === 0) {
    rows.push({ name: fallbackName, code: null, quantity: value, original: null });
    return { ...data, rows };
  }
  const others = sumBy(targets.slice(1), (r) => r.quantity);
  const first = targets[0];
  if (first.original === undefined) first.original = first.quantity;
  first.quantity = value - others;
  if (first.original === first.quantity) delete first.original;
  return { ...data, rows };
}
