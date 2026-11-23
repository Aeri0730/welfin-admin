import { useMemo, useRef, useState } from 'react';
import { useCreateMovements, useProducts, useStock, useWarehouses } from '@/api/queries';
import type { Product } from '@/api/types';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Dropdown } from '@/components/Dropdown';
import { SelectField, TextAreaField } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import {
  buildCompare,
  createMatcher,
  detectColumns,
  editSiteQuantity,
  extractRows,
  hasDiff,
  loadAliases,
  loadSiteData,
  normalizeName,
  saveAliases,
  saveSiteData,
  SITE_KEYS,
  SITES,
  sortRows,
  tableFromPaste,
  tablesFromFile,
  type AliasMap,
  type ColumnPick,
  type SiteKey,
  type Table,
} from '@/features/inventory/siteStock';
import { CompareTable } from '@/features/inventory/CompareTable';
import { EditableQty, Qty } from '@/features/inventory/EditableQty';
import { SiteCard } from '@/features/inventory/SiteCard';
import { cx } from '@/lib/cx';
import { formatNumber, today } from '@/lib/format';
import { sumBy } from '@/lib/sum';
import * as st from './StockComparePage.css';
import * as s from './pages.css';

type View = 'compare' | SiteKey;

/** 머리글을 못 찾은 파일: 열을 직접 고르게 한다 */
interface PendingPick {
  site: SiteKey;
  fileName: string;
  table: Table;
  pick: ColumnPick;
}

/** 우리 재고를 표에서 고칠 때: 차이만큼 '조정' 기록을 남긴다 */
interface AdjustTarget {
  productId: number;
  name: string;
  from: number;
  to: number;
}

