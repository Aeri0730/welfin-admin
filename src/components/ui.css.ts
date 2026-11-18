import { keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { media, vars } from '@/styles/theme.css';

export const card = style({
  background: vars.color.white,
  borderRadius: vars.radius.xl,
  padding: 20,
  '@media': {
    [media.desktop]: { padding: 24 },
  },
});

export const cardTitle = style({
  fontSize: 17,
  fontWeight: 700,
  color: vars.color.grey900,
  marginBottom: 16,
});

export const badge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    height: 22,
    padding: '0 8px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  variants: {
    tone: {
      blue: { background: vars.color.blue50, color: vars.color.blue600 },
      red: { background: vars.color.red50, color: vars.color.red500 },
      green: { background: vars.color.green50, color: vars.color.green500 },
      orange: { background: vars.color.orange50, color: vars.color.orange500 },
      grey: { background: vars.color.grey100, color: vars.color.grey600 },
    },
  },
  defaultVariants: { tone: 'grey' },
});

export const pageHeader = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  marginBottom: 20,
  '@media': {
    [media.tablet]: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 28,
    },
  },
});

export const pageDescription = style({
  marginTop: 6,
  fontSize: 15,
  color: vars.color.grey600,
});

export const pageActions = style({
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
});

export const empty = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '48px 16px',
  textAlign: 'center',
  color: vars.color.grey500,
  fontSize: 15,
});

export const emptyTitle = style({
  fontSize: 17,
  fontWeight: 600,
  color: vars.color.grey700,
});

const shimmer = keyframes({
  '0%': { backgroundPosition: '-200% 0' },
  '100%': { backgroundPosition: '200% 0' },
});

export const skeleton = style({
  borderRadius: vars.radius.sm,
  background: `linear-gradient(90deg, ${vars.color.grey100} 25%, ${vars.color.grey200} 50%, ${vars.color.grey100} 75%)`,
  backgroundSize: '200% 100%',
  animation: `${shimmer} 1.4s ease infinite`,
});

export const errorBox = style({
  padding: '14px 16px',
  borderRadius: vars.radius.md,
  background: vars.color.red50,
  color: vars.color.red500,
  fontSize: 14,
  fontWeight: 500,
});
