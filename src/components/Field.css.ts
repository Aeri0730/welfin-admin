import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';

export const field = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minWidth: 0,
});

export const label = style({
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.grey600,
});

const controlBase = style({
  width: '100%',
  height: 48,
  padding: '0 14px',
  fontSize: 16,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.grey200}`,
  background: vars.color.grey50,
  color: vars.color.grey900,
  outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
  selectors: {
    '&::placeholder': { color: vars.color.grey400 },
    '&:hover:not(:disabled)': { borderColor: vars.color.grey300 },
    '&:focus': {
      borderColor: vars.color.blue500,
      background: vars.color.white,
      boxShadow: `0 0 0 3px ${vars.color.blue50}`,
    },
    '&:disabled': { color: vars.color.grey500, cursor: 'not-allowed' },
    '&[aria-invalid="true"]': { borderColor: vars.color.red500 },
  },
});

export const input = style([controlBase]);

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%238B95A1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export const select = style([
  controlBase,
  {
    appearance: 'none',
    paddingRight: 40,
    backgroundImage: chevron,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    cursor: 'pointer',
    textOverflow: 'ellipsis',
  },
]);

export const textarea = style([
  controlBase,
  {
    height: 'auto',
    minHeight: 80,
    padding: '12px 14px',
    resize: 'vertical',
    lineHeight: 1.5,
  },
]);

export const message = style({
  fontSize: 13,
  color: vars.color.grey500,
});

export const errorMessage = style({
  fontSize: 13,
  color: vars.color.red500,
});
