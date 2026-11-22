import type { Warehouse } from '@/api/types';
import { sumStock, type StockMatrixRow } from '@/features/inventory/useStockMatrix';
import { cx } from '@/lib/cx';
import { formatNumber } from '@/lib/format';
import * as p from '@/pages/pages.css';
import * as s from './FeaturedStock.css';

interface FeaturedStockProps {
  rows: StockMatrixRow[];
  warehouses: Warehouse[];
}

/** 0 은 흐린 대시로 보여서 실제 숫자가 눈에 잘 들어오게 한다 */
function Num({ value, strong }: { value: number; strong?: boolean }) {
  if (value === 0) return <span className={s.zero}>–</span>;
  return <span className={strong ? s.strong : undefined}>{formatNumber(value)}</span>;
}

/**
 * 주요 제품 재고량·재고액.
 * 수량 / 단가 / 금액을 묶은 표 (좁은 화면에서는 가로로 스크롤).
 */
export function FeaturedStock({ rows, warehouses }: FeaturedStockProps) {
  const qtyOf = (row: StockMatrixRow, warehouseId: number) => row.byWarehouse[warehouseId] ?? 0;
  const valueOf = (row: StockMatrixRow, warehouseId: number) => qtyOf(row, warehouseId) * row.product.unitCost;

  return (
    <div className={p.tableWrap}>
        <table className={s.table}>
          <colgroup>
            <col className={s.nameCol} />
            {warehouses.map((w) => (
              <col key={`q${w.id}`} />
            ))}
            <col />
            <col />
            {warehouses.map((w) => (
              <col key={`v${w.id}`} />
            ))}
            <col />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} className={cx(s.th, s.nameTh)}>
                제품
              </th>
              <th colSpan={warehouses.length + 1} className={cx(s.th, s.group, s.groupStart)}>
                재고 수량 (개)
              </th>
              <th rowSpan={2} className={cx(s.th, s.groupStart, s.right)}>
                입고단가 (원)
              </th>
              <th colSpan={warehouses.length + 1} className={cx(s.th, s.group, s.groupStart)}>
                재고 금액 (원)
              </th>
            </tr>
            <tr>
              {warehouses.map((w, i) => (
                <th key={`q${w.id}`} className={cx(s.th, s.right, i === 0 && s.groupStart)}>
                  {w.name}
                </th>
              ))}
              <th className={cx(s.th, s.right)}>합계</th>
              {warehouses.map((w, i) => (
                <th key={`v${w.id}`} className={cx(s.th, s.right, i === 0 && s.groupStart)}>
                  {w.name}
                </th>
              ))}
              <th className={cx(s.th, s.right)}>합계</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.product.id} className={s.row}>
                <td className={cx(s.td, s.name)}>{row.product.name}</td>
                {warehouses.map((w, i) => (
                  <td key={`q${w.id}`} className={cx(s.td, s.right, i === 0 && s.groupStart)}>
                    <Num value={qtyOf(row, w.id)} />
                  </td>
                ))}
                <td className={cx(s.td, s.right)}>
                  <Num value={row.total} strong />
                </td>
                <td className={cx(s.td, s.right, s.groupStart, s.muted)}>
                  <Num value={row.product.unitCost} />
                </td>
                {warehouses.map((w, i) => (
                  <td key={`v${w.id}`} className={cx(s.td, s.right, i === 0 && s.groupStart)}>
                    <Num value={valueOf(row, w.id)} />
                  </td>
                ))}
                <td className={cx(s.td, s.right)}>
                  <Num value={row.value} strong />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={s.footRow}>
              <td className={cx(s.td, s.name)}>합계</td>
              {warehouses.map((w, i) => (
                <td key={`q${w.id}`} className={cx(s.td, s.right, i === 0 && s.groupStart)}>
                  {formatNumber(sumStock(rows, w.id).quantity)}
                </td>
              ))}
              <td className={cx(s.td, s.right)}>{formatNumber(sumStock(rows).quantity)}</td>
              <td className={cx(s.td, s.groupStart)} />
              {warehouses.map((w, i) => (
                <td key={`v${w.id}`} className={cx(s.td, s.right, i === 0 && s.groupStart)}>
                  {formatNumber(sumStock(rows, w.id).value)}
                </td>
              ))}
              <td className={cx(s.td, s.right)}>{formatNumber(sumStock(rows).value)}</td>
            </tr>
          </tfoot>
        </table>
    </div>
  );
}
