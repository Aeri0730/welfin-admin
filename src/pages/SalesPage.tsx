import { useEffect, useMemo, useState } from 'react';
import {
  useDailySales,
  useMovements,
  useSalesActuals,
  useSalesExtras,
  useSalesTargets,
  useSaveDailySales,
  useSaveSalesActual,
  useSaveSalesExtras,
  useSaveSalesTarget,
} from '@/api/queries';
import type { SalesExtra, Warehouse } from '@/api/types';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { TextField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { useProfile } from '@/features/auth/session';
import { sumStock, useStockMatrix } from '@/features/inventory/useStockMatrix';
import { BarChart, type ChartSeries } from '@/features/sales/BarChart';
import { FeaturedStock } from '@/features/sales/FeaturedStock';
import { cx } from '@/lib/cx';
import { addDays, formatDateLabel, formatNumber, today } from '@/lib/format';
import * as p from './pages.css';
import * as s from './SalesPage.css';

/** 창고 계열 색 (막대·범례 점에만 사용) — 검증: CVD ΔE 32.5 */
const WAREHOUSE_COLORS = ['#3182F6', '#FE9800', '#03B26C'];

/**
 * 쿠팡 RG 는 실적이 하루 늦게 나와서, 엑셀처럼 기준일의 '전날' 매출을 보여주고 입력받는다.
 * DB 에는 실제 판매일(sales_on)로 저장된다.
 */
const SALES_LAG_DAYS: Record<string, number> = { COUPANG: 1 };
const salesDayOf = (day: string, warehouse: Warehouse) => addDays(day, -(SALES_LAG_DAYS[warehouse.code] ?? 0));
const shortDate = (day: string) => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 13);
const formatInput = (value: string) => (value ? formatNumber(Number(value)) : '');

function changeRate(current: number, previous: number): { text: string; className?: string } {
  if (previous === 0) return { text: current === 0 ? '-' : '신규' };
  const rate = ((current - previous) / previous) * 100;
  if (Math.abs(rate) < 0.05) return { text: '0%' };
  return rate > 0
    ? { text: `▲ ${rate.toFixed(1)}%`, className: s.up }
    : { text: `▼ ${Math.abs(rate).toFixed(1)}%`, className: s.down };
}

