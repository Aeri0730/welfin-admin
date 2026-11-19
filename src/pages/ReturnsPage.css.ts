import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { media, vars } from '@/styles/theme.css';

/* ---------- 입력 ---------- */
export const inputGrid = style({
  display: 'grid',
  gap: 12,
  '@media': {
    [media.tablet]: { gridTemplateColumns: '200px minmax(0, 1fr)', alignItems: 'start' },
  },
});

export const inputSide = style({
  display: 'grid',
  gap: 12,
  gridTemplateColumns: '1fr 1fr',
  '@media': {
    [media.tablet]: { gridTemplateColumns: '1fr' },
  },
});

export const modeSelect = style({
  gridColumn: '1 / -1',
});

export const pasteArea = style({
  minHeight: 140,
  fontFamily: `ui-monospace, 'D2Coding', Menlo, Consolas, monospace`,
  fontSize: 13,
  lineHeight: 1.6,
  whiteSpace: 'pre',
  overflowX: 'auto',
});

export const inputActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 12,
});

export const helpText = style({
  marginTop: 8,
  fontSize: 13,
  color: vars.color.grey500,
  lineHeight: 1.6,
});

/* ---------- 미리보기 ---------- */
export const previewSummary = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 16,
  marginBottom: 8,
});

export const previewList = style({
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 360,
  overflowY: 'auto',
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.grey100}`,
});

export const previewRow = style({
  display: 'grid',
  gridTemplateColumns: '36px 72px minmax(0, 1fr)',
  gap: 8,
  alignItems: 'start',
  padding: '10px 12px',
  fontSize: 14,
  borderBottom: `1px solid ${vars.color.grey100}`,
  selectors: { '&:last-child': { borderBottom: 'none' } },
});

export const lineNo = style({
  color: vars.color.grey400,
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
  paddingTop: 2,
});

export const previewText = style({
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  wordBreak: 'break-all',
});

export const previewRaw = style({
  fontSize: 12,
  color: vars.color.grey400,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const warnText = style({ fontSize: 12, color: vars.color.orange500, fontWeight: 600 });
export const errorText = style({ fontSize: 13, color: vars.color.red500, fontWeight: 600 });

/* ---------- 검색 범위 탭 ---------- */
export const filterTabs = style({
  display: 'flex',
  gap: 4,
  overflowX: 'auto',
  margin: '12px -20px 0',
  padding: '0 20px',
  borderBottom: `1px solid ${vars.color.grey200}`,
  scrollbarWidth: 'none',
  '@media': {
    [media.desktop]: { margin: '16px -24px 0', padding: '0 24px' },
  },
});

export const filterTab = recipe({
  base: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 46,
    padding: '0 10px',
    marginBottom: -1,
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'none',
    fontSize: 15,
    fontWeight: 600,
    color: vars.color.grey500,
    cursor: 'pointer',
    transition: 'color 0.15s ease, border-color 0.15s ease',
    selectors: { '&:hover': { color: vars.color.grey800 } },
  },
  variants: {
    active: {
      true: { color: vars.color.grey900, borderBottomColor: vars.color.grey900 },
    },
  },
});

export const filterCount = recipe({
  base: {
    minWidth: 20,
    padding: '0 6px',
    borderRadius: vars.radius.full,
    fontSize: 12,
    lineHeight: '20px',
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
    background: vars.color.grey100,
    color: vars.color.grey600,
  },
  variants: {
    alert: { true: { background: vars.color.red500, color: vars.color.white } },
    active: { true: { background: vars.color.grey900, color: vars.color.white } },
  },
});

export const listToolbar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 8,
  padding: '12px 0 4px',
});

/* ---------- 목록 ---------- */
export const item = style({
  display: 'grid',
  gap: 12,
  padding: '16px 0',
  borderBottom: `1px solid ${vars.color.grey100}`,
  selectors: { '&:last-child': { borderBottom: 'none' } },
  '@media': {
    [media.desktop]: {
      gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) auto',
      alignItems: 'start',
      gap: 20,
    },
  },
});

export const itemMain = style({
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const itemTitle = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 6,
  fontSize: 16,
  fontWeight: 700,
  color: vars.color.grey900,
});

export const itemProduct = style({
  fontSize: 14,
  color: vars.color.grey700,
  wordBreak: 'keep-all',
});

export const itemMeta = style({
  fontSize: 13,
  color: vars.color.grey500,
  wordBreak: 'break-all',
});

export const tracking = style({
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 12,
  borderRadius: vars.radius.md,
  background: vars.color.grey50,
  '@media': {
    [media.desktop]: { background: 'transparent', padding: 0 },
  },
});

export const invoiceLine = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 6,
  fontSize: 14,
  fontWeight: 600,
  color: vars.color.grey800,
  fontVariantNumeric: 'tabular-nums',
});

export const smallLink = style({
  fontSize: 12,
  fontWeight: 500,
  color: vars.color.blue500,
  textDecoration: 'underline',
});

export const trackLine = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 6,
  fontSize: 13,
  color: vars.color.grey600,
});

export const linkButton = style({
  border: 'none',
  background: 'none',
  padding: 0,
  fontSize: 12,
  fontWeight: 600,
  color: vars.color.grey500,
  cursor: 'pointer',
  textDecoration: 'underline',
});

export const timeline = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginTop: 4,
  paddingLeft: 12,
  borderLeft: `2px solid ${vars.color.grey200}`,
});

export const timelineItem = style({
  fontSize: 12,
  color: vars.color.grey600,
  lineHeight: 1.5,
});

export const timelineHead = style({
  fontWeight: 700,
  color: vars.color.grey800,
});

export const itemActions = style({
  display: 'flex',
  gap: 6,
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
});

/* ---------- 수정 / 공지 ---------- */
export const formGrid = style({
  display: 'grid',
  gap: 12,
  marginTop: 16,
  '@media': {
    [media.tablet]: { gridTemplateColumns: '1fr 1fr' },
  },
});

export const full = style({ gridColumn: '1 / -1' });

export const noticeCount = style({
  fontSize: 32,
  fontWeight: 800,
  color: vars.color.red500,
  fontVariantNumeric: 'tabular-nums',
});

export const checkLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginRight: 'auto',
  fontSize: 14,
  color: vars.color.grey600,
  cursor: 'pointer',
});

export const banner = style({
  padding: '12px 16px',
  borderRadius: vars.radius.md,
  background: vars.color.orange50,
  color: vars.color.orange500,
  fontSize: 14,
  fontWeight: 500,
});
