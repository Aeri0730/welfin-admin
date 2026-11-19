import { style } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxWidth: 720,
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
  display: 'grid',
  gridTemplateColumns: '1fr 104px 40px',
  gap: 8,
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.grey600,
});

export const itemRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 104px 40px',
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
  gridTemplateColumns: '1fr 1fr',
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
