import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';

export const head = style({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 8,
  marginBottom: 12,
});

export const title = style({ fontSize: 17, fontWeight: 700, color: vars.color.grey900 });

export const vat = style({ fontSize: 12, color: vars.color.grey500 });

export const kind = style({
  padding: '12px 0',
  borderTop: `1px solid ${vars.color.grey100}`,
});

export const kindHead = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  marginBottom: 8,
  fontSize: 15,
  fontWeight: 700,
  color: vars.color.grey800,
});

export const kindAmount = style({
  fontSize: 14,
  fontWeight: 600,
  color: vars.color.grey700,
  fontVariantNumeric: 'tabular-nums',
});

export const inputs = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
});

export const totals = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginTop: 4,
  padding: '12px 14px',
  borderRadius: 12,
  background: vars.color.grey50,
});

export const totalLine = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  fontSize: 14,
  color: vars.color.grey600,
  fontVariantNumeric: 'tabular-nums',
});

export const totalStrong = style({
  fontSize: 17,
  fontWeight: 700,
  color: vars.color.grey900,
});

export const actions = style({ marginTop: 12 });
