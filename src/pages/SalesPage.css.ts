import { style } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

export const dateBar = style({
  display: 'flex',
  alignItems: 'flex-end',
  gap: 8,
  flexWrap: 'wrap',
});

export const targetGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  '@media': {
    [media.desktop]: { gridTemplateColumns: 'repeat(4, 1fr)' },
  },
});

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
    [media.tablet]: { gridTemplateColumns: '120px 1fr 1fr', alignItems: 'end' },
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
    [media.desktop]: { gridTemplateColumns: '1fr 1fr' },
  },
});

export const cardHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  marginBottom: 12,
});

