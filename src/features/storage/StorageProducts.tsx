import { useMemo, useState } from "react";
import { useProducts, useStorageItems, useUpdateProduct } from "@/api/queries";
import type { Product, ProductPatch, StorageDay } from "@/api/types";
import { Badge, Card, EmptyState, ErrorBox, Skeleton } from "@/components/ui";
import { useStockMatrix } from "@/features/inventory/useStockMatrix";
import { cx } from "@/lib/cx";
import { downloadCsv } from "@/lib/csv";
import { formatDateLabel, formatNumber } from "@/lib/format";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import * as p from "@/pages/pages.css";
import * as s from "@/pages/StoragePage.css";
import { StickyMemo } from "./StickyMemo";
import {
  computeStorageRows,
  findStorageWarehouse,
  type StorageRow,
} from "./calc";

/** 적재수 입력: 바뀐 값만 포커스가 빠질 때 저장 */
function NumberCell({
  value,
  label,
  onCommit,
}: {
  value: number | null;
  label: string;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(value ? String(value) : "");
  return (
    <input
      className={s.capInput}
      inputMode="numeric"
      aria-label={label}
      value={text}
      placeholder="-"
      onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 6))}
      onBlur={() => {
        const next = text ? Number(text) : null;
        if ((next || null) !== (value || null)) onCommit(next);
      }}
    />
  );
}

function CodeCell({
  value,
  onCommit,
}: {
  value: string | null;
  onCommit: (value: string | null) => void;
}) {
  const [text, setText] = useState(value ?? "");
  return (
    <input
      className={s.codeInput}
      aria-label="이지어드민 상품코드"
      value={text}
      placeholder="-"
      onChange={(e) => setText(e.target.value.slice(0, 20))}
      onBlur={() => {
        const next = text.trim() || null;
        if (next !== value) onCommit(next);
      }}
    />
  );
}

interface StorageProductsProps {
  date: string;
  /** 그날 업체가 알려준 팔레트·경량랙 수 (비교용) */
  reported?: StorageDay;
  /** 그날 메모 (한 줄 = 메모지 한 장) */
  memo: string | null;
}

/**
 * 제품별 보관비 계산표 (스타팩 재고 기준).
 * 팔레트 수 = 올림(재고 ÷ 팔레트 적재수), 경량랙 수 = 올림(재고 ÷ 경량랙 적재수).
 */
