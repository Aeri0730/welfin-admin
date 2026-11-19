import { keyframes, style } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

const fadeIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
const popIn = keyframes({
  from: { opacity: 0, transform: 'translateY(12px) scale(0.98)' },
  to: { opacity: 1, transform: 'none' },
});

export const overlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  display: 'grid',
  placeItems: 'end center',
  padding: 0,
  background: vars.color.overlay,
  animation: `${fadeIn} 0.15s ease`,
  '@media': {
    [media.tablet]: { placeItems: 'center', padding: 24 },
  },
});

export const panel = style({
  width: '100%',
  maxHeight: '90dvh',
  overflowY: 'auto',
  padding: '24px 20px calc(20px + env(safe-area-inset-bottom))',
  borderRadius: '24px 24px 0 0',
  background: vars.color.white,
  animation: `${popIn} 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)`,
  '@media': {
    [media.tablet]: { maxWidth: 480, borderRadius: vars.radius.xl, padding: 28 },
  },
});

export const wide = style({
  '@media': {
    [media.tablet]: { maxWidth: 640 },
  },
});

export const title = style({
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: vars.color.grey900,
});

export const body = style({
  marginTop: 8,
  fontSize: 15,
  color: vars.color.grey700,
  lineHeight: 1.6,
});

export const footer = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 24,
});
