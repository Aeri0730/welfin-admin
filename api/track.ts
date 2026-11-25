/**
 * POST /api/track  { ids: number[] }
 *
 * 회수 송장을 tracker.delivery 로 조회해서 returns 테이블에 저장한다.
 * - 로그인한 사용자의 토큰으로 Supabase 에 접근하므로 RLS 가 그대로 적용된다.
 * - tracker.delivery 키는 서버에만 있다 (브라우저에 노출되지 않음).
 * - '배달완료'가 되면 회수중 → 회수완료로 자동 변경한다.
 * - 재접수 전 송장(invoice_history)도 같이 조회한다. 그중 하나라도 배달완료면 회수완료.
 *
 * Vercel 환경변수
 *   TRACKER_DELIVERY_CLIENT_ID / TRACKER_DELIVERY_CLIENT_SECRET   (tracker.delivery 콘솔에서 발급)
 *   VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY             (이미 등록돼 있는 값 재사용)
 */
import { createClient } from '@supabase/supabase-js';

declare const process: { env: Record<string, string | undefined> };

const CARRIER_ID: Record<string, string> = {
  cj: 'kr.cjlogistics',
  lotte: 'kr.lotte',
};

const STATUS_LABEL: Record<string, string> = {
  INFORMATION_RECEIVED: '상품준비',
  AT_PICKUP: '집화처리',
  IN_TRANSIT: '상품이동중',
  OUT_FOR_DELIVERY: '배송출발',
  ATTEMPT_FAIL: '배달실패',
  DELIVERED: '배달완료',
  AVAILABLE_FOR_PICKUP: '수령대기',
  EXCEPTION: '배송이상',
  UNKNOWN: '확인중',
};

const TRACK_QUERY = `
  query Track($carrierId: ID!, $trackingNumber: String!) {
    track(carrierId: $carrierId, trackingNumber: $trackingNumber) {
      lastEvent { time status { code name } description location { name } }
      events(last: 20) {
        edges { node { time status { code name } description location { name } } }
      }
    }
  }
`;

interface RawEvent {
  time: string | null;
  status: { code: string; name: string | null } | null;
  description: string | null;
  location: { name: string | null } | null;
}

interface TrackEvent {
  time: string | null;
  code: string;
  label: string;
  location: string | null;
  description: string | null;
}

function toEvent(raw: RawEvent): TrackEvent {
  const code = raw.status?.code ?? 'UNKNOWN';
  return {
    time: raw.time,
    code,
    label: STATUS_LABEL[code] ?? raw.status?.name ?? code,
    location: raw.location?.name ?? null,
    description: raw.description,
  };
}

type TrackOutcome =
  | { ok: true; last: TrackEvent | null; events: TrackEvent[] }
  | { ok: false; notFound: boolean; message: string };

async function track(carrier: string, invoiceNo: string, auth: string): Promise<TrackOutcome> {
  const carrierId = CARRIER_ID[carrier];
  if (!carrierId) return { ok: false, notFound: false, message: '자동 조회를 지원하지 않는 택배사예요' };

  const response = await fetch('https://apis.tracker.delivery/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ query: TRACK_QUERY, variables: { carrierId, trackingNumber: invoiceNo } }),
  });

  const body = (await response.json().catch(() => null)) as {
    data?: { track: { lastEvent: RawEvent | null; events: { edges: Array<{ node: RawEvent }> } } | null };
    errors?: Array<{ message: string; extensions?: { code?: string } }>;
  } | null;

  if (!response.ok && !body) return { ok: false, notFound: false, message: `조회 서버 오류 (${response.status})` };

  const error = body?.errors?.[0];
  if (error) {
    const code = error.extensions?.code;
    if (code === 'NOT_FOUND') return { ok: false, notFound: true, message: '아직 조회 정보가 없어요 (집화 전)' };
    if (code === 'UNAUTHENTICATED') return { ok: false, notFound: false, message: 'tracker.delivery 키를 확인해주세요' };
    return { ok: false, notFound: false, message: error.message };
  }

  const info = body?.data?.track;
  if (!info) return { ok: false, notFound: true, message: '아직 조회 정보가 없어요 (집화 전)' };

  const events = info.events.edges
    .map((edge) => toEvent(edge.node))
    .sort((a, b) => (b.time ?? '').localeCompare(a.time ?? ''));
  return { ok: true, last: info.lastEvent ? toEvent(info.lastEvent) : (events[0] ?? null), events };
}

/** 재접수 전 송장 한 개 (0025 invoice_history) */
interface HistoryEntry {
  carrier: string | null;
  invoice_no: string;
  [key: string]: unknown;
}

/** 이전 송장은 최근 것부터 이만큼만 조회한다 */
const HISTORY_TRACK_LIMIT = 4;

