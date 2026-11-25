import { keyframes, style } from '@vanilla-extract/css';
import { media, vars } from '@/styles/theme.css';

export const shell = style({
  minHeight: '100dvh',
  '@media': {
    [media.desktop]: {
      display: 'grid',
      gridTemplateColumns: `${vars.layout.sidebar} minmax(0, 1fr)`,
    },
  },
});

/* ---------- 데스크톱 사이드바 ---------- */
export const sidebar = style({
  display: 'none',
  '@media': {
    [media.desktop]: {
      position: 'sticky',
      top: 0,
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 16px 20px',
      background: vars.color.white,
      borderRight: `1px solid ${vars.color.grey100}`,
    },
  },
});

export const logo = style({
  padding: '0 12px',
  marginBottom: 28,
  fontSize: 19,
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: vars.color.grey900,
});

export const logoAccent = style({ color: vars.color.blue500 });

export const navList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});

export const navLink = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  height: 44,
  padding: '0 12px',
  borderRadius: vars.radius.md,
  fontSize: 15,
  fontWeight: 600,
  color: vars.color.grey600,
  transition: 'background-color 0.15s ease, color 0.15s ease',
  selectors: {
    '&:hover': { background: vars.color.grey50, color: vars.color.grey800 },
    '&.active': { background: vars.color.blue50, color: vars.color.blue600 },
  },
});

export const subNav = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  margin: '2px 0 6px 32px',
  paddingLeft: 10,
  borderLeft: `2px solid ${vars.color.grey100}`,
});

export const subNavLink = style({
  display: 'flex',
  alignItems: 'center',
  height: 34,
  padding: '0 10px',
  borderRadius: vars.radius.sm,
  fontSize: 14,
  fontWeight: 600,
  color: vars.color.grey500,
  selectors: {
    '&:hover': { background: vars.color.grey50, color: vars.color.grey800 },
    '&.active': { color: vars.color.blue600, background: vars.color.blue50 },
  },
});

export const userBox = style({
  marginTop: 'auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '12px 4px 0 12px',
  borderTop: `1px solid ${vars.color.grey100}`,
});

export const userName = style({
  fontSize: 15,
  fontWeight: 600,
});

export const userRole = style({
  fontSize: 12,
  color: vars.color.grey500,
});

/* ---------- 모바일 상단바 ---------- */
export const topBar = style({
  position: 'sticky',
  top: 0,
  zIndex: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: 56,
  padding: '0 8px 0 20px',
  background: 'rgba(242, 244, 246, 0.9)',
  backdropFilter: 'saturate(180%) blur(12px)',
  '@media': {
    [media.desktop]: { display: 'none' },
  },
});

export const topBarTitle = style({
  fontSize: 17,
  fontWeight: 800,
  letterSpacing: '-0.02em',
});

/* ---------- 본문 ---------- */
export const main = style({
  width: '100%',
  maxWidth: vars.layout.content,
  margin: '0 auto',
  padding: `8px 16px calc(${vars.layout.tabBar} + 32px + env(safe-area-inset-bottom))`,
  '@media': {
    [media.tablet]: { padding: `16px 24px calc(${vars.layout.tabBar} + 40px)` },
    [media.desktop]: { padding: '40px 40px 64px' },
  },
});

/** 표가 넓은 페이지 (발주 신청) */
export const mainWide = style({ maxWidth: 1600 });

/* ---------- 모바일 하단 탭 ---------- */
export const tabBar = style({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 30,
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  height: `calc(${vars.layout.tabBar} + env(safe-area-inset-bottom))`,
  paddingBottom: 'env(safe-area-inset-bottom)',
  background: vars.color.white,
  borderTop: `1px solid ${vars.color.grey100}`,
  '@media': {
    [media.desktop]: { display: 'none' },
  },
});

export const tabItem = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  border: 'none',
  background: 'none',
  fontSize: 11,
  fontWeight: 600,
  color: vars.color.grey400,
  cursor: 'pointer',
  selectors: {
    '&.active': { color: vars.color.grey900 },
  },
});

/* ---------- 모바일 전체 메뉴 시트 ---------- */
const fadeIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
const sheetUp = keyframes({ from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } });

export const overlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: 40,
  background: vars.color.overlay,
  animation: `${fadeIn} 0.2s ease`,
});

export const sheet = style({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,
  padding: '12px 16px calc(20px + env(safe-area-inset-bottom))',
  borderRadius: '24px 24px 0 0',
  background: vars.color.white,
  boxShadow: vars.shadow.sheet,
  animation: `${sheetUp} 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)`,
});

export const sheetHandle = style({
  width: 36,
  height: 4,
  margin: '0 auto 16px',
  borderRadius: 2,
  background: vars.color.grey200,
});

export const sheetHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 4px 12px 12px',
});
