import { style } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

export const clickRow = style({
  cursor: 'pointer',
  selectors: { '&:hover': { background: vars.color.grey50 } },
});

export const formGrid = style({
  display: 'grid',
  gap: 12,
  marginTop: 16,
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  '@media': {
    [media.tablet]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  },
});

export const full = style({ gridColumn: '1 / -1' });

export const groupTitle = style({
  gridColumn: '1 / -1',
  marginTop: 8,
  fontSize: 13,
  fontWeight: 700,
  color: vars.color.grey600,
});

export const totalBox = style({
  gridColumn: '1 / -1',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px 20px',
  padding: '12px 14px',
  borderRadius: vars.radius.sm,
  background: vars.color.grey50,
  fontSize: 14,
  color: vars.color.grey700,
});

export const totalStrong = style({ fontWeight: 700, color: vars.color.grey900 });

export const footer = style({ display: 'flex', width: '100%', gap: 8 });
export const spacer = style({ flex: 1 });

export const sub = style({ display: 'block', fontSize: 12, color: vars.color.grey500, marginTop: 2 });
export const nowrap = style({ whiteSpace: 'nowrap' });
export const remaining = style({ color: vars.color.red500, fontWeight: 700 });

/* ---------- 배차 상품 여러 줄 ---------- */
export const itemsHead = style({
  gridColumn: '1 / -1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 4,
  fontSize: 14,
  fontWeight: 600,
  color: vars.color.grey700,
});

export const itemList = style({ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8 });

/** 제품 | 수량 | 빼기 */
export const itemRow = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 96px 36px',
  gap: 8,
  alignItems: 'center',
});

export const itemRemove = style({
  width: 36,
  height: 36,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: vars.radius.sm,
  background: 'transparent',
  color: vars.color.grey500,
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { background: vars.color.grey100, color: vars.color.grey700 },
    '&:disabled': { visibility: 'hidden' },
  },
});

export const itemLine = style({ display: 'block' });


/** 배차비 표 제품 칸 (기본 줄바꿈 칸 120px 의 1.5배) */
export const productCell = style({ minWidth: 180 });
