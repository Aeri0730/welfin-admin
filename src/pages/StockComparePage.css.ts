import { globalStyle, style } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

/* =====================================================================
 * 사이트 재고 비교 — 토스 톤
 * 흰 카드 + 넉넉한 여백, 선 대신 여백과 굵기로 구분, 회색 바탕 입력칸
 * ===================================================================== */

/* ---------- 사이트 카드 3장 ---------- */
export const sites = style({
  display: 'grid',
  gap: 12,
  '@media': {
    [media.tablet]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  },
});

export const site = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
  padding: 20,
  borderRadius: vars.radius.xl,
  background: vars.color.white,
});

export const siteHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  minHeight: 28,
});

export const siteName = style({ fontSize: 15, fontWeight: 600, color: vars.color.grey700 });

export const siteTotal = style({
  marginTop: 4,
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: vars.color.grey900,
  fontVariantNumeric: 'tabular-nums',
});

export const siteTotalEmpty = style({ color: vars.color.grey300 });

export const siteMeta = style({
  fontSize: 13,
  color: vars.color.grey500,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const siteActions = style({ display: 'flex', gap: 8, marginTop: 14 });

export const siteButton = style({ flex: 1 });

export const removeButton = style({
  display: 'grid',
  placeItems: 'center',
  width: 28,
  height: 28,
  borderRadius: vars.radius.full,
  color: vars.color.grey400,
  transition: 'background 0.15s ease, color 0.15s ease',
  ':hover': { background: vars.color.grey100, color: vars.color.grey700 },
});

export const errorText = style({ fontSize: 14, fontWeight: 600, color: vars.color.red500 });

/* ---------- 비교 카드 ---------- */
export const board = style({
  borderRadius: vars.radius.xl,
  background: vars.color.white,
  overflow: 'hidden',
});

export const boardHead = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: '24px 20px 12px',
  '@media': {
    [media.tablet]: { padding: '28px 28px 12px' },
  },
});

export const boardTitleRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 12,
});

export const boardTitle = style({
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: vars.color.grey900,
});

export const boardSub = style({ marginTop: 4, fontSize: 14, color: vars.color.grey600 });
export const boardSubStrong = style({ fontWeight: 700, color: vars.color.red500 });
export const boardSubOk = style({ fontWeight: 700, color: vars.color.blue500 });

/* 토스 세그먼트 */
export const segment = style({
  display: 'flex',
  gap: 2,
  maxWidth: '100%',
  overflowX: 'auto',
  padding: 4,
  borderRadius: vars.radius.md,
  background: vars.color.grey50,
  scrollbarWidth: 'none',
  alignSelf: 'flex-start',
});

export const segmentItem = style({
  flexShrink: 0,
  height: 36,
  padding: '0 16px',
  borderRadius: 9,
  fontSize: 14,
  fontWeight: 600,
  color: vars.color.grey600,
  transition: 'background 0.15s ease, color 0.15s ease',
  selectors: {
    '&:hover:not(:disabled)': { color: vars.color.grey800 },
    '&[aria-selected="true"]': {
      background: vars.color.white,
      color: vars.color.grey900,
      boxShadow: '0 1px 4px rgba(0, 23, 51, 0.12)',
    },
    '&:disabled': { color: vars.color.grey400, cursor: 'default' },
  },
});

/* 필터 줄 */
export const filters = style({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 });

export const search = style({
  flex: '1 1 200px',
  maxWidth: 320,
  height: 40,
  padding: '0 14px',
  borderRadius: vars.radius.md,
  border: 'none',
  background: vars.color.grey50,
  fontSize: 15,
  color: vars.color.grey900,
  outline: 'none',
  transition: 'box-shadow 0.15s ease',
  '::placeholder': { color: vars.color.grey500 },
  ':focus': { boxShadow: `inset 0 0 0 2px ${vars.color.blue500}`, background: vars.color.white },
});

export const pill = style({
  height: 40,
  padding: '0 16px',
  borderRadius: vars.radius.full,
  background: vars.color.grey50,
  fontSize: 14,
  fontWeight: 600,
  color: vars.color.grey700,
  transition: 'background 0.15s ease, color 0.15s ease',
  ':hover': { background: vars.color.grey100 },
  selectors: {
    '&[aria-pressed="true"]': { background: vars.color.blue50, color: vars.color.blue600 },
  },
});

export const grow = style({ flex: 1 });

/* ---------- 목록형 표 ---------- */
export const tableWrap = style({
  overflow: 'auto',
  maxHeight: 'calc(100vh - 220px)',
  padding: '0 8px 8px',
  '@media': {
    [media.tablet]: { padding: '0 16px 16px' },
  },
});

export const table = style({
  width: '100%',
  minWidth: 640,
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: 15,
  fontVariantNumeric: 'tabular-nums',
});

export const th = style({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  height: 40,
  padding: '0 12px',
  background: vars.color.white,
  borderBottom: `1px solid ${vars.color.grey100}`,
  fontSize: 13,
  fontWeight: 500,
  color: vars.color.grey500,
  textAlign: 'left',
  whiteSpace: 'nowrap',
});

export const td = style({
  height: 60,
  padding: '0 12px',
  borderBottom: `1px solid ${vars.color.grey100}`,
  color: vars.color.grey700,
  whiteSpace: 'nowrap',
});

export const num = style({ textAlign: 'right', width: 128 });
export const thOurs = style({ color: vars.color.blue500, fontWeight: 600 });

