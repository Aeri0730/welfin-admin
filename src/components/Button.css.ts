import { keyframes, style } from '@vanilla-extract/css';
import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { vars } from '@/styles/theme.css';

export const button = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    transition: 'background-color 0.15s ease, transform 0.1s ease',
    selectors: {
      '&:active:not(:disabled)': { transform: 'scale(0.97)' },
      '&:disabled': { opacity: 0.38, cursor: 'not-allowed' },
      '&:focus-visible': { outline: `2px solid ${vars.color.blue400}`, outlineOffset: 2 },
    },
  },
  variants: {
    variant: {
      primary: {
        background: vars.color.blue500,
        color: vars.color.white,
        selectors: { '&:hover:not(:disabled)': { background: vars.color.blue600 } },
      },
      secondary: {
        background: vars.color.blue50,
        color: vars.color.blue600,
        selectors: { '&:hover:not(:disabled)': { background: vars.color.blue100 } },
      },
      weak: {
        background: vars.color.grey100,
        color: vars.color.grey700,
        selectors: { '&:hover:not(:disabled)': { background: vars.color.grey200 } },
      },
      danger: {
        background: vars.color.red50,
        color: vars.color.red500,
        selectors: { '&:hover:not(:disabled)': { background: '#FFE0E0' } },
      },
      ghost: {
        background: 'transparent',
        color: vars.color.grey600,
        selectors: { '&:hover:not(:disabled)': { background: vars.color.grey100 } },
      },
    },
    size: {
      sm: { height: 32, padding: '0 12px', fontSize: 13, borderRadius: vars.radius.sm },
      md: { height: 40, padding: '0 16px', fontSize: 15, borderRadius: 10 },
      lg: { height: 54, padding: '0 20px', fontSize: 17, borderRadius: 14 },
    },
    fullWidth: {
      true: { width: '100%' },
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export type ButtonVariants = NonNullable<RecipeVariants<typeof button>>;

const spin = keyframes({ to: { transform: 'rotate(360deg)' } });

export const spinner = style({
  width: '1.1em',
  height: '1.1em',
  borderRadius: '50%',
  border: '2px solid currentColor',
  borderRightColor: 'transparent',
  animation: `${spin} 0.7s linear infinite`,
});
