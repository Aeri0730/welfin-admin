import { style } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

export const layout = style({
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'minmax(0, 1fr)',
  '@media': {
    [media.desktop]: {
      gap: 16,
      gridTemplateColumns: '360px minmax(0, 1fr)',
      alignItems: 'start',
    },
  },
});

export const entry = style({
  '@media': {
    [media.desktop]: { position: 'sticky', top: 24 },
  },
});

export const sectionHead = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  marginBottom: 12,
});

export const sectionTitle = style({ fontSize: 17, fontWeight: 700, color: vars.color.grey900 });

export const fieldGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
});

export const full = style({ gridColumn: '1 / -1' });

export const totals = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginTop: 14,
  padding: '12px 14px',
  borderRadius: vars.radius.md,
  background: vars.color.grey50,
  fontSize: 14,
});

export const totalLine = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  color: vars.color.grey700,
  fontVariantNumeric: 'tabular-nums',
});

export const totalStrong = style({ fontWeight: 700, color: vars.color.grey900 });

export const warn = style({ fontSize: 13, fontWeight: 600, color: vars.color.orange500 });
export const bad = style({ color: vars.color.red500, fontWeight: 600 });
export const good = style({ color: vars.color.green500 });

export const actions = style({ display: 'flex', gap: 8, marginTop: 14 });

export const help = style({ marginTop: 6, fontSize: 12, color: vars.color.grey500, lineHeight: 1.5 });

/* 일자별 표 */
export const clickRow = style({
  cursor: 'pointer',
  selectors: { '&:hover': { background: vars.color.grey50 } },
});

export const selectedRow = style({ background: vars.color.blue50 });


export const missing = style({ color: vars.color.grey400 });

export const compactTd = style({ padding: '10px 10px' });

/* 제품별 계산 */
export const capInput = style({
  width: 72,
  height: 32,
  padding: '0 8px',
  border: `1px solid ${vars.color.grey200}`,
  borderRadius: vars.radius.sm,
  fontSize: 14,
  textAlign: 'right',
  background: vars.color.white,
  color: vars.color.grey900,
  selectors: { '&:focus': { outline: 'none', borderColor: vars.color.blue500 } },
});

export const codeInput = style([capInput, { width: 76, textAlign: 'left' }]);

export const exemptRow = style({ opacity: 0.55 });

export const footRow = style({ background: vars.color.grey50, fontWeight: 700 });

export const productCard = style({
  padding: '12px 0',
  borderBottom: `1px solid ${vars.color.grey100}`,
});

export const productCardTop = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  fontSize: 14,
  fontWeight: 600,
  color: vars.color.grey900,
});

export const productCardInputs = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  marginTop: 8,
  fontSize: 13,
  color: vars.color.grey600,
});

export const compare = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  alignItems: 'center',
  marginTop: 10,
  fontSize: 13,
  color: vars.color.grey600,
});

/* 메모지 */
export const productsHead = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 8,
});

export const memoBox = style({
  position: 'relative',
  width: '100%',
  zIndex: 2,
  '@media': {
    [media.desktop]: { width: 300 },
  },
});

export const memoForm = style({ display: 'flex', gap: 6 });

export const memoInput = style({
  flex: 1,
  minWidth: 0,
  height: 36,
  padding: '0 12px',
  border: `1px solid ${vars.color.grey200}`,
  borderRadius: vars.radius.sm,
  fontSize: 14,
  background: vars.color.white,
  color: vars.color.grey900,
  selectors: { '&:focus': { outline: 'none', borderColor: vars.color.blue500 } },
});

/**
 * 카드 오른쪽 회색 여백에 메모지를 붙일 만큼 화면이 넓을 때.
 * 여백 = 본문 패딩 40 + (화면 − 사이드바 240 − 본문 1080) ÷ 2 ≥ 메모지 200 + 간격 32
 */
const wideGutter = 'screen and (min-width: 1700px)';

// 모바일: 입력칸 아래로 쌓임 / 데스크톱: 입력칸 아래에 떠서 표 위에 / 넓은 화면: 카드 밖 회색 여백
export const notes = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 10,
  marginTop: 12,
  '@media': {
    [media.desktop]: {
      position: 'absolute',
      top: '100%',
      right: 0,
      width: 260,
      marginTop: 14,
    },
    [wideGutter]: {
      top: 0,
      right: 'auto',
      // 입력칸 오른쪽 끝 + 카드 안쪽 여백 24 + 간격 16
      left: 'calc(100% + 40px)',
      width: 200,
      marginTop: 0,
      alignItems: 'stretch',
    },
  },
});

export const note = style({
  position: 'relative',
  width: '100%',
  padding: '16px 28px 14px 14px',
  background: '#FFF4B0',
  borderRadius: 2,
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08), 0 8px 18px rgba(80, 60, 0, 0.16)',
  transformOrigin: 'top center',
  transition: 'transform 0.15s ease',
  selectors: { '&:hover': { transform: 'rotate(0deg) scale(1.02)', zIndex: 1 } },
});

export const notePin = style({
  position: 'absolute',
  top: -7,
  left: '50%',
  width: 46,
  height: 14,
  marginLeft: -23,
  background: 'rgba(255, 255, 255, 0.55)',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
});

export const noteText = style({
  fontSize: 13,
  lineHeight: 1.55,
  color: '#4A3F10',
  whiteSpace: 'pre-wrap',
  wordBreak: 'keep-all',
  overflowWrap: 'anywhere',
});

export const noteRemove = style({
  position: 'absolute',
  top: 4,
  right: 6,
  width: 22,
  height: 22,
  border: 0,
  borderRadius: 11,
  background: 'transparent',
  fontSize: 16,
  lineHeight: '22px',
  color: '#8A7A2A',
  cursor: 'pointer',
  selectors: { '&:hover': { background: 'rgba(0, 0, 0, 0.06)' } },
});

/* 일자별 표의 '메모' 칩 */
export const memoChipWrap = style({ position: 'relative', display: 'inline-block' });

export const memoChip = style({
  height: 26,
  padding: '0 10px',
  border: `1px solid #EEDB7A`,
  borderRadius: 13,
  background: '#FFF4B0',
  fontSize: 12,
  fontWeight: 700,
  color: '#6B5A10',
  cursor: 'pointer',
  selectors: { '&:hover': { background: '#FFEC8A' } },
});

export const memoPopover = style({
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  zIndex: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: 280,
  padding: '14px 14px 12px',
  background: '#FFF4B0',
  borderRadius: 2,
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08), 0 10px 24px rgba(80, 60, 0, 0.2)',
  textAlign: 'left',
  whiteSpace: 'normal',
  cursor: 'auto',
});

export const memoPopoverLine = style({
  fontSize: 13,
  lineHeight: 1.55,
  color: '#4A3F10',
  wordBreak: 'keep-all',
  overflowWrap: 'anywhere',
  selectors: {
    '& + &': { paddingTop: 8, borderTop: '1px dashed rgba(107, 90, 16, 0.25)' },
  },
});
