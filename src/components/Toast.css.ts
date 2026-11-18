import { keyframes, style } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

const slideUp = keyframes({
  from: { opacity: 0, transform: 'translate(-50%, 12px)' },
  to: { opacity: 1, transform: 'translate(-50%, 0)' },
});

export const toast = style({
  position: 'fixed',
  left: '50%',
  bottom: `calc(${vars.layout.tabBar} + 16px + env(safe-area-inset-bottom))`,
  zIndex: 100,
  maxWidth: 'calc(100vw - 32px)',
  padding: '14px 20px',
  borderRadius: 14,
  background: 'rgba(25, 31, 40, 0.92)',
  color: vars.color.white,
  fontSize: 15,
  fontWeight: 500,
  boxShadow: vars.shadow.toast,
  transform: 'translateX(-50%)',
  animation: `${slideUp} 0.2s ease`,
  '@media': {
    [media.desktop]: { bottom: 32 },
  },
});
