import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';

export const summary = style({
  marginTop: 4,
  padding: '12px 14px',
  borderRadius: vars.radius.md,
  background: vars.color.grey50,
});

export const product = style({ fontSize: 15, fontWeight: 700, color: vars.color.grey900 });
export const meta = style({ marginTop: 2, fontSize: 13, color: vars.color.grey500 });

export const fields = style({ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 });

export const warn = style({ marginTop: 12, fontSize: 13, fontWeight: 600, color: vars.color.red500 });

export const footer = style({ display: 'flex', alignItems: 'center', gap: 8 });
export const spacer = style({ flex: 1 });
