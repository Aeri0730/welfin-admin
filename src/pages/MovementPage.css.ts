import { globalStyle, style } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

/** 입고·출고 화면 전체: 데스크톱에서 가운데로 (입력·현황 전환 시 위치가 안 흔들리게 같이 씀) */
export const page = style({
  width: '100%',
  maxWidth: 720,
  marginInline: 'auto',
});

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  '@media': {
    [media.desktop]: { gap: 16 },
  },
});

export const fields = style({
  display: 'grid',
  gap: 16,
  '@media': {
    [media.tablet]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  },
});

export const itemsHeader = style({
  display: 'none',
  gridTemplateColumns: 'minmax(0, 1fr) 104px 40px',
  '@media': { [media.tablet]: { display: 'grid' } },
  gap: 8,
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.grey600,
});

/** 모바일: 제품 선택은 한 줄 전체, 아래 줄에 수량 · 삭제. 태블릿 이상: 한 줄 */
export const itemRow = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 40px',
  '@media': { [media.tablet]: { gridTemplateColumns: 'minmax(0, 1fr) 104px 40px' } },
  gap: 8,
  alignItems: 'start',
  selectors: {
    '& + &': { marginTop: 12 },
  },
});

export const quantityInput = style({
  textAlign: 'right',
});

export const removeButton = style({
  width: 40,
  height: 48,
  padding: 0,
});

export const addRow = style({
  marginTop: 16,
});

export const submitBar = style({
  position: 'sticky',
  bottom: `calc(${vars.layout.tabBar} + 12px + env(safe-area-inset-bottom))`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '12px 12px 12px 20px',
  borderRadius: vars.radius.xl,
  background: vars.color.white,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  '@media': {
    [media.desktop]: { bottom: 24 },
  },
});

export const summary = style({
  fontSize: 15,
  color: vars.color.grey600,
});

export const summaryStrong = style({
  fontWeight: 700,
  color: vars.color.grey900,
});

export const submitButton = style({
  minWidth: 120,
});

/* ---------- 모바일 입고/출고 전환 ---------- */
export const segment = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: 4,
  padding: 4,
  marginBottom: 16,
  borderRadius: vars.radius.md,
  background: vars.color.grey200,
  '@media': {
    [media.desktop]: { display: 'none' },
  },
});

export const segmentItem = style({
  display: 'grid',
  placeItems: 'center',
  height: 40,
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 600,
  color: vars.color.grey600,
  selectors: {
    '&.active': { background: vars.color.white, color: vars.color.grey900, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  },
});

globalStyle(`${itemRow} > :first-child`, {
  gridColumn: '1 / -1',
  '@media': { [media.tablet]: { gridColumn: 'auto' } },
});

/** 입력 | 현황 탭 (모든 화면 크기에서 보임) */
export const subTabs = style({
  display: 'flex',
  gap: 4,
  marginBottom: 16,
  borderBottom: `1px solid ${vars.color.grey200}`,
});

export const subTab = style({
  padding: '10px 14px',
  fontSize: 15,
  fontWeight: 600,
  color: vars.color.grey500,
  borderBottom: '2px solid transparent',
  marginBottom: -1,
  selectors: {
    '&.active': { color: vars.color.grey900, borderBottomColor: vars.color.grey900 },
  },
});

export const scheduleBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  marginTop: 14,
  padding: 12,
  borderRadius: vars.radius.md,
  background: vars.color.grey100,
});

export const checkRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
});

/* ---------- 현황: 묶음 안 제품 줄 (눌러서 수정) ---------- */
export const rowActions = style({ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 });

export const batchItems = style({ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 });

export const batchItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '6px 10px',
  borderRadius: vars.radius.sm,
  fontSize: 14,
  color: vars.color.grey700,
  background: vars.color.grey50,
  textAlign: 'left',
  transition: 'background 0.15s ease',
  ':hover': { background: vars.color.grey100, color: vars.color.grey900 },
});

export const batchName = style({ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
export const batchQty = style({ fontWeight: 600, fontVariantNumeric: 'tabular-nums' });
