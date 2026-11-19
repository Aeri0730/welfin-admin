import { formatNumber } from '@/lib/format';
import * as s from './BarChart.css';

export interface ChartSeries {
  name: string;
  /** 계열 색. 텍스트에는 쓰지 않고 막대·범례 점에만 쓴다 */
  color: string;
}

export interface ChartRow {
  label: string;
  values: number[];
}

interface BarChartProps {
  title: string;
  series: ChartSeries[];
  rows: ChartRow[];
  unit?: string;
}

/**
 * 가로 막대 차트 (계열 2~3개 묶음). 값은 막대 끝에 항상 표시하고,
 * 마우스를 올리면 행 전체 값을 툴팁으로 보여준다.
 */
export function BarChart({ title, series, rows, unit = '' }: BarChartProps) {
  const max = Math.max(1, ...rows.flatMap((row) => row.values));

  return (
    <figure className={s.figure}>
      <figcaption className={s.header}>
        <span className={s.title}>{title}</span>
        {series.length > 1 && (
          <span className={s.legend}>
            {series.map((item) => (
              <span key={item.name} className={s.legendItem}>
                <span className={s.legendDot} style={{ background: item.color }} />
                {item.name}
              </span>
            ))}
          </span>
        )}
      </figcaption>

      <div className={s.rows} role="table" aria-label={title}>
        {rows.map((row) => (
          <div
            key={row.label}
            className={s.row}
            role="row"
            title={`${row.label}\n${series.map((item, i) => `${item.name}: ${formatNumber(row.values[i] ?? 0)}${unit}`).join('\n')}`}
          >
            <span className={s.label} role="rowheader">
              {row.label}
            </span>
            <span className={s.bars}>
              {series.map((item, i) => {
                const value = row.values[i] ?? 0;
                return (
                  <span key={item.name} className={s.barLine} role="cell" aria-label={`${item.name} ${formatNumber(value)}${unit}`}>
                    <span
                      className={s.bar}
                      style={{
                        width: value > 0 ? `max(4px, calc((100% - 92px) * ${value / max}))` : 0,
                        background: item.color,
                      }}
                    />
                    <span className={s.value}>{value > 0 ? `${formatNumber(value)}${unit}` : '-'}</span>
                  </span>
                );
              })}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}
