import { style } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

export const page = style({
  minHeight: '100dvh',
  display: 'flex',
  background: vars.color.white,
  '@media': {
    [media.tablet]: {
      alignItems: 'center',
      justifyContent: 'center',
      background: vars.color.background,
    },
  },
});

export const panel = style({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: '56px 24px calc(24px + env(safe-area-inset-bottom))',
  '@media': {
    [media.tablet]: {
      maxWidth: 440,
      padding: 40,
      borderRadius: 24,
      background: vars.color.white,
    },
  },
});

export const brand = style({
  fontSize: 15,
  fontWeight: 700,
  color: vars.color.blue500,
  marginBottom: 12,
});

export const title = style({
  fontSize: 26,
  lineHeight: 1.4,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  whiteSpace: 'pre-line',
  marginBottom: 40,
});

export const form = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
});

export const footer = style({
  marginTop: 'auto',
  paddingTop: 32,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

export const notice = style({
  fontSize: 13,
  textAlign: 'center',
  color: vars.color.grey500,
});
