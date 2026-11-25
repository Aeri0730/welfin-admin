import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';
import { input as fieldInput } from './Field.css';

export const wrap = style({
  position: 'relative',
  width: '100%',
  minWidth: 0,
});

export const searchIcon = style({
  position: 'absolute',
  top: '50%',
  left: 14,
  transform: 'translateY(-50%)',
  display: 'inline-flex',
  color: vars.color.grey400,
  pointerEvents: 'none',
});

/** TextField 와 같은 모양, 왼쪽에 돋보기 자리만 비운다 */
export const input = style([
  fieldInput,
  {
    paddingLeft: 40,
    textOverflow: 'ellipsis',
  },
]);

/** 키보드·마우스로 가리키는 항목 */
export const active = style({ background: vars.color.grey50 });

export const empty = style({
  padding: '12px',
  fontSize: 14,
  color: vars.color.grey500,
  textAlign: 'center',
});

/** 표 안처럼 좁은 곳: 높이 36, 글자 14 */
export const compactInput = style({
  height: 36,
  paddingLeft: 34,
  paddingRight: 10,
  fontSize: 14,
  borderRadius: vars.radius.sm,
});

export const compactIcon = style({ left: 11 });

/** 목록은 칸보다 넓게 (제품명이 잘리지 않게) */
export const MIN_MENU_WIDTH = 260;