export function SalesPage() {
  const { data: profile } = useProfile();
  const isAdmin = profile?.role === 'admin';
  const [date, setDate] = useState(today());
  const prevDate = addDays(date, -1);
  const monthKey = date.slice(0, 7);
  const yearKey = date.slice(0, 4);
  const monthStart = `${monthKey}-01`;

  const current = useStockMatrix(date);
  const previous = useStockMatrix(prevDate);
  const warehouses = current.warehouses;
  const salesFrom = addDays(date, -3);
  const monthSales = useDailySales(monthStart < salesFrom ? monthStart : salesFrom, date);
  const monthExtras = useSalesExtras(monthStart < salesFrom ? monthStart : salesFrom, date);
  const extraRows = monthExtras.data ?? [];

  // 월 실적(ACTUAL)은 날마다 직접 입력. 기준일까지 가장 최근 입력값을 쓴다
  const actuals = useSalesActuals(monthStart, date);
  const latestActual = (actuals.data ?? []).filter((row) => row.actualOn <= date).at(-1) ?? null;
  const todayActual = latestActual?.actualOn === date ? latestActual : null;

  /** 그날 창고 밖 매출 (양일상사 · 유니맥스 등) 합계 */
  const extraOf = (day: string) =>
    extraRows
      .filter((row) => row.salesOn === day)
      .reduce((acc, row) => ({ amount: acc.amount + row.amount, quantity: acc.quantity + row.quantity }), { amount: 0, quantity: 0 });
  const extraNames = (day: string) => [...new Set(extraRows.filter((row) => row.salesOn === day).map((row) => row.name))];
  const targets = useSalesTargets();
  const movements = useMovements({ from: prevDate, to: date });

  const [targetOpen, setTargetOpen] = useState(false);

  /** 기준일 day 의 창고별 매출 (쿠팡 RG 는 전날 판매분). warehouseId 가 없으면 전 창고 + 창고 밖 매출 합계 */
  const salesOf = (day: string, warehouseId?: number) =>
    [
      ...(warehouseId === undefined ? [extraOf(day)] : []),
      ...warehouses
        .filter((w) => warehouseId === undefined || w.id === warehouseId)
        .flatMap((w) => (monthSales.data ?? []).filter((row) => row.warehouseId === w.id && row.salesOn === salesDayOf(day, w))),
    ].reduce((acc, row) => ({ amount: acc.amount + row.amount, quantity: acc.quantity + row.quantity }), { amount: 0, quantity: 0 });

  const salesLabel = (w: Warehouse, day: string) =>
    SALES_LAG_DAYS[w.code] ? `${w.name} (${shortDate(salesDayOf(day, w))} 판매)` : w.name;

  const movedOf = (day: string, type: 'inbound' | 'outbound', warehouseId?: number) =>
    (movements.data ?? [])
      .filter((m) => m.movedOn === day && m.type === type)
      .filter((m) => {
        const wh = type === 'inbound' ? m.toWarehouse : m.fromWarehouse;
        return warehouseId === undefined || wh?.id === warehouseId;
      })
      .reduce((sum, m) => sum + m.quantity, 0);

  const inMonth = (row: { salesOn: string }) => row.salesOn >= monthStart && row.salesOn <= date;
  const monthActual =
    (monthSales.data ?? []).filter(inMonth).reduce((sum, row) => sum + row.amount, 0) +
    extraRows.filter(inMonth).reduce((sum, row) => sum + row.amount, 0);
  const showExtra = extraRows.some((row) => row.salesOn === date || row.salesOn === prevDate);
  const extraLabel = `기타${extraNames(date).length ? ` (${extraNames(date).join(', ')})` : ''}`;
  const monthTarget = targets.data?.find((t) => t.period === monthKey)?.amount ?? 0;
  const yearTarget = targets.data?.find((t) => t.period === yearKey)?.amount ?? 0;
  const achieved = monthTarget > 0 && latestActual ? (latestActual.amount / monthTarget) * 100 : 0;

  /* ---------- 일일 비교표 ---------- */
  type Metric = {
    label: string;
    value: (day: string, warehouseId?: number) => number;
    unit: string;
    /** 창고 밖 매출 칸 값 (없으면 '-') */
    extra?: (day: string) => number;
  };
  const metrics: Metric[] = [
    { label: '매출액', value: (day, wh) => salesOf(day, wh).amount, unit: '원', extra: (day) => extraOf(day).amount },
    { label: '판매수량', value: (day, wh) => salesOf(day, wh).quantity, unit: '개', extra: (day) => extraOf(day).quantity },
    { label: '입고수량', value: (day, wh) => movedOf(day, 'inbound', wh), unit: '개' },
    { label: '출고수량', value: (day, wh) => movedOf(day, 'outbound', wh), unit: '개' },
    {
      label: '재고금액',
      value: (day, wh) => sumStock(day === date ? current.rows : previous.rows, wh).value,
      unit: '원',
    },
  ];

  /* ---------- 주요 제품 재고 ---------- */
  const featured = useMemo(
    () =>
      current.rows
        .filter((row) => row.product.reportOrder !== null)
        .sort((a, b) => (a.product.reportOrder ?? 0) - (b.product.reportOrder ?? 0)),
    [current.rows],
  );
  const series: ChartSeries[] = warehouses.map((w, i) => ({ name: w.name, color: WAREHOUSE_COLORS[i % WAREHOUSE_COLORS.length] }));

  const loading = current.isLoading || monthSales.isLoading;
  const error = current.error ?? previous.error ?? monthSales.error ?? monthExtras.error ?? actuals.error ?? targets.error ?? movements.error;

  return (
    <div className={p.stack}>
      <PageHeader
        title="매출"
        description={`${formatDateLabel(date)} 기준 매출과 재고금액이에요`}
        actions={
          <div className={s.dateBar}>
            <TextField
              aria-label="기준일"
              type="date"
              value={date}
              max={today()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </div>
        }
      />

      {error && <ErrorBox error={error} />}

      {/* 목표 대비 실적 */}
      <Card>
        <div className={s.cardHead}>
          <h2 className={p.sectionTitle}>{Number(monthKey.slice(5))}월 목표 달성</h2>
          {isAdmin && (
            <Button size="sm" variant="weak" onClick={() => setTargetOpen(true)}>
              목표 수정
            </Button>
          )}
        </div>
        <div className={s.targetGrid}>
          <div>
            <p className={p.statMini}>연간 목표</p>
            <p className={p.statMiniValue}>{yearTarget ? `${formatNumber(yearTarget)}원` : '미설정'}</p>
          </div>
          <div>
            <p className={p.statMini}>{Number(monthKey.slice(5))}월 목표 (FCST)</p>
            <p className={p.statMiniValue}>{monthTarget ? `${formatNumber(monthTarget)}원` : '미설정'}</p>
          </div>
          <div>
            <p className={p.statMini}>{Number(monthKey.slice(5))}월 실적 (ACTUAL)</p>
            <p className={p.statMiniValue}>{latestActual ? `${formatNumber(latestActual.amount)}원` : '미입력'}</p>
            {latestActual && latestActual.actualOn !== date && (
              <p className={p.muted}>{shortDate(latestActual.actualOn)} 입력값</p>
            )}
          </div>
          <div>
            <p className={p.statMini}>달성률</p>
            <p className={cx(p.statMiniValue, p.plus)}>{monthTarget && latestActual ? `${achieved.toFixed(0)}%` : '-'}</p>
          </div>
        </div>
        {monthTarget > 0 && (
          <div className={s.progress} role="progressbar" aria-valuenow={Math.round(achieved)} aria-valuemin={0} aria-valuemax={100}>
            <div className={s.progressBar} style={{ width: `${Math.min(100, achieved)}%` }} />
          </div>
        )}
        <ActualInput
          key={`${date}:${todayActual?.amount ?? ''}`}
          date={date}
          saved={todayActual?.amount ?? null}
          computed={monthActual}
          loading={actuals.isLoading}
        />
      </Card>

      <SalesInput
        key={date}
        date={date}
        warehouses={warehouses}
        rows={monthSales.data ?? []}
        extras={extraRows.filter((row) => row.salesOn === date)}
        extrasLoaded={!monthExtras.isLoading}
      />

      {/* 판매 매출 보고 */}
      <Card title="판매 매출 보고">
        {loading ? (
          <Skeleton height={200} />
        ) : (
          <div className={p.tableWrap}>
            <table className={p.table}>
              <thead>
                <tr>
                  <th className={p.th}>구분</th>
                  {warehouses.map((w) => (
                    <th key={w.id} className={cx(p.th, p.num)}>
                      {salesLabel(w, date)}
                    </th>
                  ))}
                  {showExtra && <th className={cx(p.th, p.num)}>{extraLabel}</th>}
                  <th className={cx(p.th, p.num)}>금일 합계</th>
                  <th className={cx(p.th, p.num)}>전일 합계</th>
                  <th className={cx(p.th, p.num)}>증감</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => {
                  const todayTotal = metric.value(date);
                  const prevTotal = metric.value(prevDate);
                  const rate = changeRate(todayTotal, prevTotal);
                  return (
                    <tr key={metric.label}>
                      <td className={cx(p.td, p.strong)}>{metric.label}</td>
                      {warehouses.map((w) => (
                        <td key={w.id} className={cx(p.td, p.num)}>
                          {formatNumber(metric.value(date, w.id))}
                        </td>
                      ))}
                      {showExtra && (
                        <td className={cx(p.td, p.num)}>{metric.extra ? formatNumber(metric.extra(date)) : '-'}</td>
                      )}
                      <td className={cx(p.td, p.num, p.strong)}>
                        {formatNumber(todayTotal)}
                        {metric.unit}
                      </td>
                      <td className={cx(p.td, p.num)}>
                        {formatNumber(prevTotal)}
                        {metric.unit}
                      </td>
                      <td className={cx(p.td, p.num, rate.className)}>{rate.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <BarChart
          title="매출액 비교"
          unit="원"
          series={[
            { name: `금일 (${date.slice(5)})`, color: WAREHOUSE_COLORS[0] },
            { name: `전일 (${prevDate.slice(5)})`, color: '#B0B8C1' },
          ]}
          rows={[
            ...warehouses.map((w) => ({
              label: SALES_LAG_DAYS[w.code] ? `${w.name} (하루 전 판매)` : w.name,
              values: [salesOf(date, w.id).amount, salesOf(prevDate, w.id).amount],
            })),
            ...(showExtra ? [{ label: '기타', values: [extraOf(date).amount, extraOf(prevDate).amount] }] : []),
          ]}
        />
      </Card>

      {/* 주요 제품 재고량 및 재고액 */}
      <Card title="주요 제품 재고량 및 재고액">
        {loading ? (
          <Skeleton height={240} />
        ) : featured.length === 0 ? (
          <EmptyState title="표시할 제품이 없어요" description="기준 정보에서 제품의 '매출 탭 표시 순서'를 정해주세요" />
        ) : (
          <FeaturedStock rows={featured} warehouses={warehouses} />
        )}
      </Card>

      {featured.length > 0 && (
        <div className={s.chartGrid}>
          <Card>
            <BarChart
              title="창고별 재고량"
              unit="개"
              series={series}
              rows={featured.map((row) => ({
                label: row.product.name,
                values: warehouses.map((w) => row.byWarehouse[w.id] ?? 0),
              }))}
            />
          </Card>
          <Card>
            <BarChart
              title="창고별 재고액"
              unit="원"
              series={series}
              rows={featured.map((row) => ({
                label: row.product.name,
                values: warehouses.map((w) => (row.byWarehouse[w.id] ?? 0) * row.product.unitCost),
              }))}
            />
          </Card>
        </div>
      )}

      {targetOpen && (
        <TargetDialog
          yearKey={yearKey}
          monthKey={monthKey}
          yearTarget={yearTarget}
          monthTarget={monthTarget}
          onClose={() => setTargetOpen(false)}
        />
      )}
    </div>
  );
}

/* ---------- 일일 매출 입력 ---------- */

interface SalesInputProps {
  date: string;
  warehouses: Warehouse[];
  rows: Array<{ salesOn: string; warehouseId: number; amount: number; quantity: number; memo: string | null }>;
  /** 그날 창고 밖 매출 (양일상사 · 유니맥스 등) */
  extras: SalesExtra[];
  extrasLoaded: boolean;
}

interface ExtraDraft {
  key: number;
  name: string;
  amount: string;
  quantity: string;
}

let extraKey = 0;
const toExtraDraft = (row: SalesExtra): ExtraDraft => ({
  key: ++extraKey,
  name: row.name,
  amount: String(row.amount),
  quantity: String(row.quantity),
});
const blankExtra = (): ExtraDraft => ({ key: ++extraKey, name: '', amount: '', quantity: '' });

function SalesInput({ date, warehouses, rows, extras, extrasLoaded }: SalesInputProps) {
  const toast = useToast();
  const save = useSaveDailySales();
  const saveExtras = useSaveSalesExtras();
  const [draft, setDraft] = useState<Record<number, { amount: string; quantity: string }>>({});
  const [extraDraft, setExtraDraft] = useState<ExtraDraft[] | null>(null);
  const [extraError, setExtraError] = useState<string | null>(null);

  // 저장된 창고 밖 매출을 불러오면 한 번만 채운다
  useEffect(() => {
    if (extrasLoaded && extraDraft === null) setExtraDraft(extras.map(toExtraDraft));
  }, [extrasLoaded, extras, extraDraft]);
  const extraList = extraDraft ?? [];

  const updateExtra = (key: number, field: 'name' | 'amount' | 'quantity', value: string) =>
    setExtraDraft((prev) =>
      (prev ?? []).map((row) =>
        row.key === key ? { ...row, [field]: field === 'name' ? value.slice(0, 40) : onlyDigits(value) } : row,
      ),
    );
  const removeExtra = (key: number) => setExtraDraft((prev) => (prev ?? []).filter((row) => row.key !== key));
  const addExtra = () => setExtraDraft((prev) => [...(prev ?? []), blankExtra()]);

  // 저장된 값이 불러와지면 입력칸에 채운다 (사용자가 아직 안 건드린 칸만)
  useEffect(() => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const w of warehouses) {
        if (next[w.id]) continue;
        const saved = rows.find((r) => r.salesOn === salesDayOf(date, w) && r.warehouseId === w.id);
        if (saved) next[w.id] = { amount: String(saved.amount), quantity: String(saved.quantity) };
      }
      return next;
    });
  }, [rows, warehouses, date]);

  const update = (warehouseId: number, field: 'amount' | 'quantity', value: string) =>
    setDraft((prev) => ({
      ...prev,
      [warehouseId]: { ...(prev[warehouseId] ?? { amount: '', quantity: '' }), [field]: onlyDigits(value) },
    }));

  const hasSaved =
    extras.length > 0 || warehouses.some((w) => rows.some((r) => r.warehouseId === w.id && r.salesOn === salesDayOf(date, w)));

  const handleSave = async () => {
    // 이름도 숫자도 없는 빈 줄은 무시, 숫자만 있고 이름이 없으면 막는다
    const filled = extraList.filter((row) => row.name.trim() || row.amount || row.quantity);
    if (filled.some((row) => !row.name.trim())) {
      setExtraError('추가한 매출의 창고 · 업체명을 적어주세요');
      return;
    }
    setExtraError(null);
    try {
      await save.mutateAsync(
        warehouses.map((w) => ({
          salesOn: salesDayOf(date, w),
          warehouseId: w.id,
          amount: Number(draft[w.id]?.amount || 0),
          quantity: Number(draft[w.id]?.quantity || 0),
          memo: null,
        })),
      );
      if (extraDraft !== null) {
        await saveExtras.mutateAsync({
          date,
          rows: filled.map((row) => ({
            salesOn: date,
            name: row.name.trim(),
            amount: Number(row.amount || 0),
            quantity: Number(row.quantity || 0),
          })),
        });
        setExtraDraft(filled);
      }
      toast(`${formatDateLabel(date)} 매출을 저장했어요`);
    } catch {
      // ErrorBox 로 보여준다
    }
  };

  return (
    <Card title={`${formatDateLabel(date)} 매출 입력`}>
      <div className={p.stack} style={{ gap: 12 }}>
        {warehouses.map((w) => (
          <div key={w.id} className={s.inputGrid}>
            <span className={s.inputLabel}>
              {w.name}
              {SALES_LAG_DAYS[w.code] ? <span className={s.inputSub}>{shortDate(salesDayOf(date, w))} 판매분</span> : null}
            </span>
            <TextField
              label="매출액(원)"
              inputMode="numeric"
              placeholder="0"
              value={formatInput(draft[w.id]?.amount ?? '')}
              onChange={(e) => update(w.id, 'amount', e.target.value)}
            />
            <TextField
              label="판매수량(개)"
              inputMode="numeric"
              placeholder="0"
              value={formatInput(draft[w.id]?.quantity ?? '')}
              onChange={(e) => update(w.id, 'quantity', e.target.value)}
            />
          </div>
        ))}

        {extraList.map((row) => (
          <div key={row.key} className={s.extraGrid}>
            <TextField
              label="창고 · 업체명"
              placeholder="예: 양일상사"
              value={row.name}
              onChange={(e) => updateExtra(row.key, 'name', e.target.value)}
            />
            <TextField
              label="매출액(원)"
              inputMode="numeric"
              placeholder="0"
              value={formatInput(row.amount)}
              onChange={(e) => updateExtra(row.key, 'amount', e.target.value)}
            />
            <TextField
              label="판매수량(개)"
              inputMode="numeric"
              placeholder="0"
              value={formatInput(row.quantity)}
              onChange={(e) => updateExtra(row.key, 'quantity', e.target.value)}
            />
            <button type="button" className={s.extraRemove} onClick={() => removeExtra(row.key)} aria-label="이 매출 줄 빼기">
              ×
            </button>
          </div>
        ))}

        <button type="button" className={s.extraAdd} onClick={addExtra} disabled={!extrasLoaded}>
          + 추가
        </button>
      </div>
      {(extraError || save.error || saveExtras.error) && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox error={extraError ? new Error(extraError) : (save.error ?? saveExtras.error)} />
        </div>
      )}
      <div className={s.inputActions}>
        <Button onClick={handleSave} loading={save.isPending || saveExtras.isPending}>
          {hasSaved ? '수정 저장' : '저장'}
        </Button>
      </div>
    </Card>
  );
}

/* ---------- 월 실적 입력 ---------- */

interface ActualInputProps {
  date: string;
  /** 그날 저장된 실적 (없으면 null) */
  saved: number | null;
  /** 참고용: 이번 달 1일 ~ 기준일 창고별 입력 매출 합계 */
  computed: number;
  loading: boolean;
}

function ActualInput({ date, saved, computed, loading }: ActualInputProps) {
  const toast = useToast();
  const save = useSaveSalesActual();
  const [text, setText] = useState(saved !== null ? String(saved) : '');
  const next = text ? Number(text) : null;
  const changed = next !== saved;

  const handleSave = () =>
    save.mutate(
      { date, amount: next },
      { onSuccess: () => toast(next === null ? `${shortDate(date)} 실적을 지웠어요` : `${shortDate(date)} 실적을 저장했어요`) },
    );

  return (
    <div className={s.actualRow}>
      <TextField
        label={`${shortDate(date)} 기준 ${Number(date.slice(5, 7))}월 실적 (ACTUAL)`}
        inputMode="numeric"
        placeholder="이번 달 1일부터의 실적(원)"
        hint={`참고: 이번 달 입력한 매출 합계 ${formatNumber(computed)}원`}
        value={formatInput(text)}
        onChange={(e) => setText(onlyDigits(e.target.value))}
        containerClassName={s.actualField}
      />
      <Button onClick={handleSave} loading={save.isPending} disabled={loading || !changed}>
        {saved !== null ? '수정 저장' : '저장'}
      </Button>
      {save.error && <ErrorBox error={save.error} />}
    </div>
  );
}

/* ---------- 목표 수정 ---------- */

interface TargetDialogProps {
  yearKey: string;
  monthKey: string;
  yearTarget: number;
  monthTarget: number;
  onClose: () => void;
}

function TargetDialog({ yearKey, monthKey, yearTarget, monthTarget, onClose }: TargetDialogProps) {
  const toast = useToast();
  const save = useSaveSalesTarget();
  const [year, setYear] = useState(yearTarget ? String(yearTarget) : '');
  const [month, setMonth] = useState(monthTarget ? String(monthTarget) : '');

  const handleSave = async () => {
    try {
      await save.mutateAsync({ period: yearKey, amount: Number(year || 0) });
      await save.mutateAsync({ period: monthKey, amount: Number(month || 0) });
      toast('목표를 저장했어요');
      onClose();
    } catch {
      // ErrorBox 로 보여준다
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="매출 목표"
      footer={
        <>
          <Button variant="weak" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={handleSave} loading={save.isPending}>
            저장
          </Button>
        </>
      }
    >
      <div className={p.stack} style={{ gap: 12, marginTop: 16 }}>
        <TextField
          label={`${yearKey}년 연간 목표(원)`}
          inputMode="numeric"
          value={formatInput(year)}
          onChange={(e) => setYear(onlyDigits(e.target.value))}
        />
        <TextField
          label={`${Number(monthKey.slice(5))}월 목표 FCST(원)`}
          inputMode="numeric"
          value={formatInput(month)}
          onChange={(e) => setMonth(onlyDigits(e.target.value))}
        />
        {save.error && <ErrorBox error={save.error} />}
      </div>
    </Dialog>
  );
}
