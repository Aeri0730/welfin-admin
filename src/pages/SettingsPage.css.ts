import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  paddingBottom: 20,
  marginBottom: 8,
  borderBottom: `1px solid ${vars.color.grey100}`,
});

export const formGrid = style({
  display: 'grid',
  gap: 16,
});
