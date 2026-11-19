import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';

export const figure = style({ margin: 0 });

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 12,
});

export const title = style({ fontSize: 16, fontWeight: 700, color: vars.color.grey900 });

export const legend = style({ display: 'flex', gap: 12, fontSize: 13, color: vars.color.grey600 });

export const legendItem = style({ display: 'inline-flex', alignItems: 'center', gap: 6 });

export const legendDot = style({ width: 10, height: 10, borderRadius: 3 });

export const rows = style({ display: 'flex', flexDirection: 'column' });

export const row = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(96px, 34%) minmax(0, 1fr)',
  alignItems: 'center',
  gap: 12,
  padding: '8px 0',
  borderBottom: `1px solid ${vars.color.grey100}`,
  selectors: {
    '&:last-child': { borderBottom: 'none' },
    '&:hover': { background: vars.color.grey50 },
  },
});

export const label = style({
  fontSize: 13,
  color: vars.color.grey700,
  lineHeight: 1.35,
  wordBreak: 'keep-all',
});

export const bars = style({ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 });

export const barLine = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
  height: 14,
});

export const bar = style({
  flexShrink: 1,
  minWidth: 0,
  height: 10,
  borderRadius: '0 4px 4px 0',
});

export const value = style({
  flexShrink: 0,
  fontSize: 12,
  color: vars.color.grey600,
  fontVariantNumeric: 'tabular-nums',
});
