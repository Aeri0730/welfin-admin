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
  gridTemplateColumns: '1fr 1fr',
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
