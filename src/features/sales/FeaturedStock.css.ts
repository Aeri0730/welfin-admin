import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';

/* ---------- 표 (태블릿 이상) ---------- */
export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});

export const nameCol = style({ width: 220 });

export const th = style({
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 600,
  color: vars.color.grey500,
  textAlign: 'left',
  borderBottom: `1px solid ${vars.color.grey200}`,
});

export const nameTh = style({ verticalAlign: 'bottom', paddingLeft: 0 });

export const group = style({
  textAlign: 'center',
  color: vars.color.grey700,
  borderBottom: `1px solid ${vars.color.grey100}`,
});

/** 수량 / 단가 / 금액 묶음 사이 구분선 */
export const groupStart = style({ borderLeft: `1px solid ${vars.color.grey100}` });

export const right = style({ textAlign: 'right' });

export const row = style({
  selectors: { '&:hover': { background: vars.color.grey50 } },
});

export const td = style({
  height: 48,
  padding: '0 14px',
  color: vars.color.grey800,
  borderBottom: `1px solid ${vars.color.grey100}`,
});

export const name = style({
  paddingLeft: 0,
  whiteSpace: 'normal',
  wordBreak: 'keep-all',
  lineHeight: 1.4,
  fontWeight: 600,
  color: vars.color.grey900,
});

export const muted = style({ color: vars.color.grey500 });
export const strong = style({ fontWeight: 700, color: vars.color.grey900 });
export const zero = style({ color: vars.color.grey300 });

export const footRow = style({
  fontWeight: 700,
  color: vars.color.grey900,
  background: vars.color.grey50,
});
