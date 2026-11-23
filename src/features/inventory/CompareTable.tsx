// 사이트 재고 비교 화면(StockComparePage)의 조각. 스타일은 화면과 함께 쓴다.
import { cx } from '@/lib/cx';
import { formatNumber } from '@/lib/format';
import * as st from '@/pages/StockComparePage.css';
import { EditableQty, Qty } from './EditableQty';
import { SITES, type CompareRow, type SiteKey } from './siteStock';

/** 우리 재고와 사이트별 재고를 한 줄씩 비교하는 표 */
export function CompareTable({
  rows,
  uploaded,
  canEditOurs,
  onEditSite,
  onEditOurs,
}: {
  rows: CompareRow[];
  uploaded: SiteKey[];
  /** 창고를 하나 골랐을 때만 우리 재고를 고칠 수 있다 */
  canEditOurs: boolean;
  onEditSite: (site: SiteKey, row: CompareRow, value: number) => void;
  onEditOurs: (row: CompareRow, value: number) => void;
}) {
  return (
    <table className={st.table}>
      <thead>
        <tr>
          <th className={st.th}>상품명</th>
          <th className={cx(st.th, st.num, st.thOurs)}>우리 재고</th>
          {uploaded.map((k) => (
            <th key={k} className={cx(st.th, st.num)}>
              {SITES[k].label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const siteNames = [...new Set(uploaded.flatMap((k) => row.sites[k]?.names ?? []))].filter((n) => n !== row.name);
          return (
            <tr key={row.key} className={st.row}>
              <td className={cx(st.td, st.nameCell)} title={[row.name, ...siteNames].join('\n')}>
                {row.pinOrder !== null && <span className={st.pinBadge}>주요</span>}
                <span className={st.productName}>{row.name}</span>
                {row.productId === null && <span className={st.warnBadge}>미연결</span>}
              </td>
              <td className={cx(st.td, st.num, st.ours)}>
                {canEditOurs && row.productId !== null ? (
                  <EditableQty value={row.ours ?? 0} cellId={`ours:${i}`} label={`${row.name} 우리 재고`} onCommit={(v) => onEditOurs(row, v)}>
                    <Qty value={row.ours} />
                  </EditableQty>
                ) : (
                  <Qty value={row.ours} />
                )}
              </td>
              {uploaded.map((k) => {
                const value = row.sites[k]?.quantity ?? 0;
                const diff = row.ours !== null ? value - row.ours : 0;
                return (
                  <td key={k} className={cx(st.td, st.num)} title={row.sites[k]?.names.join('\n')}>
                    <EditableQty value={value} cellId={`${k}:${i}`} label={`${row.name} ${SITES[k].label}`} onCommit={(v) => onEditSite(k, row, v)}>
                      <span className={diff !== 0 ? st.diffValue : undefined}>
                        {row.sites[k]?.edited && <span className={st.editedDot} />}
                        {formatNumber(value)}
                      </span>
                      {diff !== 0 && (
                        <span className={st.diffTag}>
                          {diff > 0 ? '+' : ''}
                          {formatNumber(diff)}
                        </span>
                      )}
                    </EditableQty>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
