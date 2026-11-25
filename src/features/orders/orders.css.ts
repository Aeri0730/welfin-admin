import { style, styleVariants } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

/* ---------- 목록 ---------- */

export const clickRow = style({
  cursor: 'pointer',
  selectors: { '&:hover': { background: vars.color.grey50 } },
});

export const nowrap = style({ whiteSpace: 'nowrap' });

/** 주소·요구사항처럼 긴 칸: 줄바꿈 허용 (표가 옆으로 넘치지 않게) */
export const longCell = style({ whiteSpace: 'normal', wordBreak: 'keep-all', minWidth: 140 });

/** 페이지 오른쪽 위 오늘 날짜 */
export const todayLabel = style({
  fontSize: 15,
  fontWeight: 700,
  color: vars.color.grey700,
  whiteSpace: 'nowrap',
});

/** 표 안 고유번호 (앞 8자리) */
export const code = style({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
  color: vars.color.grey600,
  whiteSpace: 'nowrap',
});

/** 발주 확인 칩 (담당자는 눌러서 바꾼다) */
const chipBase = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 28,
  padding: '0 10px',
  border: 0,
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
});

export const chip = styleVariants({
  confirmed: [chipBase, { background: vars.color.green50, color: vars.color.green500 }],
  pending: [chipBase, { background: vars.color.grey100, color: vars.color.grey600 }],
});

export const chipButton = style({
  cursor: 'pointer',
  transition: 'filter 0.15s ease',
  selectors: {
    '&:hover:not(:disabled)': { filter: 'brightness(0.96)' },
    '&:disabled': { cursor: 'progress', opacity: 0.6 },
    '&:focus-visible': { outline: `2px solid ${vars.color.blue500}`, outlineOffset: 2 },
  },
});

/* ---------- 모달 ---------- */

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

/** 두 칸 차지 (모바일은 한 줄 전체) */
export const wide2 = style({ gridColumn: 'span 2' });

export const groupTitle = style({
  gridColumn: '1 / -1',
  marginTop: 8,
  fontSize: 13,
  fontWeight: 700,
  color: vars.color.grey600,
});

export const footer = style({ display: 'flex', width: '100%', gap: 8 });
export const spacer = style({ flex: 1 });

/** 입력칸 안 아이콘 버튼 (우편번호 돋보기) */
export const iconButton = style({
  display: 'grid',
  placeItems: 'center',
  width: 36,
  height: 36,
  border: 0,
  borderRadius: vars.radius.sm,
  background: 'transparent',
  color: vars.color.grey600,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.grey100, color: vars.color.grey900 },
    '&:focus-visible': { outline: `2px solid ${vars.color.blue500}`, outlineOffset: 1 },
  },
});
