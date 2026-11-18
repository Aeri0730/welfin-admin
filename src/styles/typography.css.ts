import { style, styleVariants } from '@vanilla-extract/css';
import { media, vars } from './theme.css';

/** 토스식 타이포 스케일 (t1 가장 큼 → t7 가장 작음) */
export const typo = styleVariants({
  t1: { fontSize: 26, lineHeight: 1.4, fontWeight: 700, letterSpacing: '-0.02em' },
  t2: { fontSize: 22, lineHeight: 1.4, fontWeight: 700, letterSpacing: '-0.02em' },
  t3: { fontSize: 20, lineHeight: 1.45, fontWeight: 700, letterSpacing: '-0.01em' },
  t4: { fontSize: 17, lineHeight: 1.5, fontWeight: 600 },
  t5: { fontSize: 15, lineHeight: 1.5, fontWeight: 500 },
  t6: { fontSize: 14, lineHeight: 1.5, fontWeight: 500 },
  t7: { fontSize: 13, lineHeight: 1.5, fontWeight: 500 },
});

export const pageTitle = style([
  typo.t2,
  {
    '@media': {
      [media.desktop]: { fontSize: 26 },
    },
  },
]);

export const subtle = style({ color: vars.color.grey600 });
export const number = style({ fontVariantNumeric: 'tabular-nums' });