export function StockComparePage() {
  const toast = useToast();
  const products = useProducts();
  const warehouses = useWarehouses();
  const stock = useStock();
  const createMovements = useCreateMovements();

  const [data, setData] = useState(loadSiteData);
  const [aliases, setAliases] = useState<AliasMap>(loadAliases);
  const [view, setView] = useState<View>('compare');
  const [query, setQuery] = useState('');
  const [diffOnly, setDiffOnly] = useState(false);
  const [warehouseSel, setWarehouseSel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPick | null>(null);
  const [pasteSite, setPasteSite] = useState<SiteKey | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [adjust, setAdjust] = useState<AdjustTarget | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadSite = useRef<SiteKey>('ezadmin');

  // 비교할 우리 창고: 고르지 않았으면 '스타팩' 이 들어간 창고, 없으면 전체
  const warehouseId = useMemo(() => {
    if (warehouseSel) return warehouseSel;
    const starpack = warehouses.data?.find((w) => w.name.includes('스타팩'));
    return starpack ? String(starpack.id) : 'all';
  }, [warehouseSel, warehouses.data]);
  const warehouseName = warehouses.data?.find((w) => String(w.id) === warehouseId)?.name;

  const ourStock = useMemo(() => {
    const map = new Map<number, number>();
    for (const level of stock.data ?? []) {
      if (warehouseId !== 'all' && String(level.warehouseId) !== warehouseId) continue;
      map.set(level.productId, (map.get(level.productId) ?? 0) + level.quantity);
    }
    return map;
  }, [stock.data, warehouseId]);

  const productList = useMemo(() => products.data ?? [], [products.data]);
  const productById = useMemo(() => new Map(productList.map((p) => [p.id, p])), [productList]);
  const match = useMemo(() => createMatcher(productList, aliases), [productList, aliases]);
  const uploaded = SITE_KEYS.filter((k) => data[k]);

  const compareRows = useMemo(
    () => buildCompare(productList, ourStock, data, match),
    [productList, ourStock, data, match],
  );
  const diffCount = compareRows.filter((row) => hasDiff(row, uploaded)).length;

  /** 사이트 시트 줄: 주요 제품 먼저, 나머지는 많은 순 */
  const siteRowsOf = (key: SiteKey) =>
    sortRows(
      (data[key]?.rows ?? []).map((row) => {
        const m = match(key, row);
        const product: Product | undefined = m.productId !== null ? productById.get(m.productId) : undefined;
        return { ...row, match: m, product, pinOrder: product?.reportOrder ?? null };
      }),
      (row) => row.quantity,
    );

  /* ---------- 파일 받기 ---------- */
  const saveData = (next: typeof data) => {
    setData(next);
    saveSiteData(next);
  };

  const commit = (target: SiteKey, fileName: string, table: Table, pick: ColumnPick) => {
    const rows = extractRows(table, pick, target);
    if (rows.length === 0) {
      setError('읽을 수 있는 재고 줄이 없어요. 상품명·수량 열을 다시 확인해주세요');
      return;
    }
    saveData({ ...data, [target]: { fileName, uploadedAt: new Date().toISOString(), rows } });
    setPending(null);
    setError(null);
    toast(`${SITES[target].label} ${rows.length}종 · ${formatNumber(sumBy(rows, (r) => r.quantity))}개를 불러왔어요`);
  };

  const accept = (target: SiteKey, fileName: string, tables: Table[]) => {
    for (const table of tables) {
      const pick = detectColumns(table, target);
      if (pick) return commit(target, fileName, table, pick);
    }
    const table = tables.find((t) => t.length > 0);
    if (!table) return setError('비어 있는 파일이에요');
    setPending({ site: target, fileName, table, pick: { headerRow: 0, nameCol: 0, qtyCol: 1, codeCol: null } });
  };

  const openUpload = (key: SiteKey) => {
    uploadSite.current = key;
    fileRef.current?.click();
  };

  const handleFile = async (file: File) => {
    setError(null);
    try {
      accept(uploadSite.current, file.name, await tablesFromFile(file));
    } catch {
      setError('파일을 읽지 못했어요. 엑셀(.xls, .xlsx)이나 .csv 파일인지 확인해주세요');
    }
  };

  const handlePaste = () => {
    if (!pasteSite) return;
    const table = tableFromPaste(pasteText);
    if (table.length === 0) return;
    accept(pasteSite, '붙여넣기', [table]);
    setPasteText('');
    setPasteSite(null);
  };

  const removeSite = (key: SiteKey) => {
    const next = { ...data };
    delete next[key];
    saveData(next);
    if (view === key) setView('compare');
  };

  /* ---------- 표에서 고치기 ---------- */
  const editSite = (key: SiteKey, names: string[], fallbackName: string, value: number) => {
    const current = data[key];
    if (current) saveData({ ...data, [key]: editSiteQuantity(current, names, fallbackName, value) });
  };

  const setAlias = (key: SiteKey, name: string, value: string) => {
    const siteMap = { ...aliases[key] };
    const aliasKey = normalizeName(name);
    if (value === '') delete siteMap[aliasKey];
    else siteMap[aliasKey] = value === 'none' ? null : Number(value);
    const next = { ...aliases, [key]: siteMap };
    setAliases(next);
    saveAliases(next);
  };

  const saveAdjust = () => {
    if (!adjust || warehouseId === 'all') return;
    const diff = adjust.to - adjust.from;
    const id = Number(warehouseId);
    createMovements.mutate(
      {
        type: 'adjust',
        movedOn: today(),
        fromWarehouseId: diff < 0 ? id : null,
        toWarehouseId: diff > 0 ? id : null,
        partnerId: null,
        memo: '사이트 재고 비교에서 수정',
        items: [{ productId: adjust.productId, quantity: Math.abs(diff) }],
        allowNegative: true,
      },
      {
        onSuccess: () => {
          toast(`${adjust.name} 재고를 ${formatNumber(adjust.to)}개로 맞췄어요`);
          setAdjust(null);
        },
      },
    );
  };

  /* ---------- 보이는 줄 ---------- */
  const q = normalizeName(query);
  const visibleCompare = compareRows.filter((row) => {
    if (diffOnly && !hasDiff(row, uploaded)) return false;
    if (!q) return true;
    return [row.name, ...SITE_KEYS.flatMap((k) => row.sites[k]?.names ?? [])].some((n) => normalizeName(n).includes(q));
  });
  const siteRows = view === 'compare' ? [] : siteRowsOf(view).filter((row) => !q || normalizeName(row.name).includes(q));

  /** 표 아래 합계 카드 (지금 보이는 줄 기준) */
  const totals: Array<{ label: string; value: number; ours?: boolean; diff?: number }> = (() => {
    if (view !== 'compare') return [{ label: `${SITES[view].label} 재고`, value: sumBy(siteRows, (r) => r.quantity) }];
    if (uploaded.length === 0) return [];
    const ours = sumBy(visibleCompare, (r) => r.ours ?? 0);
    return [
      { label: warehouseName ? `우리 재고 · ${warehouseName}` : '우리 재고 · 전체 창고', value: ours, ours: true },
      ...uploaded.map((k) => {
        const value = sumBy(visibleCompare, (r) => r.sites[k]?.quantity ?? 0);
        return { label: SITES[k].label, value, diff: value - ours };
      }),
    ];
  })();

  const handleDownload = async () => {
    const XLSX = await import('xlsx');
    const book = XLSX.utils.book_new();
    const compareAoa = [
      ['상품명', '우리 재고', ...uploaded.map((k) => SITES[k].label)],
      ...visibleCompare.map((row) => [row.name, row.ours ?? '', ...uploaded.map((k) => row.sites[k]?.quantity ?? 0)]),
    ];
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(compareAoa), '비교');
    for (const key of uploaded) {
      const rows = siteRowsOf(key);
      const aoa = [['상품명', '재고'], ...rows.map((r) => [r.name, r.quantity]), ['합계', sumBy(rows, (r) => r.quantity)]];
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(aoa), SITES[key].label);
    }
    XLSX.writeFile(book, `사이트재고비교_${today()}.xlsx`);
  };

  const loading = products.isLoading || stock.isLoading;
  const loadError = products.error ?? stock.error;

  return (
    <div className={s.stack}>
      <PageHeader title="사이트 재고 비교" description="사이트에서 받은 재고 파일을 올리면 우리 재고와 바로 비교해요" />

      <input
        ref={fileRef}
        type="file"
        accept=".xls,.xlsx,.csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleFile(file);
        }}
      />

      <div className={st.sites}>
        {SITE_KEYS.map((key) => (
          <SiteCard
            key={key}
            siteKey={key}
            data={data[key]}
            onUpload={() => openUpload(key)}
            onPaste={() => setPasteSite(key)}
            onRemove={() => removeSite(key)}
          />
        ))}
      </div>
      {error && <p className={st.errorText}>{error}</p>}
      {loadError && <ErrorBox error={loadError} />}

      <section className={st.board}>
        <div className={st.boardHead}>
          <div className={st.boardTitleRow}>
            <div>
              <h2 className={st.boardTitle}>{view === 'compare' ? '재고 비교' : `${SITES[view].label} 재고`}</h2>
              <p className={st.boardSub}>
                {view !== 'compare' ? (
                  <>
                    {siteRows.length}종 · 숫자를 누르면 고칠 수 있어요
                  </>
                ) : uploaded.length === 0 ? (
                  '위에서 사이트 파일을 올려주세요'
                ) : diffCount > 0 ? (
                  <>
                    {compareRows.length}종 중 <span className={st.boardSubStrong}>{diffCount}종</span>이 우리 재고와 달라요
                  </>
                ) : (
                  <span className={st.boardSubOk}>모든 제품이 우리 재고와 같아요</span>
                )}
              </p>
            </div>
            <Button variant="weak" size="sm" className={st.softButton} onClick={() => void handleDownload()} disabled={uploaded.length === 0}>
              <Icon name="download" size={16} />
              엑셀로 받기
            </Button>
          </div>

          <div className={st.segment} role="tablist" aria-label="보기">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'compare'}
              className={st.segmentItem}
              onClick={() => setView('compare')}
            >
              비교
            </button>
            {SITE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                className={st.segmentItem}
                disabled={!data[key]}
                onClick={() => setView(key)}
              >
                {SITES[key].label}
              </button>
            ))}
          </div>

          <div className={st.filters}>
            <input className={st.search} placeholder="제품 이름으로 찾기" value={query} onChange={(e) => setQuery(e.target.value)} />
            {view === 'compare' && (
              <>
                <Dropdown
                  ariaLabel="비교할 우리 창고"
                  value={warehouseId}
                  options={[
                    { value: 'all', label: '우리 재고 · 전체 창고' },
                    ...(warehouses.data ?? []).map((w) => ({ value: String(w.id), label: `우리 재고 · ${w.name}` })),
                  ]}
                  onChange={setWarehouseSel}
                />
                <button type="button" className={st.pill} aria-pressed={diffOnly} onClick={() => setDiffOnly((v) => !v)}>
                  다른 것만 보기
                </button>
              </>
            )}
          </div>
        </div>

        <div className={st.tableWrap}>
          {loading ? (
            <div className={st.loading}>
              <Skeleton height={240} />
            </div>
          ) : view === 'compare' ? (
            uploaded.length === 0 ? (
              <div className={st.empty}>
                <p className={st.emptyTitle}>비교할 파일이 없어요</p>
                <p className={st.emptyDesc}>셀메이트·이카운트·이지어드민 중 하나만 올려도 비교할 수 있어요</p>
              </div>
            ) : (
              <CompareTable
                rows={visibleCompare}
                uploaded={uploaded}
                canEditOurs={warehouseId !== 'all'}
                onEditSite={(k, row, value) => editSite(k, row.sites[k]?.names ?? [], row.name, value)}
                onEditOurs={(row, value) => {
                  if (row.productId !== null)
                    setAdjust({ productId: row.productId, name: row.name, from: row.ours ?? 0, to: value });
                }}
              />
            )
          ) : (
            <table className={st.table}>
              <thead>
                <tr>
                  <th className={st.th}>상품명</th>
                  <th className={cx(st.th, st.num)}>재고</th>
                  <th className={st.th}>우리 제품</th>
                </tr>
              </thead>
              <tbody>
                {siteRows.map((row, i) => {
                  const aliasValue = aliases[view][normalizeName(row.name)];
                  return (
                    <tr key={row.name} className={st.row}>
                      <td className={cx(st.td, st.nameCell)} title={row.name}>
                        {row.pinOrder !== null && <span className={st.pinBadge}>주요</span>}
                        <span className={st.productName}>{row.name}</span>
                      </td>
                      <td
                        className={cx(st.td, st.num)}
                        title={row.original !== undefined ? `파일 값: ${row.original ?? '없음'}` : undefined}
                      >
                        <EditableQty
                          value={row.quantity}
                          cellId={`site:${i}`}
                          label={`${row.name} 재고`}
                          onCommit={(value) => editSite(view, [row.name], row.name, value)}
                        >
                          <span>
                            {row.original !== undefined && <span className={st.editedDot} />}
                            <Qty value={row.quantity} />
                          </span>
                        </EditableQty>
                      </td>
                      <td className={st.td}>
                        <Dropdown
                          ariaLabel={`${row.name} 우리 제품 연결`}
                          className={st.linkSelect}
                          value={aliasValue === undefined ? '' : aliasValue === null ? 'none' : String(aliasValue)}
                          onChange={(next) => setAlias(view, row.name, next)}
                          options={[
                            {
                              value: '',
                              label: row.product ? `${row.product.name}${row.match.guessed ? ' (추정)' : ''}` : '연결할 제품 고르기',
                            },
                            { value: 'none', label: '연결 안 함' },
                            ...productList.map((p) => ({ value: String(p.id), label: p.name })),
                          ]}
                        />
                        {!row.product && <span className={st.warnBadge}>미연결</span>}
                        {row.product && row.match.guessed && aliasValue === undefined && (
                          <span className={st.warnBadge}>확인 필요</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 합계: 표 아래 따로 흰 카드 */}
      {!loading && totals.length > 0 && (
        <section className={st.totals} aria-label="합계">
          <h2 className={st.totalsTitle}>합계</h2>
          <div className={st.totalsGrid}>
            {totals.map((t) => (
              <div key={t.label} className={st.totalItem}>
                <p className={cx(st.totalLabel, t.ours && st.totalLabelOurs)}>{t.label}</p>
                <p className={st.totalValue}>
                  <Qty value={t.value} />
                  <span className={st.totalUnit}>개</span>
                </p>
                {t.diff !== undefined && t.diff !== 0 && (
                  <p className={st.totalDiff}>
                    우리 재고보다 {t.diff > 0 ? '+' : ''}
                    {formatNumber(t.diff)}
                  </p>
                )}
                {t.diff === 0 && <p className={st.totalSame}>우리 재고와 같아요</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 붙여넣기 */}
      <Dialog
        open={pasteSite !== null}
        onClose={() => setPasteSite(null)}
        title={pasteSite ? `${SITES[pasteSite].label} 재고 붙여넣기` : ''}
        footer={
          <div className={st.dialogActions}>
            <Button variant="weak" className={st.dialogButton} onClick={() => setPasteSite(null)}>
              닫기
            </Button>
            <Button className={st.dialogButton} onClick={handlePaste} disabled={!pasteText.trim()}>
              불러오기
            </Button>
          </div>
        }
      >
        <TextAreaField
          rows={8}
          value={pasteText}
          hint="엑셀에서 머리글 줄까지 같이 복사해서 붙여넣으세요"
          placeholder={'상품명\t정상재고\nWELFIN-013 웰핀 버그라이트\t3,005'}
          onChange={(e) => setPasteText(e.target.value)}
        />
      </Dialog>

      {/* 열 직접 고르기 */}
      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title="상품명·수량 칸을 골라주세요"
        footer={
          <div className={st.dialogActions}>
            <Button variant="weak" className={st.dialogButton} onClick={() => setPending(null)}>
              취소
            </Button>
            <Button
              className={st.dialogButton}
              onClick={() => pending && commit(pending.site, pending.fileName, pending.table, pending.pick)}
            >
              불러오기
            </Button>
          </div>
        }
      >
        {pending && (
          <div className={st.dialogFields}>
            <p className={st.dialogText}>
              {SITES[pending.site].label} 파일에서 상품명과 수량이 어느 칸인지 찾지 못했어요.
            </p>
            <SelectField
              label="제목 줄"
              value={pending.pick.headerRow}
              onChange={(e) => setPending({ ...pending, pick: { ...pending.pick, headerRow: Number(e.target.value) } })}
            >
              {pending.table.slice(0, 20).map((row, i) => (
                <option key={i} value={i}>
                  {i + 1}번째 줄 · {row.filter(Boolean).slice(0, 3).join(', ').slice(0, 36)}
                </option>
              ))}
            </SelectField>
            {(['nameCol', 'qtyCol'] as const).map((field) => (
              <SelectField
                key={field}
                label={field === 'nameCol' ? '상품명 칸' : '수량 칸'}
                value={pending.pick[field]}
                onChange={(e) => setPending({ ...pending, pick: { ...pending.pick, [field]: Number(e.target.value) } })}
              >
                {(pending.table[pending.pick.headerRow] ?? []).map((cell, i) => (
                  <option key={i} value={i}>
                    {cell || `${i + 1}번째 칸`}
                  </option>
                ))}
              </SelectField>
            ))}
          </div>
        )}
      </Dialog>

      {/* 우리 재고 고치기 */}
      <Dialog
        open={adjust !== null}
        onClose={() => setAdjust(null)}
        title="우리 재고를 고칠까요?"
        footer={
          <div className={st.dialogActions}>
            <Button variant="weak" className={st.dialogButton} onClick={() => setAdjust(null)}>
              아니요
            </Button>
            <Button className={st.dialogButton} onClick={saveAdjust} loading={createMovements.isPending}>
              네, 고칠게요
            </Button>
          </div>
        }
      >
        {adjust && (
          <>
            <p className={st.dialogText}>
              {warehouseName} · {adjust.name}
            </p>
            <div className={st.changeBox}>
              <span className={st.changeFrom}>{formatNumber(adjust.from)}</span>
              <Icon name="swap" size={18} />
              <span>{formatNumber(adjust.to)}개</span>
            </div>
            <p className={st.dialogText}>
              차이 {adjust.to > adjust.from ? '+' : ''}
              {formatNumber(adjust.to - adjust.from)}개를 오늘 날짜 &lsquo;조정&rsquo; 기록으로 남겨요.
            </p>
          </>
        )}
        {createMovements.error && <ErrorBox error={createMovements.error} />}
      </Dialog>
    </div>
  );
}