function historyWith(entry: HistoryEntry, outcome: TrackOutcome, now: string): HistoryEntry {
  if (outcome.ok) {
    const last = outcome.last;
    return {
      ...entry,
      tracking_code: last?.code ?? null,
      tracking_label: last?.label ?? null,
      tracking_location: last?.location ?? null,
      tracking_time: last?.time ?? null,
      tracking_checked_at: now,
      tracking_error: null,
    };
  }
  return {
    ...entry,
    tracking_code: outcome.notFound ? 'NOT_FOUND' : null,
    tracking_label: outcome.notFound ? '집화 전' : null,
    tracking_checked_at: now,
    tracking_error: outcome.notFound ? null : outcome.message,
  };
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request: Request): Promise<Response> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  const clientId = process.env.TRACKER_DELIVERY_CLIENT_ID;
  const clientSecret = process.env.TRACKER_DELIVERY_CLIENT_SECRET;

  if (!supabaseUrl || !supabaseKey) return json(500, { error: '서버에 Supabase 설정이 없어요' });
  if (!clientId || !clientSecret) {
    return json(503, { error: '배송조회 키가 아직 등록되지 않았어요 (TRACKER_DELIVERY_CLIENT_ID / SECRET)' });
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: '로그인이 필요해요' });

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json(401, { error: '로그인이 만료됐어요. 다시 로그인해주세요' });

  const payload = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(payload?.ids)
    ? payload.ids.filter((id): id is number => Number.isInteger(id)).slice(0, 100)
    : [];
  if (ids.length === 0) return json(400, { error: '조회할 건이 없어요' });

  const load = (columns: string) =>
    supabase.from('returns').select(columns).in('id', ids).not('invoice_no', 'is', null);
  let result = await load('id, status, carrier, invoice_no, invoice_history');
  // 0025 실행 전이면 이전 송장 없이
  const hasHistory = result.error?.code !== '42703';
  if (!hasHistory) result = await load('id, status, carrier, invoice_no');
  if (result.error) return json(500, { error: result.error.message });
  const rows = result.data as unknown as Array<{
    id: number;
    status: string;
    carrier: string | null;
    invoice_no: string | null;
    invoice_history?: unknown;
  }>;

  const auth = `TRACKQL-API-KEY ${clientId}:${clientSecret}`;
  let updated = 0;
  let collected = 0;
  let failed = 0;
  let lastMessage: string | undefined;

  // tracker.delivery 에 한꺼번에 몰리지 않도록 5건씩
  const queue = [...rows];
  const worker = async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      const safeTrack = (carrier: string | null, invoiceNo: string) =>
        track(carrier ?? 'cj', invoiceNo, auth).catch(
          (e: unknown): TrackOutcome => ({ ok: false, notFound: false, message: e instanceof Error ? e.message : '조회 실패' }),
        );
      const outcome = await safeTrack(row.carrier, row.invoice_no as string);
      const now = new Date().toISOString();

      // 재접수 전 송장들 (조회되는 택배사만, 최근 것부터 몇 개)
      const history = Array.isArray(row.invoice_history) ? (row.invoice_history as HistoryEntry[]) : [];
      let historyDelivered: string | null = null;
      const nextHistory = [...history];
      for (let i = 0; i < Math.min(history.length, HISTORY_TRACK_LIMIT); i += 1) {
        const entry = history[i];
        if (!entry?.invoice_no || !CARRIER_ID[entry.carrier ?? 'cj']) continue;
        const past = await safeTrack(entry.carrier, entry.invoice_no);
        nextHistory[i] = historyWith(entry, past, now);
        if (past.ok && past.last?.code === 'DELIVERED') historyDelivered = past.last.time ?? now;
      }
      let columns: Record<string, unknown>;

      if (outcome.ok) {
        const last = outcome.last;
        columns = {
          tracking_code: last?.code ?? null,
          tracking_label: last?.label ?? null,
          tracking_location: last?.location ?? null,
          tracking_time: last?.time ?? null,
          tracking_events: outcome.events,
          tracking_checked_at: now,
          tracking_error: null,
        };
      } else {
        if (!outcome.notFound) {
          failed += 1;
          lastMessage = outcome.message;
        }
        columns = {
          tracking_code: outcome.notFound ? 'NOT_FOUND' : null,
          tracking_label: outcome.notFound ? '집화 전' : null,
          tracking_checked_at: now,
          tracking_error: outcome.notFound ? null : outcome.message,
        };
      }

      if (hasHistory && history.length > 0) columns.invoice_history = nextHistory;

      // 송장 중 하나라도 배달완료면 회수완료
      const deliveredAt = outcome.ok && outcome.last?.code === 'DELIVERED' ? (outcome.last.time ?? now) : historyDelivered;
      if (deliveredAt && (row.status === 'requested' || row.status === 'in_transit')) {
        columns.status = 'collected';
        columns.collected_at = deliveredAt;
        collected += 1;
      }

      const { error: updateError } = await supabase.from('returns').update(columns).eq('id', row.id);
      if (updateError) {
        failed += 1;
        lastMessage = updateError.message;
      } else {
        updated += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));

  return json(200, { updated, collected, failed, message: lastMessage });
}
