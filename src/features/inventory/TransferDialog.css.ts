import { style } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

export const grid = style({
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  '@media': {
    [media.tablet]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  },
});

export const full = style({ gridColumn: '1 / -1' });
export const wide2 = style({
  gridColumn: '1 / -1',
  '@media': { [media.tablet]: { gridColumn: 'span 2' } },
});

export const groupTitle = style({
  gridColumn: '1 / -1',
  marginTop: 4,
  fontSize: 13,
  fontWeight: 700,
  color: vars.color.grey500,
});

export const pasteRow = style({ display: 'flex', flexDirection: 'column', gap: 8 });
export const pasteActions = style({ display: 'flex', justifyContent: 'flex-end', gap: 8 });

export const list = style({ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 });

export const entry = style({
  padding: 16,
  borderRadius: vars.radius.lg,
  background: vars.color.grey50,
});

export const entryHead = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
  fontSize: 15,
  fontWeight: 700,
  color: vars.color.grey900,
});

export const entryNo = style({ color: vars.color.blue500 });
export const spacer = style({ flex: 1 });
export const footer = style({ display: 'flex', alignItems: 'center', gap: 8, width: '100%' });
export const footNote = style({ fontSize: 13, color: vars.color.grey500 });

export const intro = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  fontSize: 14,
  color: vars.color.grey600,
});

export const lineButton = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '6px 0',
  border: 0,
  background: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  color: vars.color.grey500,
});
export const lineQty = style({ marginLeft: 'auto', fontSize: 14, fontWeight: 600, color: vars.color.grey700 });

export const problem = style({ marginTop: 8, fontSize: 13, fontWeight: 600, color: vars.color.red500 });
