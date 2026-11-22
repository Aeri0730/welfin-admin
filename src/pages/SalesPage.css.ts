import { globalStyle, style } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

export const dateBar = style({
  display: 'flex',
  alignItems: 'flex-end',
  gap: 8,
  flexWrap: 'wrap',
});

// 목표 대비 실적: 항목을 한 줄로 가로 나열 (좁은 화면에서는 옆으로 스크롤)
export const targetGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '16px 12px',
  '@media': {
    [media.tablet]: { display: 'flex', gap: 24, whiteSpace: 'nowrap' },
  },
});

// vanilla-extract 는 style() 안에서 자식 선택자를 못 써서 globalStyle 로 지정
globalStyle(`${targetGrid} > div`, {
  minWidth: 0,
  overflowWrap: 'anywhere',
  '@media': { [media.tablet]: { flex: '1 0 auto' } },
});
globalStyle(`${targetGrid} > div + div`, {
  '@media': { [media.tablet]: { paddingLeft: 24, borderLeft: `1px solid ${vars.color.grey100}` } },
});

/** 월 실적 입력 줄 */
export const actualRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  marginTop: 16,
  paddingTop: 16,
  borderTop: `1px solid ${vars.color.grey100}`,
});

export const actualField = style({ flex: '1 1 240px', maxWidth: 360 });

export const progress = style({
  height: 8,
  marginTop: 16,
  borderRadius: vars.radius.full,
  background: vars.color.grey100,
  overflow: 'hidden',
});

export const progressBar = style({
  height: '100%',
  borderRadius: vars.radius.full,
  background: vars.color.blue500,
});

export const inputGrid = style({
  display: 'grid',
  gap: 12,
  '@media': {
    [media.tablet]: { gridTemplateColumns: '120px minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'end' },
  },
});

export const inputLabel = style({
  fontSize: 15,
  fontWeight: 700,
  color: vars.color.grey800,
  '@media': {
    [media.tablet]: { paddingBottom: 14 },
  },
});

export const inputActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: 16,
});

export const up = style({ color: vars.color.red500, fontWeight: 600 });
export const down = style({ color: vars.color.blue500, fontWeight: 600 });

export const totalRow = style({
  background: vars.color.grey50,
  fontWeight: 700,
});

export const chartGrid = style({
  display: 'grid',
  gap: 16,
  '@media': {
    [media.desktop]: { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' },
  },
});

export const cardHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  marginBottom: 12,
});


export const inputSub = style({
  display: 'block',
  marginTop: 2,
  fontSize: 12,
  fontWeight: 500,
  color: vars.color.grey500,
});

/* 창고 밖 매출 (+ 버튼) */
export const extraGrid = style({
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 40px',
  alignItems: 'end',
  paddingTop: 12,
  borderTop: `1px dashed ${vars.color.grey200}`,
  '@media': {
    [media.tablet]: { gridTemplateColumns: '120px minmax(0, 1fr) minmax(0, 1fr) 40px' },
  },
});

globalStyle(`${extraGrid} > :first-child`, {
  gridColumn: '1 / -1',
  '@media': { [media.tablet]: { gridColumn: 'auto' } },
});

export const extraRemove = style({
  width: 40,
  height: 44,
  border: 0,
  borderRadius: vars.radius.sm,
  background: vars.color.grey100,
  fontSize: 20,
  color: vars.color.grey600,
  cursor: 'pointer',
  selectors: { '&:hover': { background: vars.color.grey200 } },
});

export const extraAdd = style({
  alignSelf: 'flex-start',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 40,
  padding: '0 14px',
  border: `1px dashed ${vars.color.grey300}`,
  borderRadius: vars.radius.sm,
  background: 'none',
  fontSize: 14,
  fontWeight: 600,
  color: vars.color.blue500,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.grey50 },
    '&:disabled': { opacity: 0.5, cursor: 'default' },
  },
});

export const extraAddSub = style({ fontSize: 12, fontWeight: 500, color: vars.color.grey500 });