export function StorageProducts({
  date,
  reported,
  memo,
}: StorageProductsProps) {
  const {
    rows: matrix,
    warehouses,
    isLoading: matrixLoading,
    error: matrixError,
  } = useStockMatrix(date);
  const products = useProducts();
  const items = useStorageItems(date);
  const update = useUpdateProduct();
  const [showAll, setShowAll] = useState(false);

  const warehouse = findStorageWarehouse(warehouses);
  const palletPrice = reported?.palletPrice ?? 550;
  const rackPrice = reported?.rackPrice ?? 165;
  /** 보관비 저장 때 남긴 내역이 있으면 그걸 보여주고, 없으면 그날 재고로 계산 */
  const snapshot = (items.data ?? []).length > 0;
  const isLoading = matrixLoading || items.isLoading || products.isLoading;
  const error = matrixError ?? items.error ?? products.error;

  const rows = useMemo<StorageRow[]>(() => {
    const byCode = (a: StorageRow, b: StorageRow) =>
      (a.product.ezadminCode ?? "~").localeCompare(
        b.product.ezadminCode ?? "~",
      ) || a.product.name.localeCompare(b.product.name);
    if (snapshot) {
      const productById = new Map(
        (products.data ?? []).map((product) => [product.id, product]),
      );
      return (items.data ?? [])
        .flatMap((item) => {
          const product = productById.get(item.productId);
          return product ? [{ ...item, product }] : [];
        })
        .sort(byCode);
    }
    if (!warehouse) return [];
    return computeStorageRows(matrix, warehouse, {
      pallet: palletPrice,
      rack: rackPrice,
    })
      .filter((row) => showAll || row.stock > 0 || row.product.ezadminCode)
      .sort(byCode);
  }, [
    snapshot,
    items.data,
    products.data,
    matrix,
    warehouse,
    palletPrice,
    rackPrice,
    showAll,
  ]);

  const totals = rows.reduce(
    (sum, row) => ({
      pallets: sum.pallets + row.pallets,
      racks: sum.racks + row.racks,
      amount: sum.amount + row.amount,
    }),
    { pallets: 0, racks: 0, amount: 0 },
  );
  const noCapacity = rows.filter(
    (row) =>
      row.stock > 0 && !row.exempt && !row.palletCapacity && !row.rackCapacity,
  );

  const patch = (product: Product, change: ProductPatch) =>
    update.mutate({ id: product.id, patch: change });

  const handleDownload = () =>
    downloadCsv(
      `보관비_제품별_${date}.csv`,
      [
        "상품코드",
        "상품명",
        "SKU",
        "정상재고",
        "팔레트 적재",
        "경량랙 적재",
        "팔레트 수",
        "경량랙 수",
        "보관비",
        "제외",
      ],
      rows.map((row) => [
        row.product.ezadminCode ?? "",
        row.product.name,
        row.product.sku,
        row.stock,
        row.palletCapacity ?? "",
        row.rackCapacity ?? "",
        row.pallets,
        row.racks,
        row.amount,
        row.exempt ? "제외" : "",
      ]),
    );

  const diffBadge = (computed: number, reportedValue: number | undefined) => {
    if (reportedValue === undefined) return null;
    const diff = computed - reportedValue;
    if (diff === 0) return <Badge tone="green">일치</Badge>;
    return (
      <Badge tone="orange">
        {diff > 0 ? `계산이 ${diff} 많음` : `계산이 ${-diff} 적음`}
      </Badge>
    );
  };

  return (
    <Card>
      <div className={s.productsHead}>
        <div>
          <h2 className={s.sectionTitle}>
            {formatDateLabel(date)} 일일 보관비 전체 내역
          </h2>
          <p className={s.help}>
            {snapshot ? (
              <>
                <Badge tone="green">저장된 내역</Badge> 보관비 저장 때의{" "}
                {warehouse?.name ?? "스타팩"} 재고 기준 · 부가세 포함
              </>
            ) : (
              `${warehouse?.name ?? "스타팩"} ${formatDateLabel(date)} 재고로 계산 (아직 저장 안 됨) · 부가세 포함`
            )}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {!snapshot && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "보관 대상만" : "모든 제품"}
              </Button>
            )}
            <Button
              size="sm"
              variant="weak"
              onClick={handleDownload}
              disabled={rows.length === 0}
            >
              <Icon name="download" size={16} />
              엑셀
            </Button>
          </div>
        </div>
        <StickyMemo key={date} date={date} memo={memo} />
      </div>

      <div className={s.compare}>
        <span>
          계산: 팔레트 <b>{formatNumber(totals.pallets)}</b> · 경량랙{" "}
          <b>{formatNumber(totals.racks)}</b> ·{" "}
          <b>{formatNumber(totals.amount)}원</b>
        </span>
        {reported && (
          <>
            <span>
              / 업체: 팔레트 {formatNumber(reported.palletQty)} · 경량랙{" "}
              {formatNumber(reported.rackQty)}
            </span>
            {diffBadge(totals.pallets, reported.palletQty)}
          </>
        )}
      </div>
      <p className={s.help}>
        {snapshot
          ? "저장 시점의 재고·적재수 그대로예요. 바꾸려면 보관비 탭에서 이 날짜를 다시 저장하세요. "
          : "적재수·상품코드는 칸을 고친 뒤 다른 곳을 누르면 저장돼요. '제외'는 가입고처럼 보관비에서 빼는 제품이에요."}
        {noCapacity.length > 0 && (
          <span className={s.warn}>
            {" "}
            적재수가 없는 재고 {noCapacity.length}개는 계산에서 빠졌어요.
          </span>
        )}
      </p>

      {error && <ErrorBox error={error} />}
      {update.error && <ErrorBox error={update.error} />}

      {isLoading ? (
        <div className={p.stack} style={{ marginTop: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={36} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="보관 중인 제품이 없어요" />
      ) : (
        <>
          <div
            className={cx(p.tableWrap, p.responsiveOnly.desktop)}
            style={{ marginTop: 8 }}
          >
            <table className={p.table}>
              <thead>
                <tr>
                  <th className={p.th}>상품코드</th>
                  <th className={p.th}>상품명</th>
                  <th className={cx(p.th, p.num)}>정상재고</th>
                  <th className={cx(p.th, p.num)}>팔레트 적재</th>
                  <th className={cx(p.th, p.num)}>경량랙 적재</th>
                  <th className={cx(p.th, p.num)}>팔레트 수</th>
                  <th className={cx(p.th, p.num)}>경량랙 수</th>
                  <th className={cx(p.th, p.num)}>보관비</th>
                  <th className={p.th}>제외</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.product.id}
                    className={cx(row.exempt && s.exemptRow)}
                  >
                    <td className={cx(p.td, s.compactTd)}>
                      <CodeCell
                        value={row.product.ezadminCode}
                        onCommit={(v) => patch(row.product, { ezadminCode: v })}
                      />
                    </td>
                    <td className={cx(p.td, s.compactTd)}>
                      <div className={p.strong}>{row.product.name}</div>
                      <div className={p.muted}>{row.product.sku}</div>
                    </td>
                    <td className={cx(p.td, s.compactTd, p.num)}>
                      {formatNumber(row.stock)}
                    </td>
                    <td className={cx(p.td, s.compactTd, p.num)}>
                      {snapshot ? (
                        formatNumber(row.palletCapacity ?? 0) || "-"
                      ) : (
                        <NumberCell
                          label={`${row.product.name} 팔레트 적재수`}
                          value={row.product.palletCapacity}
                          onCommit={(v) =>
                            patch(row.product, { palletCapacity: v })
                          }
                        />
                      )}
                    </td>
                    <td className={cx(p.td, s.compactTd, p.num)}>
                      {snapshot ? (
                        formatNumber(row.rackCapacity ?? 0) || "-"
                      ) : (
                        <NumberCell
                          label={`${row.product.name} 경량랙 적재수`}
                          value={row.product.rackCapacity}
                          onCommit={(v) =>
                            patch(row.product, { rackCapacity: v })
                          }
                        />
                      )}
                    </td>
                    <td className={cx(p.td, s.compactTd, p.num)}>
                      {row.pallets || <span className={s.missing}>-</span>}
                    </td>
                    <td className={cx(p.td, s.compactTd, p.num)}>
                      {row.racks || <span className={s.missing}>-</span>}
                    </td>
                    <td className={cx(p.td, s.compactTd, p.num, p.strong)}>
                      {row.amount ? (
                        formatNumber(row.amount)
                      ) : (
                        <span className={s.missing}>-</span>
                      )}
                    </td>
                    <td className={cx(p.td, s.compactTd)}>
                      <input
                        type="checkbox"
                        aria-label={`${row.product.name} 보관비 제외`}
                        checked={row.exempt}
                        disabled={snapshot}
                        onChange={(e) =>
                          patch(row.product, {
                            storageExempt: e.target.checked,
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
                <tr className={s.footRow}>
                  <td className={cx(p.td, s.compactTd)} colSpan={5}>
                    합계
                  </td>
                  <td className={cx(p.td, s.compactTd, p.num)}>
                    {formatNumber(totals.pallets)}
                  </td>
                  <td className={cx(p.td, s.compactTd, p.num)}>
                    {formatNumber(totals.racks)}
                  </td>
                  <td className={cx(p.td, s.compactTd, p.num)}>
                    {formatNumber(totals.amount)}
                  </td>
                  <td className={cx(p.td, s.compactTd)} />
                </tr>
              </tbody>
            </table>
          </div>

          <div className={p.responsiveOnly.mobile}>
            {rows.map((row) => (
              <div
                key={row.product.id}
                className={cx(s.productCard, row.exempt && s.exemptRow)}
              >
                <div className={s.productCardTop}>
                  <span>
                    {row.product.name}
                    {row.product.ezadminCode && (
                      <span className={p.muted}>
                        {" "}
                        · {row.product.ezadminCode}
                      </span>
                    )}
                  </span>
                  <span>
                    {row.amount ? `${formatNumber(row.amount)}원` : "-"}
                  </span>
                </div>
                <div className={s.productCardInputs}>
                  <span>재고 {formatNumber(row.stock)}</span>
                  {snapshot ? (
                    <span>
                      적재 팔레트 {row.palletCapacity ?? "-"} · 랙{" "}
                      {row.rackCapacity ?? "-"}
                      {row.exempt && " · 제외"}
                    </span>
                  ) : (
                    <>
                      <span>팔레트</span>
                      <NumberCell
                        label={`${row.product.name} 팔레트 적재수`}
                        value={row.product.palletCapacity}
                        onCommit={(v) =>
                          patch(row.product, { palletCapacity: v })
                        }
                      />
                      <span>랙</span>
                      <NumberCell
                        label={`${row.product.name} 경량랙 적재수`}
                        value={row.product.rackCapacity}
                        onCommit={(v) =>
                          patch(row.product, { rackCapacity: v })
                        }
                      />
                      <label>
                        <input
                          type="checkbox"
                          checked={row.product.storageExempt}
                          onChange={(e) =>
                            patch(row.product, {
                              storageExempt: e.target.checked,
                            })
                          }
                        />{" "}
                        제외
                      </label>
                    </>
                  )}
                </div>
                <div className={p.muted} style={{ marginTop: 4 }}>
                  팔레트 {row.pallets} · 경량랙 {row.racks}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
