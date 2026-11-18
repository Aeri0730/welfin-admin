import { globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css';

globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
  margin: 0,
  padding: 0,
});

globalStyle('html, body', {
  fontFamily: vars.font.body,
  backgroundColor: vars.color.background,
  color: vars.color.grey900,
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  WebkitTapHighlightColor: 'transparent',
  wordBreak: 'keep-all',
  fontFeatureSettings: '"tnum"',
});

globalStyle('button, input, select, textarea', {
  font: 'inherit',
  color: 'inherit',
});

globalStyle('a', {
  color: 'inherit',
  textDecoration: 'none',
});

globalStyle('ul, ol', {
  listStyle: 'none',
});
