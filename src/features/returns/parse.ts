/**
 * 회수 입력칸에 붙여넣은 텍스트를 줄 단위로 읽어서
 * "신규 접수 / 송장 등록 / 반품·교환 지정" 작업으로 바꾼다.
 *
 * 지원하는 줄 형태
 *  [접수 1] 관리번호  주문번호  발주일  배송일  수령자  판매처상품  수량
 *  [접수 2] 수령자  주소  제품  수량  연락처
 *  [송장 1] 관리번호  회수송장번호
 *  [송장 2] 회수송장번호  이름  연락처
 *  [구분]   (관리번호)  이름  반품(사유) / 교환(사유)
 *
 * 송장 줄에 '롯데' / '직접' 이 들어 있으면 그 택배사로, 없으면 기본 택배사로 등록한다.
 */
import type { Carrier, NewReturnInput, Product, ReturnItem, ReturnKind, ReturnPatch } from '@/api/types';

export type InputMode = 'auto' | 'intake' | 'invoice' | 'kind';

export const INPUT_MODE_LABEL: Record<InputMode, string> = {
  auto: '통합 (자동 판별)',
  intake: '회수 접수',
  invoice: '회수 송장',
  kind: '반품/교환 구분',
};

/* ------------------------------------------------------------------ */
/* 1. 줄 읽기                                                           */
/* ------------------------------------------------------------------ */

const PHONE_RE = /(?<!\d)(0\d{1,3})[-.\s]?(\d{3,4})[-.\s]?(\d{4})(?!\d)/;
const DATE_RE = /\d{4}[-./]\d{1,2}[-./]\d{1,2}/;
const DATETIME_SRC = String.raw`\d{4}[-./]\d{1,2}[-./]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?`;
const KIND_RE = /(반품|교환)/;
const SKU_RE = /WELFIN-\d+/i;

const INTAKE1_RE = new RegExp(
  String.raw`^(\d{4,10})\s+(\S+)\s+(${DATETIME_SRC})\s+(${DATETIME_SRC})\s+(\S+)\s+(.+?)\s+(\d{1,4})\s*$`,
);

type Parsed =
  | { type: 'intake1'; mgmtNo: string; orderNo: string; orderedAt: string; shippedAt: string; recipient: string; productText: string; quantity: number }
  | { type: 'intake2'; recipient: string; address: string; productText: string; quantity: number; phone: string; warning?: string }
  | { type: 'invoice1'; mgmtNo: string; invoiceNo: string; carrier: Carrier | null }
  | { type: 'invoice2'; invoiceNo: string; recipient: string; phone: string; carrier: Carrier | null }
  | { type: 'kind'; mgmtNo: string | null; recipient: string; kind: ReturnKind; reason: string | null }
  | { type: 'unknown'; message: string };

export const digits = (value: string) => value.replace(/\D/g, '');

export function formatPhone(value: string): string {
  const d = digits(value);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 12) return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
  if (d.length === 10) return d.startsWith('02') ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return value.trim();
}

/** 'A B A B' 처럼 같은 상품명이 두 번 붙어 있으면 한 번만 남긴다 */
export function cleanProductText(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length % 2 === 0) {
    const half = words.length / 2;
    const first = words.slice(0, half).join(' ');
    if (first === words.slice(half).join(' ')) return first;
  }
  return words.join(' ');
}

export function findSku(text: string): string | null {
  return text.match(SKU_RE)?.[0].toUpperCase() ?? null;
}

function detectCarrier(line: string): Carrier | null {
  if (/롯데/.test(line)) return 'lotte';
  if (/직접|직발/.test(line)) return 'direct';
  if (/cj|대한통운/i.test(line)) return 'cj';
  return null;
}

