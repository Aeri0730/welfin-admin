import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';

export const panel = style({
  gridColumn: '1 / -1',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 12,
  borderRadius: vars.radius.md,
  background: vars.color.grey50,
});

export const head = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: 13,
  color: vars.color.grey600,
});

export const box = style({
  position: 'relative',
  height: 420,
  borderRadius: vars.radius.md,
  overflow: 'hidden',
  background: vars.color.white,
});

export const embed = style({ position: 'absolute', inset: 0 });
