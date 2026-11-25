import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { signOut } from '@/api/auth';
import { useScheduledRefresh } from '@/api/queries';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { ToastViewport } from '@/components/Toast';
import { useProfile } from '@/features/auth/session';
import { cx } from '@/lib/cx';
import * as styles from './AppLayout.css';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** 사이드바에서 이 메뉴 아래에 펼쳐지는 하위 메뉴 (해당 경로에 있을 때만 보임) */
  children?: Array<{ to: string; label: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '홈', icon: 'home' },
  {
    to: '/stock',
    label: '재고',
    icon: 'box',
    children: [
      { to: '/stock', label: '재고현황' },
      { to: '/stock/storage', label: '보관비' },
      { to: '/stock/compare', label: '사이트 재고 비교' },
    ],
  },
  { to: '/sales', label: '매출', icon: 'chart' },
  {
    to: '/settlement',
    label: '정산',
    icon: 'wallet',
    children: [
      { to: '/settlement', label: '판매처 대금 수령' },
      { to: '/settlement/consign', label: '거래처 입금 일정' },
      { to: '/settlement/dispatch', label: '배차비' },
    ],
  },
  {
    to: '/inbound',
    label: '입고',
    icon: 'inbound',
    children: [
      { to: '/inbound', label: '입고 입력' },
      { to: '/inbound/status', label: '입고 현황' },
    ],
  },
  {
    to: '/outbound',
    label: '출고',
    icon: 'outbound',
    children: [
      { to: '/outbound', label: '출고 입력' },
      { to: '/outbound/status', label: '출고 현황' },
    ],
  },
  { to: '/returns', label: '회수', icon: 'return' },
  { to: '/transfer', label: '창고 이동', icon: 'transfer' },
  { to: '/orders', label: '발주 신청', icon: 'order' },
  { to: '/history', label: '입출고 내역', icon: 'list' },
  { to: '/settings', label: '기준 정보', icon: 'settings' },
];

/** 모바일 '전체' 메뉴: 하위 메뉴를 한 줄씩 펼쳐서 보여준다 */
const SHEET_ITEMS: NavItem[] = NAV_ITEMS.flatMap((item) =>
  item.children
    ? item.children.map((child) => ({ to: child.to, label: child.label === '재고현황' ? '재고 현황' : child.label, icon: item.icon }))
    : [item],
);

interface TabItem extends NavItem {
  /** 이 경로들에 있을 때도 탭을 활성으로 표시 */
  match?: string[];
}

/** 모바일 하단 탭에 바로 노출할 메뉴 (나머지는 '전체'에서) */
const TAB_ITEMS: TabItem[] = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/stock', label: '재고', icon: 'box' },
  { to: '/sales', label: '매출', icon: 'chart' },
  { to: '/returns', label: '회수', icon: 'return' },
];

export function AppLayout() {
  useScheduledRefresh();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    queryClient.clear();
  };

  const roleLabel = profile?.role === 'admin' ? '관리자' : '직원';

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className={styles.logo}>
          Welfin <span className={styles.logoAccent}>재고</span>
        </p>
        <nav className={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <div key={item.to}>
              <NavLink to={item.to} end={item.to === '/'} className={styles.navLink}>
                <Icon name={item.icon} size={20} />
                {item.label}
              </NavLink>
              {item.children && location.pathname.startsWith(item.to) && (
                <div className={styles.subNav}>
                  {item.children.map((child) => (
                    <NavLink key={child.to} to={child.to} end={child.to === item.to} className={styles.subNavLink}>
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className={styles.userBox}>
          <div>
            <p className={styles.userName}>{profile?.name ?? ''}</p>
            <p className={styles.userRole}>{profile ? roleLabel : ''}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="로그아웃">
            <Icon name="logout" size={18} />
          </Button>
        </div>
      </aside>

      <div>
        <header className={styles.topBar}>
          <span className={styles.topBarTitle}>Welfin 재고</span>
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      <nav className={styles.tabBar} aria-label="주요 메뉴">
        {TAB_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cx(styles.tabItem, (isActive || item.match?.includes(location.pathname)) && 'active')
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
        <button type="button" className={styles.tabItem} onClick={() => setMenuOpen(true)}>
          <Icon name="menu" />
          전체
        </button>
      </nav>

      {menuOpen && (
        <>
          <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="전체 메뉴">
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <div>
                <p className={styles.userName}>{profile?.name}</p>
                <p className={styles.userRole}>{roleLabel}</p>
              </div>
              <Button variant="weak" size="sm" onClick={handleSignOut}>
                로그아웃
              </Button>
            </div>
            <nav className={styles.navList}>
              {SHEET_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} end className={styles.navLink}>
                  <Icon name={item.icon} size={20} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </>
      )}

      <ToastViewport />
    </div>
  );
}
