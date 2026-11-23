import { keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@/styles/theme.css';

const pop = keyframes({
  from: { opacity: 0, transform: 'translateY(-4px) scale(0.98)' },
  to: { opacity: 1, transform: 'none' },
});

/* ---------- 여는 버튼 ---------- */
export const trigger = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    transition: 'background 0.15s ease, color 0.15s ease, transform 0.1s ease',
    selectors: {
      '&:active': { transform: 'scale(0.97)' },
      '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 3px ${vars.color.blue100}` },
    },
  },
  variants: {
    variant: {
      /** 목록 위 정렬·보기 옵션 */
      pill: {
        height: 32,
        padding: '0 10px 0 12px',
        borderRadius: vars.radius.full,
        fontSize: 13,
        background: vars.color.grey50,
        color: vars.color.grey700,
        selectors: {
          '&:hover, &[aria-expanded="true"]': { background: vars.color.grey100 },
        },
      },
      /** 폼 입력칸 (SelectField) — TextField 와 같은 높이·바탕 */
      field: {
        width: '100%',
        height: 48,
        padding: '0 12px 0 14px',
        justifyContent: 'space-between',
        borderRadius: vars.radius.md,
        border: `1px solid ${vars.color.grey200}`,
        background: vars.color.grey50,
        fontSize: 16,
        fontWeight: 500,
        color: vars.color.grey900,
        textAlign: 'left',
        selectors: {
          '&:hover:not(:disabled)': { borderColor: vars.color.grey300 },
          '&[aria-expanded="true"], &:focus-visible': {
            borderColor: vars.color.blue500,
            background: vars.color.white,
            boxShadow: `0 0 0 3px ${vars.color.blue50}`,
          },
          '&:active': { transform: 'none' },
          '&:disabled': { color: vars.color.grey500, cursor: 'not-allowed' },
          '&[aria-invalid="true"]': { borderColor: vars.color.red500 },
        },
      },
      /** 제목 옆에 붙는 작은 칩 */
      chip: {
        height: 28,
        padding: '0 8px 0 10px',
        borderRadius: vars.radius.full,
        fontSize: 13,
        verticalAlign: 'middle',
      },
    },
    tone: {
      grey: {},
      blue: {},
      purple: {},
    },
  },
  compoundVariants: [
    {
      variants: { variant: 'chip', tone: 'grey' },
      style: { background: vars.color.grey100, color: vars.color.grey700 },
    },
    {
      variants: { variant: 'chip', tone: 'blue' },
      style: { background: vars.color.blue50, color: vars.color.blue600 },
    },
    {
      variants: { variant: 'chip', tone: 'purple' },
      style: { background: '#F3EEFF', color: '#7B4BE0' },
    },
  ],
  defaultVariants: { variant: 'pill', tone: 'grey' },
});

export const triggerLabel = style({ overflow: 'hidden', textOverflow: 'ellipsis' });

export const chevron = style({
  display: 'inline-flex',
  opacity: 0.7,
  transition: 'transform 0.15s ease',
  selectors: { [`[aria-expanded="true"] > &`]: { transform: 'rotate(180deg)' } },
});

/* ---------- 메뉴 ---------- */
export const menu = style({
  position: 'fixed',
  zIndex: 80,
  minWidth: 180,
  maxWidth: 'calc(100vw - 24px)',
  maxHeight: 'min(360px, calc(100vh - 24px))',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: 6,
  borderRadius: vars.radius.lg,
  background: vars.color.white,
  boxShadow: '0 12px 32px rgba(0, 23, 51, 0.16), 0 2px 6px rgba(0, 23, 51, 0.06)',
  animation: `${pop} 0.14s ease`,
  transformOrigin: 'top',
});

export const option = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  minHeight: 44,
  padding: '0 12px',
  borderRadius: vars.radius.md,
  fontSize: 15,
  fontWeight: 500,
  color: vars.color.grey800,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'background 0.1s ease',
  selectors: {
    '&:hover, &:focus-visible': { background: vars.color.grey50, outline: 'none' },
    '&[aria-selected="true"]': { color: vars.color.blue600, fontWeight: 700 },
  },
});

export const optionLabel = style({ flex: 1, minWidth: 0 });

export const optionHint = style({ fontSize: 12, fontWeight: 500, color: vars.color.grey500 });

export const check = style({ display: 'inline-flex', color: vars.color.blue500 });

export const divider = style({ height: 1, margin: '6px 8px', background: vars.color.grey100 });

/* 직접 입력 */
export const custom = style({ padding: '6px 6px 4px' });

export const customTitle = style({
  padding: '0 6px 6px',
  fontSize: 12,
  fontWeight: 600,
  color: vars.color.grey500,
});

export const customRow = style({ display: 'flex', gap: 6 });

export const customInput = style({
  flex: 1,
  minWidth: 0,
  height: 40,
  padding: '0 12px',
  borderRadius: vars.radius.md,
  border: 'none',
  background: vars.color.grey50,
  fontSize: 15,
  color: vars.color.grey900,
  outline: 'none',
  transition: 'box-shadow 0.15s ease, background 0.15s ease',
  '::placeholder': { color: vars.color.grey400 },
  ':focus': { background: vars.color.white, boxShadow: `inset 0 0 0 2px ${vars.color.blue500}` },
});

export const customApply = style({
  flexShrink: 0,
  height: 40,
  padding: '0 14px',
  borderRadius: vars.radius.md,
  background: vars.color.blue500,
  color: vars.color.white,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background 0.15s ease',
  selectors: {
    '&:hover:not(:disabled)': { background: vars.color.blue600 },
    '&:disabled': { opacity: 0.38, cursor: 'not-allowed' },
  },
});