function splitColumns(line: string): string[] {
  const parts = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function isHeader(line: string) {
  return /관리번호|수령자|송장번호|주문번호|연락처/.test(line) && !/\d{5,}/.test(line);
}

/** 주소·제품이 띄어쓰기로만 이어진 경우: 제품이 시작되는 위치를 찾는다 */
function splitAddressAndProduct(text: string, products: Product[]): { address: string; product: string } | null {
  const candidates: number[] = [];
  const sku = text.search(SKU_RE);
  if (sku >= 0) candidates.push(sku);
  const brand = text.search(/웰핀|welfin/i);
  if (brand >= 0) candidates.push(brand);
  for (const p of products) {
    const idx = text.indexOf(p.name);
    if (idx >= 0) candidates.push(idx);
  }
  const start = candidates.filter((i) => i > 0).sort((a, b) => a - b)[0];
  if (start === undefined) return null;
  return { address: text.slice(0, start).trim(), product: text.slice(start).trim() };
}

function parseKind(line: string): Parsed | null {
  const match = line.match(KIND_RE);
  if (!match || match.index === undefined) return null;
  const kind: ReturnKind = match[1] === '반품' ? 'return' : 'exchange';
  const before = line.slice(0, match.index).trim();
  const after = line.slice(match.index + match[1].length).trim();

  const mgmtNo = before.match(/(?<!\d)\d{4,10}(?!\d)/)?.[0] ?? null;
  const recipient = before.replace(/(?<!\d)\d{4,10}(?!\d)/, '').replace(/[,:/-]/g, ' ').trim().split(/\s+/)[0] ?? '';

  let reason = after.replace(/^[\s:,-]+/, '');
  const paren = reason.match(/^[(（\[]([^)）\]]*)[)）\]]/);
  if (paren) reason = paren[1];
  reason = reason.trim();

  if (!recipient && !mgmtNo) return { type: 'unknown', message: '이름이나 관리번호를 찾지 못했어요' };
  return { type: 'kind', mgmtNo, recipient, kind, reason: reason || null };
}

function parseInvoice(line: string): Parsed | null {
  const carrier = detectCarrier(line);
  const phoneMatch = line.match(PHONE_RE);
  const withoutPhone = phoneMatch ? line.replace(phoneMatch[0], ' ') : line;
  // 하이픈으로 끊긴 송장(1234-5678-9012)도 하나로 본다
  const numbers = (withoutPhone.match(/\d[\d-]*\d/g) ?? []).map(digits);
  const invoice = numbers.find((n) => n.length >= 10 && n.length <= 14);
  if (!invoice) return null;

  if (phoneMatch) {
    const name = withoutPhone
      .replace(/\d[\d-]*\d/g, ' ')
      .replace(/롯데택배|롯데|직접발송|직접|CJ대한통운|대한통운|CJ/gi, ' ')
      .trim()
      .split(/\s+/)[0];
    if (!name) return null;
    return { type: 'invoice2', invoiceNo: invoice, recipient: name, phone: formatPhone(phoneMatch[0]), carrier };
  }

  const mgmtNo = numbers.find((n) => n.length >= 4 && n.length <= 9);
  if (!mgmtNo) return null;
  return { type: 'invoice1', mgmtNo, invoiceNo: invoice, carrier };
}

