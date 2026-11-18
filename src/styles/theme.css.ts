import { createGlobalTheme } from '@vanilla-extract/css';

/**
 * 디자인 토큰 — 토스 스타일의 담백한 블루 + 그레이 스케일.
 * 컴포넌트에서는 색상 값을 직접 쓰지 말고 항상 vars 를 통해 참조한다.
 */
export const vars = createGlobalTheme(':root', {
  color: {
    white: '#FFFFFF',
    background: '#F2F4F6',

    grey50: '#F9FAFB',
    grey100: '#F2F4F6',
    grey200: '#E5E8EB',
    grey300: '#D1D6DB',
    grey400: '#B0B8C1',
    grey500: '#8B95A1',
    grey600: '#6B7684',
    grey700: '#4E5968',
    grey800: '#333D4B',
    grey900: '#191F28',

    blue50: '#E8F3FF',
    blue100: '#C9E2FF',
    blue400: '#4593FC',
    blue500: '#3182F6',
    blue600: '#2272EB',

    red50: '#FFEEEE',
    red500: '#F04452',
    green50: '#F0FAF6',
    green500: '#03B26C',
    orange50: '#FFF3E0',
    orange500: '#FE9800',

    overlay: 'rgba(0, 23, 51, 0.35)',
  },
  font: {
    body: `'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`,
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  shadow: {
    sheet: '0 -4px 24px rgba(0, 0, 0, 0.08)',
    toast: '0 8px 24px rgba(0, 0, 0, 0.16)',
  },
  layout: {
    sidebar: '240px',
    content: '1080px',
    tabBar: '64px',
  },
});

export const media = {
  tablet: 'screen and (min-width: 768px)',
  desktop: 'screen and (min-width: 1024px)',
} as const;