export const row = style({ transition: 'background 0.1s ease' });
globalStyle(`${row}:hover > td`, { background: vars.color.grey50 });
globalStyle(`${row} > td:first-child`, { borderRadius: `${vars.radius.md} 0 0 ${vars.radius.md}` });
globalStyle(`${row} > td:last-child`, { borderRadius: `0 ${vars.radius.md} ${vars.radius.md} 0` });

export const nameCell = style({ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' });

export const productName = style({ fontWeight: 600, color: vars.color.grey900 });

export const pinBadge = style({
  display: 'inline-block',
  marginRight: 8,
  padding: '2px 6px',
  borderRadius: 6,
  background: vars.color.blue50,
  color: vars.color.blue600,
  fontSize: 11,
  fontWeight: 700,
  verticalAlign: 'middle',
});

export const warnBadge = style({
  display: 'inline-block',
  marginLeft: 8,
  padding: '2px 6px',
  borderRadius: 6,
  background: vars.color.orange50,
  color: vars.color.orange500,
  fontSize: 11,
  fontWeight: 700,
  verticalAlign: 'middle',
});

export const ours = style({ fontWeight: 700, color: vars.color.grey900 });
export const negative = style({ color: vars.color.red500 });
export const dash = style({ color: vars.color.grey300 });

/* 차이: 숫자 빨강 + 아래 작은 꼬리표 */
export const diffValue = style({ color: vars.color.red500, fontWeight: 700 });
export const diffTag = style({
  display: 'block',
  marginTop: 2,
  fontSize: 12,
  fontWeight: 600,
  color: vars.color.red500,
  opacity: 0.8,
});
export const sameMark = style({ color: vars.color.grey400 });

/* ---------- 숫자 바로 고치기 ---------- */
export const editButton = style({
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  minWidth: 72,
  padding: '6px 10px',
  margin: '0 -10px',
  borderRadius: vars.radius.sm,
  font: 'inherit',
  color: 'inherit',
  textAlign: 'right',
  transition: 'background 0.15s ease',
  ':hover': { background: vars.color.grey100 },
  ':focus-visible': { outline: 'none', boxShadow: `inset 0 0 0 2px ${vars.color.blue500}` },
});

export const editInput = style({
  width: 96,
  height: 38,
  margin: '0 -10px',
  padding: '0 10px',
  borderRadius: vars.radius.sm,
  border: 'none',
  background: vars.color.white,
  boxShadow: `inset 0 0 0 2px ${vars.color.blue500}`,
  font: 'inherit',
  fontWeight: 700,
  color: vars.color.grey900,
  textAlign: 'right',
  outline: 'none',
});

export const editedDot = style({
  display: 'inline-block',
  width: 6,
  height: 6,
  marginRight: 6,
  borderRadius: '50%',
  background: vars.color.blue500,
  verticalAlign: 'middle',
});

/* 사이트 시트: 우리 제품 연결 */
/** 사이트 시트: 우리 제품 연결 드롭다운 */
export const linkSelect = style({ maxWidth: 280 });

export const empty = style({ padding: '56px 20px', textAlign: 'center' });
export const emptyTitle = style({ fontSize: 17, fontWeight: 700, color: vars.color.grey800 });
export const emptyDesc = style({ marginTop: 6, fontSize: 14, color: vars.color.grey500 });

export const loading = style({ padding: '8px 12px 20px' });

/* ---------- 모달 ---------- */
export const dialogActions = style({ display: 'flex', gap: 8 });
export const dialogButton = style({ flex: 1 });
export const dialogText = style({ fontSize: 15, lineHeight: 1.6, color: vars.color.grey700 });
export const dialogFields = style({ display: 'flex', flexDirection: 'column', gap: 14 });
export const changeBox = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  margin: '16px 0 4px',
  padding: '18px 16px',
  borderRadius: vars.radius.md,
  background: vars.color.grey50,
  fontSize: 22,
  fontWeight: 700,
  color: vars.color.grey900,
  fontVariantNumeric: 'tabular-nums',
});
export const changeFrom = style({ color: vars.color.grey400 });

/** 이 페이지의 연한 회색 버튼 (Button weak 위에 덮어씀) */
export const softButton = style({
  selectors: {
    '&&': { background: vars.color.grey50, color: vars.color.grey700 },
    '&&:hover:not(:disabled)': { background: vars.color.grey100 },
  },
});

/* ---------- 합계 카드 (표 아래 따로) ---------- */
export const totals = style({
  padding: '22px 20px',
  borderRadius: vars.radius.xl,
  background: vars.color.white,
  '@media': {
    [media.tablet]: { padding: '24px 28px' },
  },
});

export const totalsTitle = style({ fontSize: 17, fontWeight: 700, color: vars.color.grey900 });

export const totalsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
  marginTop: 14,
});

export const totalItem = style({
  padding: '16px 18px',
  borderRadius: vars.radius.lg,
  background: vars.color.grey50,
});

export const totalLabel = style({ fontSize: 13, fontWeight: 600, color: vars.color.grey600 });
export const totalLabelOurs = style({ color: vars.color.blue500 });

export const totalValue = style({
  marginTop: 6,
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: vars.color.grey900,
  fontVariantNumeric: 'tabular-nums',
});

export const totalUnit = style({ marginLeft: 2, fontSize: 15, fontWeight: 600, color: vars.color.grey600 });
export const totalDiff = style({ marginTop: 4, fontSize: 13, fontWeight: 700, color: vars.color.red500 });
export const totalSame = style({ marginTop: 4, fontSize: 13, fontWeight: 600, color: vars.color.grey500 });