function parseIntake(line: string, products: Product[]): Parsed | null {
  const normalized = line.replace(/\s+/g, ' ').trim();
  const m1 = normalized.match(INTAKE1_RE);
  if (m1) {
    return {
      type: 'intake1',
      mgmtNo: m1[1],
      orderNo: m1[2],
      orderedAt: m1[3],
      shippedAt: m1[4],
      recipient: m1[5],
      productText: cleanProductText(m1[6]),
      quantity: Number(m1[7]),
    };
  }

  const phoneMatch = line.match(PHONE_RE);
  if (!phoneMatch || DATE_RE.test(line)) return null;
  const phone = formatPhone(phoneMatch[0]);

  // 엑셀에서 복사한 경우: 수령자 / 주소 / 제품 / 수량 / 연락처
  const columns = splitColumns(line);
  if (columns.length >= 5) {
    const phoneIdx = columns.findIndex((c) => PHONE_RE.test(c));
    const rest = columns.filter((_, i) => i !== phoneIdx);
    const qtyIdx = rest.findIndex((c, i) => i > 0 && /^\d{1,4}$/.test(c));
    if (rest.length >= 4 && qtyIdx >= 0) {
      const middle = rest.slice(1, qtyIdx);
      return {
        type: 'intake2',
        recipient: rest[0],
        address: middle.slice(0, -1).join(' ') || middle[0] || '',
        productText: cleanProductText(middle.length > 1 ? middle[middle.length - 1] : ''),
        quantity: Number(rest[qtyIdx]),
        phone,
      };
    }
  }

  // 띄어쓰기로만 이어진 경우
  const body = line.replace(phoneMatch[0], ' ').replace(/\s+/g, ' ').trim();
  const words = body.split(' ');
  if (words.length < 3) return null;
  const recipient = words[0];
  let quantity = 1;
  let restWords = words.slice(1);
  const last = restWords[restWords.length - 1];
  if (/^\d{1,4}$/.test(last) || /^\d{1,4}개$/.test(last)) {
    quantity = Number(digits(last));
    restWords = restWords.slice(0, -1);
  }
  const rest = restWords.join(' ');
  const split = splitAddressAndProduct(rest, products);
  if (split) {
    return { type: 'intake2', recipient, address: split.address, productText: cleanProductText(split.product), quantity, phone };
  }
  return {
    type: 'intake2',
    recipient,
    address: rest,
    productText: '',
    quantity,
    phone,
    warning: '제품을 찾지 못했어요. 등록 후 수정해주세요',
  };
}

function parseLine(line: string, mode: InputMode, products: Product[]): Parsed {
  const tryKind = () => (KIND_RE.test(line) && !DATE_RE.test(line) ? parseKind(line) : null);
  const tryInvoice = () => (!DATE_RE.test(line) ? parseInvoice(line) : null);
  const tryIntake = () => parseIntake(line, products);

  const order =
    mode === 'kind' ? [parseKind.bind(null, line)]
    : mode === 'invoice' ? [tryInvoice]
    : mode === 'intake' ? [tryIntake]
    : (() => {
        // 통합: 날짜가 있으면 접수1, 반품/교환 글자가 있으면 구분,
        // 짧은 줄(5칸 이하)에 송장 길이 숫자가 있으면 송장, 나머지는 접수2
        const short = line.trim().split(/\s+/).length <= 5;
        return short ? [tryKind, tryInvoice, tryIntake] : [tryKind, tryIntake, tryInvoice];
      })();

  for (const attempt of order) {
    const parsed = attempt();
    if (parsed) return parsed;
  }
  return {
    type: 'unknown',
    message:
      mode === 'auto' ? '어떤 형태인지 알 수 없어요'
      : mode === 'intake' ? '접수 형태가 아니에요 (관리번호 형태 또는 이름·주소·제품·수량·연락처)'
      : mode === 'invoice' ? '송장 형태가 아니에요 (관리번호+송장 또는 송장+이름+연락처)'
      : '반품/교환 글자를 찾지 못했어요',
  };
}

/* ------------------------------------------------------------------ */
/* 2. 기존 회수 건과 매칭                                                */
/* ------------------------------------------------------------------ */

export type PlanRow =
  | { status: 'create'; lineNo: number; raw: string; input: NewReturnInput; warning?: string }
  | { status: 'update'; lineNo: number; raw: string; target: ReturnItem; label: string; patch: ReturnPatch; warning?: string }
  | { status: 'skip'; lineNo: number; raw: string; message: string }
  | { status: 'error'; lineNo: number; raw: string; message: string };

export interface PasteOptions {
  mode: InputMode;
  receivedOn: string;
  defaultCarrier: Carrier;
  existing: ReturnItem[];
  products: Product[];
}

const KIND_TEXT: Record<ReturnKind, string> = { return: '반품', exchange: '교환' };

