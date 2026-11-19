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

/* ---------- 카드 (모바일) ---------- */
export const cards = style({ display: 'flex', flexDirection: 'column', gap: 10 });

export const card = style({
  padding: '14px 16px',
  borderRadius: 14,
  border: `1px solid ${vars.color.grey100}`,
  fontVariantNumeric: 'tabular-nums',
});

export const cardTitle = style({
  marginBottom: 10,
  fontSize: 15,
  fontWeight: 700,
  color: vars.color.grey900,
  wordBreak: 'keep-all',
});

export const cardGrid = style({
  display: 'grid',
  gridTemplateColumns: '64px 1fr 1.4fr',
  columnGap: 12,
  rowGap: 6,
  margin: 0,
  fontSize: 14,
});

export const cardHead = style({ fontSize: 12, color: vars.color.grey500 });

export const cardLine = style({ display: 'contents' });

export const cardValue = style({ margin: 0, textAlign: 'right', color: vars.color.grey800 });

export const cardLabel = style({ color: vars.color.grey600 });

/** 합계 줄의 각 칸 */
export const cardTotalCell = style({ paddingTop: 6, borderTop: `1px solid ${vars.color.grey100}` });

export const cardMeta = style({ marginTop: 10, fontSize: 12, color: vars.color.grey500 });

export const cardSum = style({
  display: 'flex',
  justifyContent: 'space-between',
  background: vars.color.grey50,
  border: 'none',
  fontSize: 14,
  color: vars.color.grey700,
});
