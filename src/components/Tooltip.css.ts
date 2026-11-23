import { keyframes, style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';

const rise = keyframes({
  from: { opacity: 0, transform: 'translateY(-4px)' },
  to: { opacity: 1, transform: 'none' },
});

export const root = style({ position: 'relative', display: 'inline-flex' });

export const trigger = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 28,
  padding: '0 10px 0 8px',
  borderRadius: vars.radius.full,
  fontSize: 13,
  fontWeight: 600,
  background: '#0B1F4B',
  color: vars.color.white,
  transition: 'background 0.15s ease, color 0.15s ease',
  ':hover': { background: '#142C63' },
  ':focus-visible': { outline: 'none', boxShadow: `inset 0 0 0 2px ${vars.color.blue500}` },
  selectors: {
    '&[aria-expanded="true"]': { background: '#142C63' },
  },
});

export const bubble = style({
  position: 'absolute',
  top: 'calc(100% + 8px)',
  zIndex: 40,
  width: 'max-content',
  maxWidth: 'min(440px, calc(100vw - 32px))',
  padding: '16px 18px',
  borderRadius: vars.radius.lg,
  background: vars.color.grey800,
  color: vars.color.white,
  boxShadow: vars.shadow.toast,
  fontSize: 13,
  lineHeight: 1.6,
  textAlign: 'left',
  animation: `${rise} 0.15s ease`,
});

export const alignStart = style({ left: 0 });
export const alignEnd = style({ right: 0 });
