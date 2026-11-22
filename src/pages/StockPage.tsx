import { useState } from "react";
import { Button } from "@/components/Button";
import { SelectField, TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import {
  PRODUCT_CATEGORY_LABEL,
  PRODUCT_CATEGORY_ORDER,
  type ProductCategory,
} from "@/api/types";
import {
  Badge,
  Card,
  EmptyState,
  ErrorBox,
  PageHeader,
  Skeleton,
  type BadgeTone,
} from "@/components/ui";
import {
  safetyStockOf,
  useStockMatrix,
  type StockMatrixRow,
} from "@/features/inventory/useStockMatrix";
import { cx } from "@/lib/cx";
import { downloadCsv } from "@/lib/csv";
import { formatNumber, today } from "@/lib/format";
import * as s from "./pages.css";

type StockFilter = "all" | "low";
type SeasonFilter = "all" | ProductCategory;
type StockSort = "name" | "season" | "stock_desc" | "stock_asc";

const SORT_LABEL: Record<StockSort, string> = {
  name: "이름순",
  season: "계절순",
  stock_desc: "재고 많은순",
  stock_asc: "재고 적은순",
};

const SEASON_TONE: Record<ProductCategory, BadgeTone> = {
  winter: "blue",
  summer: "orange",
  etc: "grey",
};

const byName = (a: StockMatrixRow, b: StockMatrixRow) =>
  a.product.name.localeCompare(b.product.name, "ko");
const seasonRank = (row: StockMatrixRow) =>
  PRODUCT_CATEGORY_ORDER.indexOf(row.product.category);

const SORTERS: Record<
  StockSort,
  (a: StockMatrixRow, b: StockMatrixRow) => number
> = {
  name: byName,
  season: (a, b) => seasonRank(a) - seasonRank(b) || byName(a, b),
  stock_desc: (a, b) => b.total - a.total || byName(a, b),
  stock_asc: (a, b) => a.total - b.total || byName(a, b),
};

function SeasonBadge({ category }: { category: ProductCategory }) {
  return (
    <Badge tone={SEASON_TONE[category]}>
      {PRODUCT_CATEGORY_LABEL[category]}
    </Badge>
  );
}

export function StockPage() {
  const [date, setDate] = useState(today());
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [season, setSeason] = useState<SeasonFilter>("all");
  const [sort, setSort] = useState<StockSort>("name");

  const { rows, warehouses, isLoading, error } = useStockMatrix(date);

  const normalized = keyword.trim().toLowerCase();
  const visibleRows = rows
    .filter((row) => {
      if (filter === "low" && !row.isLow) return false;
      if (season !== "all" && row.product.category !== season) return false;
      if (!normalized) return true;
      return (
        row.product.name.toLowerCase().includes(normalized) ||
        row.product.sku.toLowerCase().includes(normalized)
      );
    })
    .sort(SORTERS[sort]);

  /** 합계 머리글 누르기: 재고 많은순 → 적은순 → 이름순 */
  const toggleStockSort = () =>
    setSort((prev) =>
      prev === "stock_desc"
        ? "stock_asc"
        : prev === "stock_asc"
          ? "name"
          : "stock_desc",
    );
  const stockSortMark =
    sort === "stock_desc" ? " ▼" : sort === "stock_asc" ? " ▲" : "";

  const handleDownload = () => {
    downloadCsv(
      `재고현황_${date}.csv`,
      [
        "제품명",
        "SKU",
        "사용 계절",
        ...warehouses.map((w) => w.name),
        "합계",
        "안전재고",
      ],
      visibleRows.map((row) => [
        row.product.name,
        row.product.sku,
        PRODUCT_CATEGORY_LABEL[row.product.category],
        ...warehouses.map((w) => row.byWarehouse[w.id] ?? 0),
        row.total,
        safetyStockOf(row.product),
      ]),
    );
  };

  return (
    <div className={s.stack}>
      <PageHeader
        title="재고 현황"
        description="기준일까지의 입출고 기록을 합산한 재고예요. (안전재고 미달 기준 = 15)"
        actions={
          <Button
            variant="weak"
            size="sm"
            onClick={handleDownload}
            disabled={visibleRows.length === 0}>
            <Icon name="download" size={16} />
            엑셀 다운로드
          </Button>
        }
      />

      <div className={s.stockLayout}>
        <Card className={s.stockFilters}>
          <div className={cx(s.filterBar, s.filterBarWide)}>
            <TextField
              label="기준일"
              type="date"
              value={date}
              max={today()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
            <SelectField
              label="보기"
              value={filter}
              onChange={(e) => setFilter(e.target.value as StockFilter)}>
              <option value="all">전체 제품</option>
              <option value="low">안전재고 미달만</option>
            </SelectField>
            <SelectField
              label="사용 계절"
              value={season}
              onChange={(e) => setSeason(e.target.value as SeasonFilter)}>
              <option value="all">전체 계절</option>
              {PRODUCT_CATEGORY_ORDER.map((key) => (
                <option key={key} value={key}>
                  {PRODUCT_CATEGORY_LABEL[key]}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="정렬"
              value={sort}
              onChange={(e) => setSort(e.target.value as StockSort)}>
              {(Object.keys(SORT_LABEL) as StockSort[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABEL[key]}
                </option>
              ))}
            </SelectField>
            <TextField
              label="검색"
              placeholder="제품명 또는 SKU"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              containerClassName={s.filterWide}
            />
          </div>
        </Card>

        <div className={s.stockMain}>
          {error && <ErrorBox error={error} />}

          <Card>
            {isLoading ? (
              <div className={s.stack}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} height={36} />
                ))}
              </div>
            ) : visibleRows.length === 0 ? (
              <EmptyState
                title={
                  rows.length === 0
                    ? "등록된 제품이 없어요"
                    : "조건에 맞는 제품이 없어요"
                }
                description={
                  rows.length === 0
                    ? "기준 정보에서 제품을 먼저 등록해주세요"
                    : undefined
                }
              />
            ) : (
              <>
                <div className={cx(s.tableWrap, s.responsiveOnly.desktop)}>
                  <table className={cx(s.table, s.fixedTable)}>
                    <thead>
                      <tr>
                        <th className={cx(s.th, s.productCol)}>제품</th>
                        <th className={s.th}>계절</th>
                        {warehouses.map((w) => (
                          <th key={w.id} className={cx(s.th, s.num)}>
                            {w.name}
                          </th>
                        ))}
                        <th className={cx(s.th, s.num)}>
                          <button
                            type="button"
                            className={s.sortButton}
                            onClick={toggleStockSort}
                            title="눌러서 재고순 정렬">
                            합계{stockSortMark}
                          </button>
                        </th>
                        <th className={cx(s.th, s.num)}>안전재고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row) => (
                        <tr key={row.product.id}>
                          <td className={s.td} title={row.product.name}>
                            <p className={cx(s.strong, s.ellipsis)}>
                              {row.product.name}
                              {!row.product.isActive && <Badge>미사용</Badge>}
                            </p>
                            <p className={cx(s.muted, s.ellipsis)}>{row.product.sku}</p>
                          </td>
                          <td className={s.td}>
                            <SeasonBadge category={row.product.category} />
                          </td>
                          {warehouses.map((w) => (
                            <td key={w.id} className={cx(s.td, s.num)}>
                              {formatNumber(row.byWarehouse[w.id] ?? 0)}
                            </td>
                          ))}
                          <td
                            className={cx(
                              s.td,
                              s.num,
                              s.strong,
                              row.isLow && s.minus,
                            )}>
                            {formatNumber(row.total)}
                          </td>
                          <td className={cx(s.td, s.num)}>
                            {row.isLow ? (
                              <Badge tone="red">부족</Badge>
                            ) : null}{" "}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className={s.responsiveOnly.mobile}>
                  {visibleRows.map((row) => (
                    <li key={row.product.id} className={s.listItem}>
                      <div className={s.listMain}>
                        <p className={s.listTitle}>
                          {row.product.name}
                          <SeasonBadge category={row.product.category} />
                          {row.isLow && <Badge tone="red">부족</Badge>}
                        </p>
                        <div className={s.chips}>
                          {warehouses.map((w) => (
                            <span key={w.id} className={s.chip}>
                              {w.name}{" "}
                              {formatNumber(row.byWarehouse[w.id] ?? 0)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className={cx(s.listRight, row.isLow && s.minus)}>
                        {formatNumber(row.total)}개
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