export function planPaste(text: string, options: PasteOptions): PlanRow[] {
  const { mode, receivedOn, defaultCarrier, existing, products } = options;
  const rows: PlanRow[] = [];
  const active = existing.filter((r) => r.status !== 'inspected');
  const byMgmt = new Map(existing.filter((r) => r.mgmtNo).map((r) => [r.mgmtNo as string, r]));
  /** 같은 붙여넣기 안에서 새로 접수되는 건 (반품/교환 구분을 바로 붙이기 위해) */
  const pending: Array<Extract<PlanRow, { status: 'create' }>> = [];
  /** 같은 건에 대한 여러 줄의 변경을 하나로 합친다 */
  const updates = new Map<number, Extract<PlanRow, { status: 'update' }>>();

  const pushUpdate = (lineNo: number, raw: string, target: ReturnItem, label: string, patch: ReturnPatch, warning?: string) => {
    const prev = updates.get(target.id);
    if (prev) {
      Object.assign(prev.patch, patch);
      prev.label = `${prev.label} · ${label}`;
      rows.push({ status: 'skip', lineNo, raw, message: `${prev.lineNo}번째 줄과 같은 건이라 합쳐서 저장해요` });
      return;
    }
    const row = { status: 'update' as const, lineNo, raw, target, label, patch, warning };
    updates.set(target.id, row);
    rows.push(row);
  };

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const raw = rawLine.trim();
    const lineNo = index + 1;
    if (!raw || isHeader(raw)) return;

    const parsed = parseLine(raw, mode, products);

    switch (parsed.type) {
      case 'unknown':
        rows.push({ status: 'error', lineNo, raw, message: parsed.message });
        return;

      case 'intake1': {
        if (byMgmt.has(parsed.mgmtNo) || pending.some((p) => p.input.mgmtNo === parsed.mgmtNo)) {
          rows.push({ status: 'skip', lineNo, raw, message: `관리번호 ${parsed.mgmtNo} 는 이미 접수돼 있어요` });
          return;
        }
        const row = {
          status: 'create' as const,
          lineNo,
          raw,
          input: {
            receivedOn,
            sourceFormat: 1 as const,
            mgmtNo: parsed.mgmtNo,
            orderNo: parsed.orderNo,
            orderedAt: parsed.orderedAt,
            shippedAt: parsed.shippedAt,
            recipient: parsed.recipient,
            phone: null,
            address: null,
            productText: parsed.productText,
            sku: findSku(parsed.productText),
            quantity: parsed.quantity,
            kind: null,
            reason: null,
          },
        };
        pending.push(row);
        rows.push(row);
        return;
      }

      case 'intake2': {
        const dup = [...active, ...pending.map((p) => p.input)].some(
          (r) => r.recipient === parsed.recipient && digits(r.phone ?? '') === digits(parsed.phone) && r.receivedOn === receivedOn,
        );
        if (dup) {
          rows.push({ status: 'skip', lineNo, raw, message: '같은 날 같은 이름·연락처로 이미 접수돼 있어요' });
          return;
        }
        const row = {
          status: 'create' as const,
          lineNo,
          raw,
          warning: parsed.warning,
          input: {
            receivedOn,
            sourceFormat: 2 as const,
            mgmtNo: null,
            orderNo: null,
            orderedAt: null,
            shippedAt: null,
            recipient: parsed.recipient,
            phone: parsed.phone,
            address: parsed.address || null,
            productText: parsed.productText || '(제품 미확인)',
            sku: findSku(parsed.productText),
            quantity: parsed.quantity,
            kind: null,
            reason: null,
          },
        };
        pending.push(row);
        rows.push(row);
        return;
      }

      case 'invoice1': {
        const target = byMgmt.get(parsed.mgmtNo);
        if (!target) {
          rows.push({ status: 'error', lineNo, raw, message: `관리번호 ${parsed.mgmtNo} 접수 건이 없어요` });
          return;
        }
        applyInvoice(lineNo, raw, target, parsed.invoiceNo, parsed.carrier ?? defaultCarrier);
        return;
      }

      case 'invoice2': {
        const sameName = active.filter((r) => r.recipient === parsed.recipient);
        const samePhone = sameName.filter((r) => r.phone && digits(r.phone) === digits(parsed.phone));
        let candidates = samePhone.length ? samePhone : sameName.length === 1 ? sameName : [];
        if (candidates.length > 1) {
          const waiting = candidates.filter((r) => !r.invoiceNo);
          if (waiting.length) candidates = waiting;
        }
        if (candidates.length === 0) {
          rows.push({ status: 'error', lineNo, raw, message: `${parsed.recipient} (${parsed.phone}) 접수 건이 없어요` });
          return;
        }
        if (candidates.length > 1) {
          rows.push({ status: 'error', lineNo, raw, message: `${parsed.recipient} 님 접수 건이 ${candidates.length}개예요. 관리번호로 입력해주세요` });
          return;
        }
        const warning = samePhone.length ? undefined : '연락처가 달라서 이름으로만 찾았어요';
        applyInvoice(lineNo, raw, candidates[0], parsed.invoiceNo, parsed.carrier ?? defaultCarrier, warning);
        return;
      }

      case 'kind': {
        const label = `${KIND_TEXT[parsed.kind]}${parsed.reason ? `(${parsed.reason})` : ''}`;

        // 1) 같은 붙여넣기에서 접수하는 건
        const pendingMatch = parsed.mgmtNo
          ? pending.filter((p) => p.input.mgmtNo === parsed.mgmtNo)
          : pending.filter((p) => p.input.recipient === parsed.recipient);
        if (pendingMatch.length === 1) {
          pendingMatch[0].input.kind = parsed.kind;
          pendingMatch[0].input.reason = parsed.reason;
          rows.push({ status: 'skip', lineNo, raw, message: `${pendingMatch[0].lineNo}번째 줄 접수 건에 ${label} 로 함께 저장해요` });
          return;
        }

        // 2) 이미 접수된 건
        let candidates = parsed.mgmtNo
          ? existing.filter((r) => r.mgmtNo === parsed.mgmtNo)
          : active.filter((r) => r.recipient === parsed.recipient);
        if (candidates.length > 1) {
          const unset = candidates.filter((r) => !r.kind);
          if (unset.length === 1) candidates = unset;
        }
        if (candidates.length + pendingMatch.length === 0) {
          rows.push({
            status: 'error',
            lineNo,
            raw,
            message: parsed.mgmtNo ? `관리번호 ${parsed.mgmtNo} 접수 건이 없어요` : `${parsed.recipient} 님 접수 건이 없어요`,
          });
          return;
        }
        if (candidates.length + pendingMatch.length > 1) {
          rows.push({
            status: 'error',
            lineNo,
            raw,
            message: `${parsed.recipient || parsed.mgmtNo} 님 건이 ${candidates.length + pendingMatch.length}개예요 (동명이인). 관리번호를 같이 적어주세요`,
          });
          return;
        }
        pushUpdate(lineNo, raw, candidates[0], label, { kind: parsed.kind, reason: parsed.reason });
        return;
      }
    }
  });

  return rows;

  function applyInvoice(lineNo: number, raw: string, target: ReturnItem, invoiceNo: string, carrier: Carrier, warning?: string) {
    if (target.invoiceNo === invoiceNo && target.carrier === carrier) {
      rows.push({ status: 'skip', lineNo, raw, message: '이미 같은 송장이 등록돼 있어요' });
      return;
    }
    const changed = target.invoiceNo && target.invoiceNo !== invoiceNo;
    pushUpdate(
      lineNo,
      raw,
      target,
      `송장 ${invoiceNo}`,
      { invoiceNo, carrier },
      [warning, changed ? `기존 송장 ${target.invoiceNo} 를 바꿔요` : undefined].filter(Boolean).join(' · ') || undefined,
    );
  }
}
